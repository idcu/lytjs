// src/transform.ts
// AST 转换流水线 - 主入口
// 包含 transform、markConstants、hoistStatic、collectDynamicChildren
// optimize 阶段的逻辑已合并到此模块中

import { NodeTypes, ElementTypes } from './constants';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  CommentNode,
  TemplateChildNode,
  TransformContext,
  TransformOptions,
  NodeTransform,
  DirectiveTransform,
  ParentNode,
  JSChildNode,
  BaseNode,
  CompilerOptions,
  ExpressionNode,
} from './types';
import { createSimpleExpression, createCallExpression, createArrayExpression } from './ast';
import { transformPre } from './transforms/pre';
import {
  transformElement,
  transformIf,
  transformFor,
  transformOnce,
  transformSlot,
  transformBind,
  transformOn,
  transformModel,
  transformShow,
  transformScoped,
  transformVMemo,
  isJS,
} from './transforms';

// ============================================================
// 主转换函数
// ============================================================

export function transform(root: RootNode, options: TransformOptions = {}): void {
  const context = createTransformContext(root, options);
  traverseNode(root, context, options);

  // 将上下文数据复制到根节点
  root.helpers = Array.from(context.helpers.keys());
  root.components = Array.from(context.components);
  root.directives = Array.from(context.directives);
  root.hoists = context.hoists;
  root.temps = context.temps;
  root.cached = context.cached;
  // 把编译期收集到的局部标识符带给 codegen（用于标识符前缀化时排除）
  if (context.__locals && context.__locals.size > 0) {
    root.localIdentifiers = Array.from(context.__locals);
  }

  // 以下原为 optimize 阶段的逻辑，**必须在「构建根 codegenNode」之前**执行。
  //
  // ⚠️ 历史缺陷（2026-09-26 修复）：hoistStatic 的实现是「把 element.codegenNode
  // 重新赋值为 _hoisted_N 引用」。而单根场景下 `root.codegenNode = child.codegenNode`
  // 持有的是**旧对象的引用** ⇒ 若先构建 root.codegenNode 再提升，
  // 替换不会反映到产物里：render 里重新内联整棵静态子树，
  // 而模块级 `_hoisted_N` 声明成了**纯开销**（比不做提升更差）。
  // 实测修复前 `<div class="a"><span>hi</span></div>` 的 render 就重造了整棵树。
  markConstants(root);

  // ⚠️ 静态提升**只对 vnode 模式生效**：
  // signal / vapor 的产物是 DOM 操作，不消费 `_hoisted_N`；更要紧的是
  // codegen-signal.ts 会把 `element.codegenNode` 当作「属性/子内容携带者」读取
  // （`node.codegenNode.type === VNODE_CALL` 分支）—— 一旦被换成
  // SimpleExpression，该分支静默跳过，组件会退化成占位标签、静态属性丢失。
  // SSR 产物是字符串拼接，同样不消费 `_hoisted_N`，故一并排除。
  const { rendererMode, ssr } = options;
  const usesVNodeCodegen = !ssr && rendererMode !== 'signal' && rendererMode !== 'vapor';
  if (usesVNodeCodegen) {
    hoistStatic(root);
  }

  // 创建根代码生成节点
  if (root.children.length === 1) {
    const child = root.children[0];
    if (child) {
      if (child.type === NodeTypes.ELEMENT && (child as ElementNode).codegenNode) {
        root.codegenNode = (child as ElementNode).codegenNode as JSChildNode;
      } else if (child.type === NodeTypes.TEXT) {
        // FIX: P2-22 添加安全处理分支，将 TextNode 转换为表达式节点
        // TextNode 不是 JSChildNode，需要包装为 SimpleExpressionNode
        root.codegenNode = createSimpleExpression(
          JSON.stringify((child as TextNode).content),
          true,
          child.loc,
          true,
        );
      } else if (child.type === NodeTypes.INTERPOLATION) {
        root.codegenNode = createCallExpression(context.helper('TO_DISPLAY_STRING'), [
          (child as InterpolationNode).content,
        ]);
      } else if (isJS(child)) {
        root.codegenNode = child as JSChildNode;
      }
    }
  } else if (root.children.length > 1) {
    const elements = root.children.filter(
      (c) =>
        c.type === NodeTypes.ELEMENT ||
        c.type === NodeTypes.TEXT ||
        c.type === NodeTypes.INTERPOLATION,
    );
    if (elements.length > 0) {
      root.codegenNode = createCallExpression(context.helper('CREATE_VNODE'), [
        createSimpleExpression('Fragment', true),
        createSimpleExpression('null', true),
        createArrayExpression(elements as unknown as JSChildNode[]),
      ]);
    }
  }

  // patchFlag 由 transform-element.ts 在 transform 过程中统一设置
  collectDynamicChildren(root);
}

// ============================================================
// 向后兼容的 optimize 函数
// ============================================================

/**
 * 向后兼容的 optimize 函数。
 * 原 optimize 阶段的逻辑（markConstants、hoistStatic、collectDynamicChildren）
 * 已合并到 transform() 中，此函数保留仅为向后兼容。
 * 调用此函数是安全的（幂等操作），但推荐直接使用 transform()。
 */
export function optimize(root: RootNode, _options: CompilerOptions = {}): void {
  markConstants(root);
  hoistStatic(root);
  collectDynamicChildren(root);
}

// ============================================================
// 创建转换上下文
// ============================================================

function createTransformContext(root: RootNode, options: TransformOptions): TransformContext {
  const helpers = new Map<string, number>();
  const components = new Set<string>();
  const directives = new Set<string>();
  let currentNode: RootNode | TemplateChildNode | null = root;

  // 使用工厂函数避免自引用的 null 初始化。
  // 上下文对象通过延迟初始化器创建，接收自身
  // 消除对 `null as unknown as TransformContext` 的需求。
  // FIX: Phase 1 Vapor bug - 使用 contextRef 代替 context.self = context
  let contextRef: TransformContext | null = null;

  const context: TransformContext = {
    // FIX: P2-20 使用 getter 延迟访问，避免初始化时的循环引用问题
    // FIX: P2-43 添加防御性检查，避免 contextRef 未赋值时返回 undefined
    get self(): TransformContext {
      if (contextRef === null) {
        throw new Error(
          '[LytJS] TransformContext.self accessed before initialization' +
            '\n  Suggestion: This is an internal framework error. Please report this issue.',
        );
      }
      return contextRef;
    },
    parent: null,
    rootNode: root,
    helpers,
    components,
    directives,
    hoists: [],
    temps: 0,
    cached: 0,
    identifiers: new Set(),
    scopes: [{ vFor: 0, vOnce: 0 }],
    // ⚠️ 必须显式透传：本 context 是逐字段构造的（不是 `{...options}`），
    // 漏掉任何一个字段都会让对应 transform 静默失效 ——
    // scopeId 漏掉时，`transformScoped` 直接 return，scoped CSS 端到端失效。
    scopeId: options.scopeId ?? undefined,
    childIndex: 0,
    currentNode,
    helper<T extends string>(name: T): T {
      const count = helpers.get(name) ?? 0;
      helpers.set(name, count + 1);
      return name;
    },
    helperString(name: string): string {
      return name;
    },
    replaceNode(node: TemplateChildNode): void {
      if (!context.parent) return;
      const parent = context.parent;
      if (parent.type === NodeTypes.ROOT || parent.type === NodeTypes.ELEMENT) {
        const idx = parent.children.indexOf(context.currentNode as TemplateChildNode);
        if (idx !== -1) parent.children[idx] = node;
      }
      currentNode = node;
    },
    removeNode(node: TemplateChildNode | null): void {
      const target = node ?? context.currentNode;
      if (!target || !context.parent) return;
      const parent = context.parent;
      if (parent.type === NodeTypes.ROOT || parent.type === NodeTypes.ELEMENT) {
        const idx = parent.children.indexOf(target as TemplateChildNode);
        if (idx !== -1) parent.children.splice(idx, 1);
      }
    },
    onNodeRemoved(): void {},
    addIdentifiers(exp: ExpressionNode | string): void {
      const name =
        typeof exp === 'string'
          ? exp
          : exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic
            ? exp.content
            : undefined;
      if (!name) return;
      context.identifiers.add(name);
      // 同时计入"全量局部名"累加器：作用域退出后 identifiers 会被清空，
      // 而 codegen 阶段仍需要知道哪些名字属于局部变量（不能加 _ctx. 前缀）。
      context.__locals ??= new Set<string>();
      context.__locals.add(name);
    },
    removeIdentifiers(exp: ExpressionNode | string): void {
      if (typeof exp === 'string') context.identifiers.delete(exp);
      else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic)
        context.identifiers.delete(exp.content);
    },
    addHoist(node: JSChildNode): void {
      context.hoists.push(node);
    },
    addTemp(): number {
      return context.temps++;
    },
    addCache(_index: number): void {
      context.cached++;
    },
    error(msg: string, node?: BaseNode): void {
      const location = node?.loc?.start
        ? ` (at line ${node.loc.start.line}, column ${node.loc.start.column})`
        : '';
      const fullMsg = `[LytJS] ${msg}${location}`;

      // 优先调用 options.onError 回调，否则直接抛出错误
      if (options.onError) {
        options.onError(new Error(fullMsg));
      } else {
        throw new Error(fullMsg);
      }
    },
  };
  // FIX: P2-20 完成 context 创建后赋值给 contextRef
  contextRef = context;
  return context;
}

// ============================================================
// 遍历节点
// ============================================================

function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
  options: TransformOptions,
): void {
  context.currentNode = node;

  const nodeTransforms = options.nodeTransforms;
  const exitFns: Array<(() => void) | undefined> = [];

  if (nodeTransforms) {
    for (let i = 0; i < nodeTransforms.length; i++) {
      const transform = nodeTransforms[i];
      if (!transform) continue;
      const onExit = transform(
        node as RootNode | ElementNode | TextNode | InterpolationNode | CommentNode,
        context,
      );
      if (onExit) {
        if (Array.isArray(onExit)) exitFns.push(...onExit);
        else exitFns.push(onExit);
      }
      if (!context.currentNode) return;
    }
  }

  // ⚠️ 顺序很关键：必须**先遍历子节点、再执行 exit 回调**。
  // 此前是「先执行 exit、再遍历子节点」，导致父元素的 codegen 构建发生在子元素
  // 转换之前 —— 子元素的 codegenNode 尚不存在，于是
  // `<div><span/></div>` / `<div>{{msg}}</div>` 这类模板的 children 会被整片丢掉，
  // 编译产物只剩 `createElementVNode("div", null)`。
  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT: {
      const children = (node as RootNode | ElementNode).children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child) {
          context.parent = node as ParentNode;
          context.childIndex = i;
          traverseNode(child, context, options);
        }
      }
      break;
    }
  }

  // 子节点遍历完成后再执行 exit 回调（此时子节点 codegenNode 已就绪）
  for (let i = exitFns.length - 1; i >= 0; i--) {
    exitFns[i]?.();
    if (!context.currentNode) return;
  }
}

// ============================================================
// 默认转换
// ============================================================

// FIX: P2-21 调整类型定义，避免双重类型断言
// 使用类型兼容的函数签名，无需强制转换
type TransformFn = (
  node: Parameters<NodeTransform>[0],
  context: TransformContext,
) => ReturnType<NodeTransform>;

export const builtInTransforms: NodeTransform[] = [
  // v-pre 必须排在**所有** transform 之前：它在 enter 阶段就把子树插值还原为字面量文本
  transformPre as TransformFn,
  // <slot> 必须排在 transformElement 之前：其 exit 回调要在子节点转换完成后
  // 才设置 codegenNode，且 transformElement 会对 slot 出口提前返回。
  transformSlot as TransformFn,
  transformIf as TransformFn,
  transformFor as TransformFn,
  transformOnce as TransformFn,
  transformScoped as TransformFn,
  transformVMemo as TransformFn,
  transformElement as TransformFn,
];

export const builtInDirectiveTransforms: Record<string, DirectiveTransform> = {
  bind: transformBind,
  on: transformOn,
  model: transformModel,
  show: transformShow,
};

// 为向后兼容重新导出各个转换
export { transformElement, transformIf, transformFor, transformOnce, transformSlot };
export { transformScoped };
export { transformVMemo };
export { transformBind, transformOn, transformModel, transformShow };

// ============================================================
// Mark Constants (原 optimize.ts)
// ============================================================

function markConstants(root: RootNode): void {
  walk(root.children, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      // 元素是常量的条件：
      // 1. It has no directives
      // 2. All its attributes are static
      // 3. All its children are constant (including descendants)
      const hasDirectives = element.props.some((p) => p.type === NodeTypes.DIRECTIVE);
      const hasDynamicChild = hasDescendantDynamicContent(element);

      if (!hasDirectives && !hasDynamicChild) {
        element.isStatic = true;
      }
    } else if (node.type === NodeTypes.TEXT) {
      (node as TextNode).isStatic = true;
    }
  });
}

// ============================================================
// Hoist Static (原 optimize.ts)
// ============================================================

/**
 * 判断 codegen 节点子树中是否引用了 `_ctx.`（即含有运行期绑定）。
 *
 * 用途：静态提升必须排除这类节点 —— 提升后的语句运行在**模块作用域**，
 * 那里根本没有 `_ctx`。此前仅凭 `element.isStatic` 判断，导致
 * `<div><slot/></div>` 被提升成
 * `const _hoisted_1 = createElementVNode("div", null, renderSlot(_ctx.$slots, ...))`，
 * 模块加载阶段即抛 `_ctx is not defined`。
 */
function containsCtxReference(node: unknown, seen = new Set<unknown>()): boolean {
  if (node === null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);

  if (Array.isArray(node)) {
    return node.some((item) => containsCtxReference(item, seen));
  }

  const record = node as Record<string, unknown>;
  if (typeof record['content'] === 'string' && record['content'].includes('_ctx.')) return true;
  if (typeof record['tag'] === 'string' && record['tag'].includes('_ctx.')) return true;
  // ⚠️ 组件 vnode 不能靠上面的字符串匹配发现：
  // 它的 `_ctx.` 前缀是 **codegen 阶段**才加的（见 genVNodeCall 的
  // `node.isComponent` 分支），此刻 `node.tag` 仍是裸名 `"Child"`。
  // 若不显式用 isComponent 标记否决，含组件的子树会被提升到模块级常量，
  // 而模块级立即求值 `_ctx.Child` ⇒ `ReferenceError: _ctx is not defined`
  // （实测 `<div><Child /></div>` 正是如此：产物 `const _hoisted_1 =
  // createElementVNode("div", null, createElementVNode(_ctx.Child, null))`）。
  if (record['isComponent'] === true) return true;
  // 任何运行期调用（renderList / renderSlot / withMemo / 条件表达式…）都不能提升到模块作用域
  if (record['type'] === NodeTypes.JS_CALL_EXPRESSION) return true;
  if (record['type'] === NodeTypes.JS_CONDITIONAL_EXPRESSION) return true;

  for (const key of Object.keys(record)) {
    if (key === 'loc') continue;
    if (containsCtxReference(record[key], seen)) return true;
  }
  return false;
}

function hoistStatic(root: RootNode): void {
  const hoists: JSChildNode[] = [];
  const existingHoistsLen = root.hoists.length;

  // ⚠️ 提升一个节点后**必须停止下降**：父节点被整棵提升后，其静态子孙已包含在
  // 父的 codegenNode 里；若继续下降并对子孙再提升一次，会产出重复的模块级常量
  // （实测 `<div class="a"><span>hi</span></div>` 曾同时生成
  //   `_hoisted_1 = div(…, span(…))` 与 `_hoisted_2 = span(…)` 两份）。
  const visit = (nodes: TemplateChildNode[]): void => {
    for (const node of nodes) {
      if (node.type !== NodeTypes.ELEMENT) continue;
      const element = node as ElementNode;

      // 静态提升的三个必要条件：
      // 1) 元素本身被标记为静态；
      // 2) 其 codegen 子树不含 `_ctx.` 运行期引用；
      // 3) 尚未被提升过（hoistStatic 可能被 transform + optimize 各调一次，需幂等）
      if (
        element.isStatic &&
        element.codegenNode &&
        !isHoistedRef(element.codegenNode) &&
        !containsCtxReference(element.codegenNode)
      ) {
        // 提升静态元素
        hoists.push(element.codegenNode);
        // 全局索引 = 已有提升 + 当前新提升数量 - 1
        element.codegenNode = createHoistedReference(existingHoistsLen + hoists.length - 1);
        continue; // 已整棵提升，不再下降
      }

      visit(element.children);
    }
  };
  visit(root.children);

  root.hoists = [...root.hoists, ...hoists];
}

/**
 * 生成对已提升常量的**引用**（`_hoisted_N`）。
 *
 * ⚠️ 必须返回 SIMPLE_EXPRESSION，不能返回 VNODE_CALL：
 * 此前返回 `{ type: VNODE_CALL, tag: '_hoisted_1' }`，codegen 会把它当作
 * 「元素标签」再包一层 —— 产物是 `createElementVNode(_hoisted_1, null)`，
 * 即把一个 **VNode 当作标签名**传入，运行时不可能正确。
 * 正确产物应是直接 `return _hoisted_1`（SIMPLE_EXPRESSION 走 genExpression，
 * isStatic=true ⇒ 不加 `_ctx.` 前缀、不额外包裹）。
 */
function createHoistedReference(index: number) {
  return createSimpleExpression(`_hoisted_${index + 1}`, true);
}

/** 判断某 codegenNode 是否已是 `_hoisted_N` 引用（用于 hoistStatic 的幂等防御） */
function isHoistedRef(node: unknown): boolean {
  const n = node as { type?: unknown; content?: unknown } | undefined;
  if (!n || n.type !== NodeTypes.SIMPLE_EXPRESSION) return false;
  return typeof n.content === 'string' && /^_hoisted_\d+$/.test(n.content);
}

// ============================================================
// Collect Dynamic Children - Block Tree (原 optimize.ts)
// ============================================================

function collectDynamicChildren(root: RootNode): void {
  // 查找根元素并收集其动态 children
  for (const child of root.children) {
    if (child.type === NodeTypes.ELEMENT) {
      const element = child as ElementNode;
      if (!element.isStatic) {
        element.dynamicChildren = [];

        collectDynamicChildrenFromElement(element);
      }
    }
  }
}

/**
 * 递归收集动态子节点，构建 Block Tree。
 *
 * 对于每个非静态的子元素节点，将其 codegenNode 加入父元素的 dynamicChildren，
 * 并递归地为该子元素自身建立 dynamicChildren（如果它也有动态后代）。
 * 这确保了嵌套结构（如嵌套 v-for、深层动态子树）中的每一层 Block
 * 都能正确追踪其直接动态子节点，避免深层更新时退化为完整 diff。
 */
function collectDynamicChildrenFromElement(element: ElementNode): void {
  // 先过滤掉已移除的节点（null/undefined），再进行操作
  const validChildren = element.children.filter(
    (child): child is TemplateChildNode => child != null,
  );
  for (const child of validChildren) {
    if (child.type === NodeTypes.ELEMENT) {
      const childElement = child as ElementNode;

      if (!childElement.isStatic) {
        if (childElement.codegenNode) {
          if (element.dynamicChildren) {
            element.dynamicChildren.push(childElement.codegenNode);
          }
        }
        // 递归收集：为子元素自身也建立 dynamicChildren，
        // 确保嵌套动态节点（如嵌套 v-for）的 Block Tree 完整。
        // 使用合并而非覆盖，保留已有的 dynamicChildren
        const existing = childElement.dynamicChildren;
        childElement.dynamicChildren = existing ? [...existing] : [];
        collectDynamicChildrenFromElement(childElement);
      }
    }
  }
}

// ============================================================
// Walk helper (原 optimize.ts)
// ============================================================

function walk(nodes: TemplateChildNode[], fn: (node: TemplateChildNode) => void): void {
  for (const node of nodes) {
    fn(node);

    if (node.type === NodeTypes.ELEMENT) {
      walk((node as ElementNode).children, fn);
    }
  }
}

/**
 * 后代是否存在**动态内容**（插值 / 指令 / 组件）。
 *
 * ⚠️ 此前只检查插值，**漏了后代元素自身的指令**（如 `<span :title="t">`）——
 * 于是 `<div><span :title="t">x</span></div>` 的 `div` 被误判为静态，
 * 进而被提升成模块级常量，其体内却引用 `_ctx.t` ⇒ 运行时抛 `_ctx is not defined`。
 *
 * ⚠️ 2026-09-26 再补：**后代是组件**同样是动态的 —— 组件标签在 codegen 阶段
 * 会被前缀化为 `_ctx.Child`（裸名不含 `_ctx.`，字符串匹配发现不了），
 * 误判静态同样会导致模块级 `_ctx is not defined`。
 */
function hasDescendantDynamicContent(element: ElementNode): boolean {
  for (const child of element.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      return true;
    }
    if (child.type === NodeTypes.ELEMENT) {
      const childElement = child as ElementNode;
      // 后代是**组件**（标签会在 codegen 时解析为 `_ctx.Xxx`）
      // 注意：ElementNode 类型上没有 isComponent 字段，组件性由 tagType 承载
      // （ElementTypes.COMPONENT = 1）。
      if (childElement.tagType === ElementTypes.COMPONENT) {
        return true;
      }
      // 后代元素自身的动态绑定（`:prop` / `@event` / `v-if` / `v-for` …）
      if (childElement.props.some((p) => p.type === NodeTypes.DIRECTIVE)) {
        return true;
      }
      if (hasDescendantDynamicContent(childElement)) {
        return true;
      }
    }
  }
  return false;
}
