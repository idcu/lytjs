// src/codegen-signal.ts
// Signal 模式代码生成器 - 生成 effect() + DOM 操作代码

import { NodeTypes, ElementTypes } from './constants';
import {
  BASE_EMIT_PROFILE,
  genVarName,
  getExpContent,
  isDirectTextElement,
  isStaticPropValue,
  componentRef as componentRefShared,
  componentRefExpr,
  readInterpolationExpr,
  containsElementVNode,
  containsConditionalNode,
  normalizeVNodeChildren,
  emitListItemProps as emitListItemPropsShared,
  emitListItemNode as emitListItemNodeShared,
  buildItemComponentPropsShared,
  buildStaticHtml as buildStaticHtmlShared,
  serializeStaticHtml as serializeStaticHtmlShared,
  serializeBranchHtml as serializeBranchHtmlShared,
  buildConditionalAnchorOp,
  buildFragmentMountCreate,
  buildFragmentMountUpdate,
  getStaticAttr,
  getStaticClass,
  createSimpleExpressionFor,
  getTestExpr,
  validateAttributeName,
  validateArgContent,
  validateEventName,
  validateComponentName,
  validateIslandDirective,
  buildComponentSlotsObjectShared,
  collectSlotVNodesShared,
  serializeConditionalVNodeShared,
  serializeListVNodeShared,
  serializeVNodeCallChildShared,
  serializeVNodeCallChildrenShared,
  serializeVNodeCallShared,
  serializeVNodeElementShared,
  buildComponentPropsObjectShared,
  processVNodeCallPropsShared,
} from './codegen-signal-shared';
import { getMemoMeta } from './transforms/v-memo';
import { getVShowStyleTest } from './transforms/helpers';
import { prefixIdentifiers } from './prefix-identifiers';
import { FRAGMENT_SENTINEL } from './transforms/transform-element';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSConditionalExpression,
  JSObjectExpression,
  JSProperty,
  TemplateChildNode,
  CodegenResult,
  CompilerOptions,
} from './types';

// ============================================================
// Signal 代码生成选项
// ============================================================

export interface SignalCodegenOptions {
  mode: 'signal';
  isComponent?: boolean;
  ident?: number;
}

// ============================================================
// Helper: 生成元素变量名
// ============================================================

// ============================================================
// 产物运行时导入（按实际引用裁剪）
// ============================================================

/** 运行时包 → 该包负责的 helper；用于按实际引用裁剪 import */
const RUNTIME_IMPORT_GROUPS: Array<{ module: string; names: readonly string[] }> = [
  { module: '@lytjs/reactivity', names: ['effect'] },
  {
    module: '@lytjs/dom-runtime',
    names: [
      'reconcileArray',
      'createTemplate',
      'setText',
      'setHTML',
      'setAttribute',
      'setProperty',
      'setStyle',
      'setClass',
      'insert',
      'remove',
      'createEventHandler',
      'onCleanup',
      'runCleanups',
      'claimTextSlots',
    ],
  },
  { module: '@lytjs/renderer', names: ['mountComponent', 'mountSlotOutlet', 'mountVNode'] },
  { module: '@lytjs/vdom', names: ['createVNode', 'Text', 'Fragment', 'Teleport', 'Suspense'] },
];

/**
 * 字符串字面量片段（含模板串）。扫描/替换时整段跳过，
 * 避免把静态 HTML 里的 `insert` / `remove` 等页面文本当成运行时调用改坏。
 */
const STRING_LITERAL_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/;

/** 匹配「代码位置上的 helper 名」：字符串字面量优先整体吃掉，成员访问（`_ctx.x`）排除 */
const helperMatcher = (names: string): RegExp =>
  new RegExp(`${STRING_LITERAL_RE.source}|(?<![\\w$.])(${names})\\b`, 'g');

/**
 * 收集产物实际用到的 helper：文本反查 ∪ AST 判据。
 *
 * DOM / 响应式 helper 以产物文本为准（旧实现无脑带 15 个导入，多数模板用不到）；
 * renderer / vdom / 内置组件以 AST 判据为准，避免漏引入。
 *
 * ⚠️ 只做「是否出现过」的判定，**不改写产物文本**（B01b 短别名已回退，
 * 详见 keel/pitfalls/core/signal-param-alias-contract.md）。
 */
function collectProductHelpers(code: string, seeds: Set<string>): Set<string> {
  const used = new Set<string>(seeds);
  const re = helperMatcher(RUNTIME_IMPORT_GROUPS.flatMap((g) => g.names).join('|'));
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const name = match[1];
    if (name) used.add(name);
  }
  return used;
}

/** 生成产物前缀：按实际引用裁剪的 import（产物保持全名，便于调试） */
function emitProductPrefix(used: Set<string>, builtinComponents: Set<string>): string {
  const lines: string[] = [];
  for (const group of RUNTIME_IMPORT_GROUPS) {
    const specs = group.names.filter((name) => used.has(name));
    if (specs.length > 0) lines.push(`import{${specs.join(',')}}from'${group.module}';`);
  }
  if (builtinComponents.size > 0) {
    lines.push(`import{${[...builtinComponents].join(',')}}from'@lytjs/component';`);
  }
  return lines.join('\n');
}

// ============================================================
// Helper: 生成静态 HTML 模板
// ============================================================

/**
 * 将静态元素子树序列化为 HTML 字符串，用于 createTemplate
 * 同时收集所有元素节点的变量名和标签名映射
 * 注意：只序列化静态属性（ATTRIBUTE），跳过指令（DIRECTIVE）
 *
 * `allowDirectText`：仅主静态树开启（分支子树仍保留槽位注释，走 claimTextSlots）。
 */
function serializeStaticHTML(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  staticVars?: Map<ElementNode, string>,
  allowDirectText = false,
): string {
  return serializeStaticHtmlShared(
    node,
    (el, tag, isComponent) => {
      // 变量名不能含连字符（`genVarName('lyt-comp')` 会产出 `_lyt-comp` 这种非法标识符）
      const varName = isComponent ? genVarName('lytComp', varCounter) : genVarName(tag, varCounter);
      elementVars.push({ varName, tag });
      if (!isComponent) staticVars?.set(el, varName);
      return varName;
    },
    allowDirectText,
  );
}

// ============================================================
// 主生成函数
// ============================================================

export function generateSignal(ast: RootNode, _options?: CompilerOptions): CodegenResult {
  const profile = BASE_EMIT_PROFILE;
  const lines: string[] = [];
  const varCounter = new Map<string, number>();
  const elementVars: Array<{ varName: string; tag: string }> = [];
  const consumedCount = new Map<string, number>();
  // 静态元素节点 → 变量名：用于给 v-if 分支找「下一个静态兄弟节点」作为插入锚点
  const staticVars = new Map<ElementNode, string>();

  // 跟踪哪些元素有动态绑定
  const dynamicBindings: Array<{ varName: string; code: string }> = [];

  // ---- Phase 0: 检查根节点数量 ----
  // FIX: P1-L3 模板根节点多个元素未报错 - 在编译时检测并报错
  const rootElementCount = ast.children.filter(
    (child) => child.type === NodeTypes.ELEMENT || child.type === NodeTypes.VNODE_CALL,
  ).length;
  if (rootElementCount > 1) {
    throw new Error(
      `[lytjs/compiler] Template has multiple root elements (${rootElementCount}). ` +
        `Signal mode requires a single root element. ` +
        `Wrap your template content in a single parent element, e.g., <div>...</div>.`,
    );
  }

  // 是否含组件（决定要不要引入 mountComponent）
  const usedComponents = containsComponent(ast.children);
  // 列表项为组件时也要引入 mountComponent：此阶段 v-for 已被 transform 成 JS 调用，
  // 故用「走 arguments 的预扫」判定（判据与列表分支一致）
  const usedListComponent = containsComponentVNode(ast.children);
  // 是否存在「带子内容的组件」（决定要不要引入 createVNode/Text 做插槽）
  const usedSlots = hasComponentWithChildren(ast.children);
  // 含 `<slot/>` 出口（决定要不要引入运行期挂载能力）
  const usedSlotOutlet = containsSlotOutlet(ast.children);
  // 用到的内置组件（决定要不要从 @lytjs/component 引入）
  const builtinComponents = collectBuiltinComponents(ast.children);

  // ---- Phase 1: import 种子（真实 import 在产物拼装阶段按引用裁剪，见 emitProductPrefix） ----
  // 旧实现固定带 15 个 dom-runtime 导入（多数模板根本用不到）；这里只记录 AST 判据要求的
  // 额外引入，DOM / 响应式 helper 由产物文本反查。
  const importSeeds = new Set<string>();
  // 用到组件挂载时才引入（@lytjs/renderer 提供运行时实现）
  if (usedComponents || usedListComponent) {
    importSeeds.add('mountComponent');
  }
  // 组件带子内容（插槽）或含 Teleport 时才需要 vnode 构造能力；
  // 列表项为组件且带插槽内容时（VNODE_CALL 形态）也需引入
  if (
    usedSlots ||
    containsTeleportOutlet(ast.children) ||
    hasListComponentVNodeWithChildren(ast.children)
  ) {
    importSeeds.add('createVNode');
    importSeeds.add('Text');
  }
  // 含 `<slot/>` 出口时才需要运行期挂载能力
  if (usedSlotOutlet) {
    importSeeds.add('mountSlotOutlet');
  }
  // `<Teleport>` / `<Suspense>` 走 vnode 路径：需运行期挂载原语 + vdom 侧符号
  // （`createVNode` / `Text` 由上面的分支负责，避免重复声明）
  if (containsTag(ast.children, 'Teleport') || containsTag(ast.children, 'Suspense')) {
    importSeeds.add('mountVNode');
    for (const sym of ['Teleport', 'Suspense']) {
      if (containsTag(ast.children, sym)) importSeeds.add(sym);
    }
  }

  // 先通过 buildStaticHTML 收集所有元素变量（使用 varCounter）
  const staticHTML = buildStaticHTML(ast.children, varCounter, elementVars, staticVars);

  // ---- Phase 3: Process AST children for dynamic bindings ----
  // 此时 varCounter 已被 buildStaticHTML 初始化，processElement 不再重复分配变量名
  processChildren(
    ast.children,
    varCounter,
    elementVars,
    dynamicBindings,
    consumedCount,
    false,
    new Set(),
    staticVars,
  );

  // ---- Phase 4: Generate render function ----
  lines.push(`export function render(${profile.ctxParam}, ${profile.containerParam}) {`);

  // 根级纯文本 / 插值（`{{msg}}`、`Hello {{name}}`）没有任何元素 ⇒ 旧实现整段丢弃，
  // 页面静默空白（P0-3 的一个具体形态）。这里按每个文本段各建一个文本节点。
  const rootTextNodes: string[] = [];
  if (elementVars.length === 0) {
    let textIdx = 0;
    for (const child of ast.children) {
      if (child.type === NodeTypes.TEXT) {
        const varName = `_rootText${textIdx++}`;
        lines.push(
          `  const ${varName} = document.createTextNode(${JSON.stringify((child as TextNode).content)});`,
        );
        lines.push(`  insert(${varName}, ${profile.containerParam});`);
        rootTextNodes.push(varName);
      } else if (child.type === NodeTypes.INTERPOLATION) {
        const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
        if (!exp) continue;
        validateExpression(exp, 'interpolation');
        const varName = `_rootText${textIdx++}`;
        lines.push(`  const ${varName} = document.createTextNode("");`);
        lines.push(`  insert(${varName}, ${profile.containerParam});`);
        dynamicBindings.push({
          varName: profile.containerParam,
          code: `effect(() => setText(${varName}, ${prefixIdentifiers(exp, new Set())}));`,
        });
        rootTextNodes.push(varName);
      }
    }
  }

  // 生成 createTemplate 调用
  if (elementVars.length > 0) {
    // 找到根元素变量名
    const rootVar = elementVars[0]!.varName;
    lines.push(`  const ${rootVar} = createTemplate(${JSON.stringify(staticHTML)});`);

    // 解构子元素
    if (elementVars.length > 1) {
      const childVars = elementVars.slice(1).map((v) => v.varName);
      // createTemplate 返回的 **TemplateWrapper** 是静态 HTML 的唯一持有者。浏览器下它会
      // 把 `querySelectorAll` 直接代理到真实根元素（非浏览器 mock 走 `children` 兜底），
      // 因此这里直接复用包装器查找后代，**不再额外 getRealNode() 取中间量**（B01b 体积手法）。
      // 注意：`.children` 只有 1 项（真实根元素），不能用来解构后代；元素变量覆盖全部后代（先序）。
      lines.push(
        `  const [${childVars.join(', ')}] = Array.from(${rootVar}.querySelectorAll ? ${rootVar}.querySelectorAll('*') : ${rootVar}.children || []);`,
      );
    }

    lines.push(`  insert(${rootVar}, ${profile.containerParam});`);
    lines.push('');
  }

  // 生成动态绑定
  for (const binding of dynamicBindings) {
    lines.push(`  ${binding.code}`);
  }

  // 生成 cleanup
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    lines.push('');
    lines.push(`  onCleanup(() => ${rootVar}.remove());`);
  } else if (rootTextNodes.length > 0) {
    lines.push('');
    lines.push(`  onCleanup(() => { ${rootTextNodes.map((n) => `${n}.remove();`).join(' ')} });`);
  }

  lines.push('  return () => { runCleanups(); };');
  lines.push('}');

  const rawBody = lines.join('\n');
  const usedHelpers = collectProductHelpers(rawBody, importSeeds);
  return {
    code: `${emitProductPrefix(usedHelpers, builtinComponents)}\n\n${rawBody}`,
    preamble: '',
    ast,
  };
}

// ============================================================
// 从 children 构建静态 HTML
// ============================================================

function buildStaticHTML(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  staticVars: Map<ElementNode, string>,
): string {
  return buildStaticHtmlShared(children, (node, tag, isComponent) => {
    const varName = isComponent ? genVarName('lytComp', varCounter) : genVarName(tag, varCounter);
    elementVars.push({ varName, tag });
    if (!isComponent) staticVars.set(node, varName);
    return varName;
  });
}

// ============================================================
// 处理 children 节点
// ============================================================

function processChildren(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  inheritedOnce = false,
  locals: ReadonlySet<string> = new Set(),
  staticVars?: Map<ElementNode, string>,
  inheritedMemo?: string,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        inheritedOnce,
        locals,
        staticVars,
        inheritedMemo,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
        locals,
        undefined,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        new Set(),
      );
    }
    // 根级别的 TextNode、CommentNode、InterpolationNode 已处理
    // by the static HTML generation
  }
}

// ============================================================
// 处理元素节点
// ============================================================

/**
 * **内置组件**：由 codegen 直接从 `@lytjs/component` 导入，使用方无需手动注册
 * （与 Vue 一致）。2026-09-30 前一律按 `_ctx.<Name>` 解析 ⇒ 不注册就渲染为空。
 */
const BUILTIN_COMPONENT_NAMES: ReadonlySet<string> = new Set([
  'Transition',
  'TransitionGroup',
  'KeepAlive',
]);

/** 收集模板中实际用到的内置组件名。 */
function collectBuiltinComponents(children: unknown, acc = new Set<string>()): Set<string> {
  if (!Array.isArray(children)) return acc;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag && BUILTIN_COMPONENT_NAMES.has(node.tag)) {
      acc.add(node.tag);
    }
    collectBuiltinComponents(node.children, acc);
  }
  return acc;
}

/** 组件引用（本发射器上下文前缀取自 `BASE_EMIT_PROFILE`）。 */
function componentRef(tag: string): string {
  return componentRefShared(tag, BASE_EMIT_PROFILE.ctxParam);
}

/** 模板中是否含指定标签（用于按需引符号）。 */
function containsTag(children: unknown, tag: string): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag === tag) return true;
    if (containsTag(node.children, tag)) return true;
  }
  return false;
}

/** 模板中是否含 `<Teleport>` 出口（决定要不要走 vnode 路径 + 引入相关符号）。 */
function containsTeleportOutlet(children: unknown): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && (node.tag === 'Teleport' || node.tag === 'Suspense')) {
      return true;
    }
    if (containsTeleportOutlet(node.children)) return true;
  }
  return false;
}

/** 模板中是否含 `<slot/>` 出口（决定要不要引入 `mountSlot`）。 */
function containsSlotOutlet(children: unknown): boolean {
  if (!Array.isArray(children)) return false;
  for (const child of children) {
    const node = child as { type?: number; tag?: string; children?: unknown } | null;
    if (!node || typeof node !== 'object') continue;
    if (node.type === NodeTypes.ELEMENT && node.tag === 'slot') return true;
    if (containsSlotOutlet(node.children)) return true;
  }
  return false;
}

function processElement(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  inheritedOnce = false,
  locals: ReadonlySet<string> = new Set(),
  staticVars?: Map<ElementNode, string>,
  inheritedMemo?: string,
): void {
  // v-once：沿元素树向下传递（整个子树都只渲染一次）
  const onceMode = inheritedOnce || node.__isOnce === true;

  // v-memo（B01b 移植）：transformVMemo 已把指令从 props 摘掉，只留元数据。
  // 有自己 v-memo 的元素把「本元素 + 后代」的绑定统一包进依赖守卫；
  // 仅继承祖先 memo 的后代**不再重复包**（否则守卫会嵌套，父依赖变化时
  // 反复新建内层 effect）。v-once 优先级更高（与优化版一致）。
  const memoMeta = getMemoMeta(node);
  const memoDeps =
    memoMeta && memoMeta.deps ? prefixIdentifiers(memoMeta.deps, new Set()) : inheritedMemo;
  const memoMode = !onceMode && !!memoMeta?.deps;
  // 记录本次调用前的长度，末尾统一把"新增绑定"去掉 effect 包裹
  const bindingStart = dynamicBindings.length;

  // `<Teleport>` / `<Suspense>`：产出对应 **vnode** 交给 vdom 的 patch（与优化版一致）
  if (node.tag === 'Teleport' || node.tag === 'Suspense') {
    const vpTag = node.tag;
    const vpEntry = findExistingVar(elementVars, 'lyt-comp', consumedCount);
    const vpHost = vpEntry ?? genVarName('lytComp', varCounter);
    if (!vpEntry) elementVars.push({ varName: vpHost, tag: 'lyt-comp' });

    const vpChildren = collectSlotVNodes(node.children, BASE_EMIT_PROFILE.ctxPrefix);
    dynamicBindings.push({
      varName: vpHost,
      code: `mountVNode(createVNode(${vpTag},${buildComponentPropsObject(node, locals)},[${vpChildren.join(',')}]),${vpHost});`,
    });
    return;
  }

  // 组件：生成 mountComponent(_ctx.Tag, props, 占位元素)
  if (node.tagType === ElementTypes.COMPONENT) {
    const hostEntry = findExistingVar(elementVars, 'lyt-comp', consumedCount);
    const hostVar = hostEntry ?? genVarName('lytComp', varCounter);
    if (!hostEntry) elementVars.push({ varName: hostVar, tag: 'lyt-comp' });

    // 子内容 → 默认插槽。signal 产物本身是 DOM 操作，但 slot 契约要求返回 vnode
    // （normalizeSlotValue 会校验 `__v_isVNode`），故这里生成 vnode 构造代码。
    const slotsObj = buildComponentSlotsObject(node, BASE_EMIT_PROFILE.ctxPrefix);
    const slotsArg = slotsObj ? `,${slotsObj}` : '';

    dynamicBindings.push({
      varName: hostVar,
      code: `mountComponent(${
        BUILTIN_COMPONENT_NAMES.has(node.tag) ? node.tag : componentRef(node.tag)
      },${buildComponentPropsObject(node, locals)},${hostVar}${slotsArg});`,
    });
    return;
  }

  // `<slot/>` 出口：由运行期 `mountSlotOutlet` 把传入的插槽内容**就地**挂载进该元素。
  // 与 `mountSlot`（挂进容器、保留 `<slot>` 包装）不同：出口元素会被替换成注释锚点，
  // 插槽内容直接落在模板原位置（mx06 实测：字面量 `<slot>` 元素残留）。
  if (node.tag === 'slot') {
    const slotName = getStaticAttr(node, 'name') ?? 'default';
    const slotVar =
      findExistingVar(elementVars, 'slot', consumedCount) ?? genVarName('slotEl', varCounter);
    dynamicBindings.push({
      varName: slotVar,
      code: `mountSlotOutlet(${BASE_EMIT_PROFILE.ctxParam}.$slots&&${BASE_EMIT_PROFILE.ctxParam}.$slots[${JSON.stringify(slotName)}],${slotVar});`,
    });
    return;
  }

  // 查找已由 buildStaticHTML 分配的变量名
  // 使用 elementVars 中已有的条目来获取变量名，而不是重新生成
  const existingEntry = findExistingVar(elementVars, node.tag, consumedCount);
  const varName = existingEntry ?? genVarName(node.tag, varCounter);

  if (!existingEntry) {
    elementVars.push({ varName, tag: node.tag });
  }

  // 处理 props（指令）- 直接从 ElementNode.props 中查找
  for (let i = 0; i < node.props.length; i++) {
    const prop = node.props[i];
    if (!prop) continue;
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      // v-text 和 v-html 在解析器中不解析 exp（解析器只对特定指令名解析 = 后面的值）
      // 解析器会将 ="value" 解析为独立的 AttributeNode { name: '="value"', value: undefined }
      // 所以需要从后续属性中提取值
      if ((dir.name === 'text' || dir.name === 'html') && !dir.exp) {
        for (let j = i + 1; j < node.props.length; j++) {
          const nextProp = node.props[j]!;
          if (nextProp.type === NodeTypes.ATTRIBUTE) {
            // 匹配 ="value" 格式的属性名
            const eqMatch = nextProp.name.match(/^="(.*)"$/);
            if (eqMatch) {
              dir.exp = createSimpleExpressionFor(eqMatch[1]!, dir.loc);
              break;
            }
          }
        }
      }
      processDirective(dir, varName, node.tag, dynamicBindings, locals, getStaticClass(node));
    }
  }

  // 处理 codegenNode 中的属性（transform 阶段将 v-text/v-html 转换为 textContent/innerHTML 属性）
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallProps(vnode, varName, dynamicBindings, locals);
  }

  // 处理子节点中的动态内容
  // 插值：**每个插值写入各自的文本槽位**（由 claimTextSlots 从注释标记换来），
  // 而不是写整个元素 —— 后者会让同元素内的多个插值互相覆盖（只剩最后一个）。
  // 例外：元素只有这一个插值时，可直接 setText(元素, exp)（B01b「去注释」）。
  const directText = isDirectTextElement(node);
  let slotsVar: string | undefined;
  let slotIndex = 0;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      // ⚠️ 2026-09-30 修复：此前这里用「只允许简单属性路径」的白名单正则，复杂插值
      //   （`{{ a + b }}` / `{{ ok ? 'A' : 'B' }}`）只打一条 DEV 警告后 **`continue` 静默丢弃**
      //   ⇒ 产物里整段文本消失（与优化版曾有的缺陷同源）。现与优化版同构：
      //   黑名单校验（拒绝危险写法）+ `prefixIdentifiers`（下方 setText 已如此）。
      if (!exp) {
        continue;
      }
      validateExpression(exp, 'interpolation');
      if (directText) {
        dynamicBindings.push({
          varName,
          code: `effect(() => setText(${varName}, ${prefixIdentifiers(exp, locals)}));`,
        });
        continue;
      }
      if (!slotsVar) {
        slotsVar = genVarName(`${node.tag}Slots`, varCounter);
        dynamicBindings.push({
          varName,
          code: `const ${slotsVar} = claimTextSlots(${varName});`,
        });
      }
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${slotsVar}[${slotIndex}], ${prefixIdentifiers(exp, locals)}));`,
      });
      slotIndex++;
    } else if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        onceMode,
        locals,
        staticVars,
        memoDeps,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      // 插入锚点：分支元素必须落在「原位置」，而不是父容器末尾。
      // 用其后第一个静态兄弟元素作为 `insert(..., ref)` 的参考节点；
      // 若后面没有静态元素（或全是动态节点）则退回追加（ref=undefined）。
      let anchorVar: string | undefined;
      for (let j = i + 1; j < node.children.length; j++) {
        const sibling = node.children[j]!;
        if (sibling.type === NodeTypes.ELEMENT) {
          anchorVar = staticVars?.get(sibling as ElementNode);
          break;
        }
      }
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
        locals,
        anchorVar,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        locals,
      );
    }
  }

  // v-memo：把「本元素 + 后代」新增的绑定收进一个依赖守卫。
  // 守卫本身必须是 effect（需要每次依赖变化都重跑比较），内部的逐绑定 effect 去掉
  // —— 否则内层 effect 仍会独立触发，memo 形同虚设。
  // v-once 优先级更高：本元素是 v-once 时走下面的「去掉 effect 包裹」分支。
  if (memoMode && memoDeps) {
    const inner = dynamicBindings.slice(bindingStart);
    if (inner.length > 0) {
      const depth = varCounter.get('_memo_depth') ?? 0;
      varCounter.set('_memo_depth', depth + 1);
      const memoVar = `_memo_${depth}`;
      // 与优化版同一形态：`let _memo_N=null;effect(()=>{const _d=deps;...})`
      const body = inner.map((b) => stripEffectWrapper(b.code)).join('');
      dynamicBindings.length = bindingStart;
      dynamicBindings.push({
        varName: inner[0]!.varName,
        code: `let ${memoVar}=null;effect(()=>{const _d=${memoDeps};if(!${memoVar}||${memoVar}.some((v,i)=>v!==_d[i])){${memoVar}=_d;${body}}});`,
      });
    }
  } else if (onceMode) {
    // v-once：把本次产生的绑定去掉 `effect()` 包裹 —— 只渲染一次，不建响应式边界。
    // 幂等：内层递归已处理过的绑定再处理一次也无副作用。
    for (let i = bindingStart; i < dynamicBindings.length; i++) {
      const binding = dynamicBindings[i];
      if (binding) binding.code = stripEffectWrapper(binding.code);
    }
  }
}

/**
 * 去掉 `effect(() => X);` 的外层包裹 → `X;`（供 v-once 使用）
 *
 * 只处理本 codegen 自己生成的固定形态；不匹配时原样返回。
 */
function stripEffectWrapper(code: string): string {
  const match = /^effect\(\(\)\s*=>\s*([\s\S]*?)\);$/.exec(code.trim());
  return match && match[1] ? `${match[1]};` : code;
}

// ============================================================
// Helper: 在 elementVars 中查找已有变量名
// ============================================================

function findExistingVar(
  elementVars: Array<{ varName: string; tag: string }>,
  tag: string,
  consumedCount?: Map<string, number>,
): string | null {
  // 查找匹配标签的、尚未被 processElement 处理过的变量
  // 通过 consumedCount 跟踪每个标签已消费的数量，避免重复标签返回相同变量名
  const matching = elementVars.filter((v) => v.tag === tag);
  if (matching.length > 0) {
    const idx = consumedCount?.get(tag) ?? 0;
    consumedCount?.set(tag, idx + 1);
    return matching[idx]!.varName;
  }
  return null;
}

// ============================================================
// 处理 VNodeCall props（用于 v-text、v-html 等转换后的指令）
// ============================================================

function processVNodeCallProps(
  vnode: VNodeCall,
  varName: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  locals: ReadonlySet<string> = new Set(),
): void {
  processVNodeCallPropsShared(vnode, varName, dynamicBindings, locals, {
    text: (v, value, scope) => `effect(() => setText(${v}, ${prefixIdentifiers(value, scope)}));`,
    html: (v, value, scope) => `effect(() => setHTML(${v}, ${prefixIdentifiers(value, scope)}));`,
  });
}

// ============================================================
// 处理指令节点
// ============================================================

/**
 * 危险/带副作用的表达式模式（黑名单）。
 * 模板表达式默认**信任**（模板由开发者书写），只拦这些：
 * 语句分隔、箭头函数、声明关键字、动态导入、赋值（避免副作用与注入）。
 */
const DANGEROUS_EXPRESSION =
  /;|=>|\bfunction\b|\bnew\s|\bimport\b|\brequire\b|\bdelete\b|\bthrow\b|\bawait\b|(^|[^=!<>])\b[a-zA-Z_$][\w$]*\s*=(?!=)/;

function validateExpression(exp: string | undefined, context: string): void {
  if (!exp) return;
  // 表达式生成已统一改走 `prefixIdentifiers(exp, locals)`（见各调用点），
  // 它能正确处理数组/对象/三元/拼接/索引等，并跳过属性名、字符串、locals。
  // ⇒ 这里不再限制为「简单属性路径」，改为**黑名单式**拒绝明显危险/带副作用的模式。
  if (DANGEROUS_EXPRESSION.test(exp)) {
    throw new Error(
      `[lytjs/compiler] Unsafe expression in ${context}: "${exp}".\n` +
        `  Statements, arrow functions, declarations and assignments are not allowed in templates.`,
    );
  }
}

// FIX: P1-S1/S2/S6/S8：属性名 / 事件名 / 组件名 / v-island 校验统一在
// `codegen-signal-shared.ts` 实现，两套发射器共用同一判据与错误文案。

/**
 * handler 表达式是否为「成员路径」（方法引用）：`fn` / `obj.fn` / `a.b.c`。
 * 只有这种才可直接当作 handler 传入（点击时才调用）。
 */
const MEMBER_PATH_EXPRESSION = /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/;

/**
 * 渲染事件 handler。
 *
 * ⚠️ 2026-09-30 修复（预存缺陷）：`@click="fn()"` / `"count++"` 这类**内联语句**此前被
 * 直接当作 handler 表达式 ⇒ ① 在 **setup 阶段就被求值**；② 传入的是其**返回值**（通常
 * `undefined`）⇒ 点击时 `handler(e)` 抛 `TypeError`。现按 Vue 语义包成箭头：
 * 方法引用原样传，内联语句包成 `($event) => { … }`（**点击时才求值**）。
 */
function renderHandlerExpression(exp: string, locals: ReadonlySet<string> = new Set()): string {
  if (MEMBER_PATH_EXPRESSION.test(exp)) return prefixIdentifiers(exp, locals);
  return `($event) => { ${prefixIdentifiers(exp, new Set([...locals, '$event']))}; }`;
}

function processDirective(
  dir: DirectiveNode,
  varName: string,
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  locals: ReadonlySet<string> = new Set(),
  staticClass = '',
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  // FIX: P1-1~3 对 expContent 和 argContent 进行白名单验证
  validateExpression(expContent, `v-${dir.name}`);
  validateExpression(argContent, `v-${dir.name} argument`);
  validateArgContent(argContent);

  // 2026-09-30 修复：动态参数/事件（`:[dyn]` / `@[evt]`）的 arg 是**表达式**，不是字面量。
  const isDynamicArg = !!dir.arg && (dir.arg as { isStatic?: boolean }).isStatic === false;
  const argCode = argContent
    ? isDynamicArg
      ? prefixIdentifiers(argContent, locals)
      : `'${argContent}'`
    : "''";

  // FIX: P1-S1, P1-S2: 根据指令类型进行特定的名称验证
  // C-35a：动态参数（`:[foo.bar]` / `@[evt.name]`）的 arg 是**表达式**，
  // 不是属性/事件字面量；用字面量白名单校验会把合法表达式误杀。
  if (!isDynamicArg && dir.name === 'bind' && argContent) {
    validateAttributeName(argContent, `v-bind:${argContent}`);
  }
  if (!isDynamicArg && dir.name === 'on' && argContent) {
    validateEventName(argContent, `v-on:${argContent}`);
  }
  // FIX: P1-S8: v-island 指令验证
  if (dir.name === 'island') {
    validateIslandDirective(expContent, 'v-island');
  }

  switch (dir.name) {
    case 'if': {
      // v-if 在 transform 阶段已被转换为 JSConditionalExpression
      // 此处作为后备处理，使用 insert/remove 方式
      // FIX: P2-13 _container 是 render 函数的第二个参数，在生成的代码中可用
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `let _ifFallbackEl = null;\n  effect(() => {\n    if (${prefixIdentifiers(expContent, locals)}) {\n      if (!_ifFallbackEl) {\n        _ifFallbackEl = ${varName};\n        insert(_ifFallbackEl, ${BASE_EMIT_PROFILE.containerParam});\n      }\n    } else {\n      if (_ifFallbackEl) {\n        remove(_ifFallbackEl);\n        _ifFallbackEl = null;\n      }\n    }\n  });`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => {\n    ${varName}.style.display = ${prefixIdentifiers(expContent, locals)} ? '' : 'none';\n  });`,
        });
      }
      break;
    }

    case 'html': {
      // v-html 在 transform 阶段已被转换为 innerHTML 属性
      // 在 processVNodeCallProps 中处理
      // 此处作为后备（消毒同样由 dom-runtime.setHTML 承担，见上方 innerHTML 分支注释）
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `effect(() => setHTML(${varName}, ${prefixIdentifiers(expContent, locals)}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        if (argContent === 'class' && !isDynamicArg) {
          // 静态 class 必须并入（setClass 是整体替换），否则模板里的 class 会被抹掉
          const classValue = staticClass
            ? `[${JSON.stringify(staticClass)}, ${prefixIdentifiers(expContent, locals)}]`
            : prefixIdentifiers(expContent, locals);
          dynamicBindings.push({
            varName,
            code: `effect(() => setClass(${varName}, ${classValue}));`,
          });
        } else if (argContent === 'style' && !isDynamicArg) {
          dynamicBindings.push({
            varName,
            code: `effect(() => setStyle(${varName}, ${prefixIdentifiers(expContent, locals)}));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `effect(() => setAttribute(${varName}, ${argCode}, ${prefixIdentifiers(expContent, locals)}));`,
          });
        }
      }
      break;
    }

    case 'on': {
      if (argContent && expContent) {
        if (dir.modifiers.length > 0) {
          const mods = dir.modifiers.map((m) => `${m}: true`).join(', ');
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, ${argCode}, ${renderHandlerExpression(expContent, locals)}, { ${mods} }));`,
          });
        } else {
          // FIX: P1-12 使用 createEventHandler 替代未导入的 addEventListener
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, ${argCode}, ${renderHandlerExpression(expContent, locals)}));`,
          });
        }
      }
      break;
    }

    case 'model': {
      if (expContent) {
        const tagLower = tag.toLowerCase();
        const modifiers = dir.modifiers;
        const isLazy = modifiers.includes('lazy');
        const isNumber = modifiers.includes('number');
        const isTrim = modifiers.includes('trim');

        // 确定事件类型和取值方式
        let eventName: string;
        let getValueExpr: string;
        if (tagLower === 'select') {
          eventName = 'change';
          getValueExpr = '$e.target.value';
        } else if (tagLower === 'textarea') {
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        } else {
          // input 元素（默认）
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        }

        // 构建赋值表达式（应用修饰符）
        // FIX: P2-14 重构为 if-else 结构，避免 .number.trim 组合时
        // 前面的单独 if 分支被后续组合分支覆盖，导致逻辑冗余
        let setValueExpr: string;
        if (isNumber && isTrim) {
          // .number.trim 组合：先 trim 再转 number
          setValueExpr = `Number((${getValueExpr}).trim())`;
        } else if (isNumber) {
          setValueExpr = `Number(${getValueExpr})`;
        } else if (isTrim) {
          setValueExpr = `(${getValueExpr}).trim()`;
        } else {
          setValueExpr = getValueExpr;
        }

        // 生成双向绑定代码
        dynamicBindings.push({
          varName,
          code: `effect(() => { ${varName}.value = ${prefixIdentifiers(expContent, locals)}; });`,
        });
        dynamicBindings.push({
          varName,
          code: `onCleanup(createEventHandler(${varName}, '${eventName}', ($e) => { ${prefixIdentifiers(expContent, locals)} = ${setValueExpr}; }));`,
        });
      }
      break;
    }

    case 'for': {
      // v-for 在 transform 阶段已被转换为 JSCallExpression (renderList)
      // 此处作为后备处理
      break;
    }
  }
}

// ============================================================
// 处理 JSConditionalExpression（v-if 转换结果）
// 使用 createTemplate + insert/remove 实现真正的 DOM 插入/移除
// ============================================================

function processConditional(
  node: JSConditionalExpression,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
  _consumedCount?: Map<string, number>,
  locals: ReadonlySet<string> = new Set(),
  anchorVar?: string,
): void {
  const testExpr = getTestExpr(node.test);

  // FIX: P1-L2 v-if/v-else-if 条件为空未报错 - 添加运行时错误抛出
  if (!testExpr || testExpr.trim() === '') {
    throw new Error(
      `[lytjs/compiler] v-if/v-else-if condition is empty or invalid. ` +
        `Ensure the directive has a valid expression, e.g., v-if="condition" or v-else-if="condition".`,
    );
  }

  // 收集所有条件分支（v-if / v-else-if / v-else 链）
  const branches: Array<{
    condition: string | null; // null 表示 v-else（无条件）
    branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined;
  }> = [];

  // 收集 consequent 分支
  branches.push({
    condition: testExpr,
    branch: node.consequent,
  });

  // 递归收集 alternate 链（v-else-if / v-else）
  let alternate = node.alternate;
  while (alternate) {
    if (
      typeof alternate !== 'string' &&
      !Array.isArray(alternate) &&
      alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
    ) {
      const altCond = alternate as JSConditionalExpression;
      const altTestExpr = getTestExpr(altCond.test);
      branches.push({
        condition: altTestExpr || null,
        branch: altCond.consequent,
      });
      alternate = altCond.alternate;
    } else {
      // v-else 分支（无条件）
      branches.push({
        condition: null,
        branch: alternate,
      });
      alternate = undefined;
    }
  }

  // 为每个分支注册变量名（确保 varCounter 和 elementVars 正确递增）
  //
  // ⚠️ 这里**不能**消费 consumedCount：同一标签在多个分支（`<i v-if>…<i v-else-if>`）
  //   会出现多次，按「消费」计数会让第二次取值越界，直接抛
  //   `Cannot read properties of undefined (reading 'varName')`（if08 实测）。
  //   本循环只需知道「该标签是否已有变量」，不参与后续 processElement 的消费顺序。
  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const elInfo = extractElementFromBranch(branchInfo.branch);
    if (elInfo) {
      const existing = findExistingVar(elementVars, elInfo.tag);
      if (!existing) {
        const varName = genVarName(elInfo.tag, varCounter);
        elementVars.push({ varName, tag: elInfo.tag });
      }
    }
  }

  // 序列化每个分支的 HTML
  const branchHTMLs: string[] = [];
  for (const branchInfo of branches) {
    const html = serializeBranchHTML(branchInfo.branch);
    branchHTMLs.push(html);
  }

  // 确定父容器和参考节点
  const containerVar = parentVar ?? BASE_EMIT_PROFILE.containerParam;
  // FIX: P1-28 使用唯一计数器键确保嵌套 v-if 生成唯一变量名，
  // 避免嵌套场景下变量名冲突
  // FIX: P2-14 修复 `_if_undefined` 问题，确保深度值始终为数字
  const ifDepth = varCounter.get('_if_depth') ?? 0;
  const ifCounterKey = `_if_${ifDepth}`;
  const ifVarName = `_if${varCounter.get(ifCounterKey) ?? 0}`;
  varCounter.set(ifCounterKey, (varCounter.get(ifCounterKey) ?? 0) + 1);
  varCounter.set('_if_depth', ifDepth + 1);

  // 预先算好每个分支的动态绑定：文本槽位变量必须声明在 effect 外，
  // 才能在「创建分支」和「分支保持激活」两条路径里共用。
  const branchDynamics = branches.map((branchInfo, i) =>
    buildBranchDynamics(
      collectBranchDynamics(branchInfo.branch, locals),
      ifVarName,
      `${ifVarName}_b${i}`,
    ),
  );

  // FIX: P2-24 模板缩进保持：生成的代码保持与模板一致的缩进层级
  // 生成条件分支的 DOM 插入/移除代码
  let code = `let ${ifVarName}El = null;\n`;
  code += `let ${ifVarName}Active = -1;\n`;
  for (const dyn of branchDynamics) {
    if (dyn.declarations) code += `${dyn.declarations}\n`;
  }
  code += `effect(() => {\n`;

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = branchHTMLs[i]!;

    if (i > 0) {
      code += `    } else `;
    }

    if (branchInfo.condition !== null) {
      code += `if (${prefixIdentifiers(branchInfo.condition, locals)}) `;
    }

    code += `{\n`;
    code += `      if (${ifVarName}Active !== ${i}) {\n`;

    // 移除之前的分支元素（所有分支都要清理，不能只清理第 0 支：
    // v-if → v-else 切换时旧节点会残留在 DOM 里，且后续再也拿不到引用）
    code += `        if (${ifVarName}El) {\n`;
    code += `          remove(${ifVarName}El);\n`;
    code += `          ${ifVarName}El = null;\n`;
    code += `        }\n`;

    // 创建并插入新分支元素
    code += `        ${ifVarName}El = createTemplate(${JSON.stringify(branchHTML)}).firstElementChild;\n`;
    // FIX: P0-07 添加 null 检查，防止空 HTML 或纯文本 HTML 导致 firstElementChild 为 null 时崩溃
    code += `        if (!${ifVarName}El) { ${ifVarName}El = document.createComment(''); }\n`;
    if (branchHTML.trim()) {
      // 插入参考节点：`anchorVar` 为「原位置后面的静态兄弟元素」，
      // 保证 v-if 分支落在模板书写的位置，而不是父容器末尾（mx04 实测）。
      code += `      insert(${ifVarName}El, ${containerVar}${anchorVar ? `, ${anchorVar}` : ''});\n`;
    }
    code += `        ${ifVarName}Active = ${i};\n`;

    // 处理分支内的动态绑定（插值文本 / 动态属性 / 组件挂载）
    const dyn = branchDynamics[i]!;
    if (dyn.create) code += dyn.create;

    code += `      }`;

    // 如果分支已激活，更新动态内容（同一段代码在「保持激活」分支里再执行一次）
    if (dyn.update) {
      code += ` else {\n`;
      code += dyn.update;
      code += `      }`;
    }

    code += `\n`;
  }

  // 如果所有条件都不满足，移除元素
  //
  // ⚠️ 2026-09-30 修复：末支若已是 `v-else`（condition === null），它本身就是兜底分支；
  //   再补一个 `else {…}` 会得到 `if…else…else` ⇒ **SyntaxError: Unexpected token 'else'**。
  //   注意：无论哪种情况都必须闭合末支的外层 `{`，故此处只保留 `}`。
  const lastBranch = branches[branches.length - 1];
  if (!lastBranch || lastBranch.condition !== null) {
    code += `    } else {\n`;
    code += `      if (${ifVarName}El) {\n`;
    code += `        remove(${ifVarName}El);\n`;
    code += `        ${ifVarName}El = null;\n`;
    code += `        ${ifVarName}Active = -1;\n`;
    code += `      }\n`;
    code += `    }\n`;
  } else {
    code += `    }\n`;
  }
  code += `  });`;

  dynamicBindings.push({
    varName: containerVar,
    code,
  });

  // 分支内的动态绑定已在上面按「分支元素自身」生成。
  // ⚠️ 这里**不再**调用 processBranchDynamics：它把 `:class` / `:style` 绑到
  //   `containerVar`（分支的**父容器**）上，而且没有做 `_ctx.` 前缀 ⇒
  //   静态 class 泄漏到父元素（if07）、动态表达式直接 `ReferenceError`（if09）。
  // FIX: P2-12 在 processConditional 结束时递减 _if_depth，避免同级 v-if 时计数器持续增长
  varCounter.set('_if_depth', ifDepth);
}

// ============================================================
// Helper: 序列化条件分支为 HTML 字符串
// ============================================================

function serializeBranchHTML(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  return serializeBranchHtmlShared(branch, {
    serializeStaticElement: (el) => serializeStaticHTML(el, new Map(), []),
    // FIX: P1-S6: 验证动态组件名
    validateDynamicComponentName: (tag) => validateComponentName(tag, 'v-for dynamic component'),
    stripStaticQuotes: (value) => value.replace(/^["']|["']$/g, ''),
  });
}

/** 分支内的动态项（文本 / 属性 / 组件挂载） */
interface BranchDynamicOp {
  /** 目标元素在分支根元素内的**先序索引**（-1 = 分支根元素自身） */
  elementIndex: number;
  kind: 'text' | 'attr' | 'class' | 'style' | 'component' | 'conditional' | 'list';
  /** 文本槽位序号（kind === 'text'） */
  slotIndex?: number;
  key?: string;
  /** 表达式；kind === 'conditional' 时是 `(cond ? vnode : null)`；kind === 'list' 时是列表源 */
  expr?: string;
  propsCode?: string;
  /** `reconcileArray` 的 key/create/update 对象字面量；仅 kind === 'list' 时存在 */
  listOptions?: string;
  /** `<template>` 分支（哨兵 tag）：挂载 Fragment 而非组件 */
  fragment?: boolean;
  /** Fragment 子内容（vnode 代码数组）；仅 fragment 时存在 */
  fragmentChildren?: string;
  /** 内嵌条件的注释锚点对序号（0 起）；kind === 'conditional' 时存在 */
  markerIndex?: number;
}

/**
 * 收集 v-if 分支子树里的动态绑定。
 *
 * 分支 HTML 是**静态**的，动态内容必须在 effect 里按位置更新：
 * - 插值 → `claimTextSlots(el)[slotIndex]`（与 processElement 同一套槽位机制）；
 * - 动态属性 → 目标元素 setAttribute / setClass / setStyle；
 * - 组件分支 → 占位元素上 mountComponent。
 *
 * 元素定位用 `rootEl.querySelectorAll('*')[n]`（先序遍历序号），
 * 需要与序列化顺序严格一致 —— 故递归时按「元素节点」计数。
 */
function collectBranchDynamics(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
  locals: ReadonlySet<string>,
): BranchDynamicOp[] {
  const ops: BranchDynamicOp[] = [];
  let nextIndex = 0;
  // 内嵌条件的注释锚点对计数（每处条件在静态 HTML 里留一对 `<!--lyt-if-->`）
  let nextMarker = 0;

  const visit = (raw: unknown, selfIndex: number, inheritedLocals: ReadonlySet<string>): void => {
    if (!raw || typeof raw !== 'object') return;
    const vn = raw as VNodeCall;
    if (vn.type !== NodeTypes.VNODE_CALL || typeof vn.tag !== 'string' || vn.tag === '') return;

    // 组件：整棵子树交给组件自身渲染
    if (!/^["']/.test(vn.tag)) {
      if (vn.tag === FRAGMENT_SENTINEL) {
        // `<template>`：挂载 Fragment（子内容必须在挂载时按 vnode 重新序列化），
        // 不能当组件名传给 mountComponent。
        ops.push({
          elementIndex: selfIndex,
          kind: 'component',
          expr: vn.tag,
          propsCode: 'null',
          fragment: true,
          fragmentChildren:
            serializeVNodeCallChildren(vn.children, BASE_EMIT_PROFILE.ctxPrefix, inheritedLocals) ??
            'null',
        });
      } else {
        ops.push({
          elementIndex: selfIndex,
          kind: 'component',
          expr: vn.tag,
          propsCode: buildVNodePropsCode(vn, inheritedLocals),
        });
      }
      return;
    }

    // 动态属性
    if (vn.props && vn.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
      for (const rawProp of (vn.props as JSObjectExpression).properties) {
        if (rawProp.type !== NodeTypes.JS_PROPERTY) continue;
        const jsProp = rawProp as JSProperty;
        // 分支内 v-show（C-09）：style 的值是 `cond ? undefined : {display:'none'}`，
        // 不是简单表达式；若直接跳过，v-show 会在分支路径整条丢失（永远可见）。
        const showTest = getVShowStyleTest(jsProp);
        if (showTest !== undefined) {
          ops.push({
            elementIndex: selfIndex,
            kind: 'style',
            key: 'style',
            expr: `{ display: ${prefixIdentifiers(showTest, inheritedLocals)} ? '' : 'none' }`,
          });
          continue;
        }
        if (
          jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
          jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
        ) {
          continue;
        }
        const key = (jsProp.key as SimpleExpressionNode).content.replace(/^["']|["']$/g, '');
        const value = (jsProp.value as SimpleExpressionNode).content;
        if (key === 'key' || /^on[A-Z]/.test(key)) continue;
        if (isStaticPropValue(value)) continue;
        ops.push({
          elementIndex: selfIndex,
          kind: key === 'class' ? 'class' : key === 'style' ? 'style' : 'attr',
          key,
          expr: prefixIdentifiers(value, inheritedLocals),
        });
      }
    }

    // 本元素自身的文本槽位（元素子节点单独递归，不会破坏槽位顺序）
    const kids = vn.children;
    const kidList: unknown[] =
      kids === undefined || kids === null ? [] : Array.isArray(kids) ? kids : [kids];
    let textSlotIndex = 0;
    for (const kid of kidList) {
      const exp = readInterpolationExpr(kid);
      if (exp === null) continue;
      ops.push({
        elementIndex: selfIndex,
        kind: 'text',
        slotIndex: textSlotIndex,
        expr: `(${prefixIdentifiers(exp, inheritedLocals)} ?? '')`,
      });
      textSlotIndex++;
    }

    // 递归元素子节点（先序计数）
    for (const kid of kidList) {
      if (!kid || typeof kid !== 'object') continue;
      const k = kid as { type?: number; tag?: unknown };
      if (k.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
        // 内嵌 v-if/v-else：静态 HTML 里留一对注释锚点（不占元素序号）。
        // 运行期把选中的分支 vnode 插到锚点对之间，元素层级与 vnode 路径一致。
        const markerIndex = nextMarker++;
        const expr = serializeConditionalVNode(kid, BASE_EMIT_PROFILE.ctxPrefix, inheritedLocals);
        if (expr) ops.push({ elementIndex: -1, kind: 'conditional', expr, markerIndex });
        continue;
      }
      if (k.type === NodeTypes.JS_CALL_EXPRESSION) {
        // 分支内的 v-for（RENDER_LIST）：静态 HTML 里只有宿主元素，列表项由运行期创建。
        // 不收进分支动态代码 ⇒ 整段列表消失（宿主元素空壳）。
        const call = kid as JSCallExpression;
        const callee = typeof call.callee === 'string' ? call.callee : String(call.callee);
        if (callee === 'RENDER_LIST' || callee === 'renderList') {
          const binding = buildReconcileArrayCode(call, new Map(), inheritedLocals);
          if (binding) {
            ops.push({
              elementIndex: selfIndex,
              kind: 'list',
              expr: binding.listCode,
              listOptions: binding.options,
            });
          }
        }
        continue;
      }
      if (k.type === NodeTypes.VNODE_CALL || k.type === NodeTypes.ELEMENT) {
        const childIndex = nextIndex++;
        visit(kid, childIndex, inheritedLocals);
      }
    }
  };

  if (Array.isArray(branch)) {
    for (const item of branch) visit(item, -1, locals);
  } else {
    visit(branch, -1, locals);
  }
  return ops;
}

/** VNODE_CALL.props → 传给 mountComponent 的 props 对象代码 */
function buildVNodePropsCode(vnode: VNodeCall, locals: ReadonlySet<string>): string {
  if (!vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION) return 'null';
  const parts: string[] = [];
  for (const rawProp of (vnode.props as JSObjectExpression).properties) {
    if (rawProp.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = rawProp as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }
    const key = (jsProp.key as SimpleExpressionNode).content;
    const value = (jsProp.value as SimpleExpressionNode).content;
    parts.push(`${key}: ${prefixIdentifiers(value, locals)}`);
  }
  return parts.length ? `{ ${parts.join(', ')} }` : 'null';
}

/**
 * 分支动态代码生成：
 * - create：分支元素刚创建时执行（含 claimTextSlots 认领文本槽位）
 * - update：分支保持激活、依赖变化时重新执行
 * - declarations：槽位变量声明（必须在 effect 外，供 create/update 共用）
 */
function buildBranchDynamics(
  ops: BranchDynamicOp[],
  ifVar: string,
  branchTag: string,
): { declarations: string; create: string; update: string } {
  const declLines: string[] = [];
  const createLines: string[] = [];
  const updateLines: string[] = [];
  // 列表插入会改变 `querySelectorAll('*')` 的序号，故延后到所有「按序号定位」的
  // 操作（文本槽位 / 属性 / 条件 / 组件）之后再执行。
  const listCreate: string[] = [];
  const listUpdate: string[] = [];
  const claimed = new Set<number>();
  const pad = '        ';

  const access = (index: number): string =>
    index < 0 ? `${ifVar}El` : `${ifVar}El.querySelectorAll('*')[${index}]`;

  for (const op of ops) {
    if (op.kind === 'text') {
      const index = op.elementIndex;
      const slotsVar = `${branchTag}Text${index < 0 ? 'Root' : index}`;
      if (!claimed.has(index)) {
        claimed.add(index);
        declLines.push(`let ${slotsVar} = null;`);
        if (index < 0) {
          createLines.push(`${slotsVar} = claimTextSlots(${ifVar}El);`);
        } else {
          createLines.push(
            `{ const _e = ${access(index)}; if (_e) ${slotsVar} = claimTextSlots(_e); }`,
          );
        }
      }
      const read = `(${slotsVar} || [])[${op.slotIndex ?? 0}]`;
      createLines.push(`setText(${read}, ${op.expr});`);
      updateLines.push(`setText(${read}, ${op.expr});`);
      continue;
    }

    if (op.kind === 'component') {
      const target = access(op.elementIndex);
      const apply = op.fragment
        ? `mountVNode(createVNode(Fragment, ${op.propsCode ?? 'null'}, ${op.fragmentChildren ?? 'null'}), ${target});`
        : `mountComponent(${op.expr}, ${op.propsCode ?? 'null'}, ${target});`;
      const stmt = op.elementIndex < 0 ? apply : `{ const _e = ${target}; if (_e) ${apply} }`;
      createLines.push(stmt);
      // Fragment 的子孙 vnode 由本次 effect 求值构造；分支保持激活时也要重挂一次，
      // 否则 `{{x}}` 等响应式内容不会刷新（mountComponent 自带 effect，无需如此）。
      if (op.fragment) updateLines.push(stmt);
      continue;
    }

    if (op.kind === 'conditional') {
      // 注释锚点对之间替换内容（锚点不是元素，元素层级与 vnode 路径一致）。
      const stmt = buildConditionalAnchorOp(
        `${ifVar}El`,
        op.markerIndex ?? 0,
        op.expr ?? 'null',
        'mountVNode',
      );
      createLines.push(stmt);
      updateLines.push(stmt);
      continue;
    }

    if (op.kind === 'list') {
      // 分支内的 v-for：宿主元素是 elementIndex 指向的静态元素（-1 = 分支根元素）。
      // create / update 共用同一段 reconcileArray（update 由外层 effect 重跑驱动）。
      const target = access(op.elementIndex);
      const call = `reconcileArray(${target}, ${op.expr}, ${op.listOptions});`;
      const stmt = op.elementIndex < 0 ? call : `{ const _e = ${target}; if (_e) ${call} }`;
      listCreate.push(stmt);
      listUpdate.push(stmt);
      continue;
    }

    const target = access(op.elementIndex);
    const apply =
      op.kind === 'class'
        ? `setClass(${target}, ${op.expr});`
        : op.kind === 'style'
          ? `setStyle(${target}, ${op.expr});`
          : `setAttribute(${target}, ${JSON.stringify(op.key)}, ${op.expr});`;
    const stmt = op.elementIndex < 0 ? apply : `{ const _e = ${target}; if (_e) ${apply} }`;
    createLines.push(stmt);
    updateLines.push(stmt);
  }

  createLines.push(...listCreate);
  updateLines.push(...listUpdate);

  return {
    declarations: declLines.join('\n'),
    create: createLines.map((line) => pad + line + '\n').join(''),
    update: updateLines.map((line) => pad + line + '\n').join(''),
  };
}

/** 本发射器（完整名 / `_ctx` 前缀）的列表项 props 生成。 */
function emitListItemProps(
  props: unknown,
  createExpr: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  createLines: string[],
  updateLines: string[],
): void {
  emitListItemPropsShared(
    props,
    createExpr,
    updateExpr,
    locals,
    createLines,
    updateLines,
    prefixIdentifiers,
  );
}

/** 本发射器（完整名 / `_ctx` 前缀）的列表项子树生成。 */
function emitListItemNode(
  node: unknown,
  createParent: string,
  updateExpr: string | null,
  locals: ReadonlySet<string>,
  varCounter: Map<string, number>,
  createLines: string[],
  updateLines: string[],
): boolean {
  return emitListItemNodeShared(
    node,
    createParent,
    updateExpr,
    locals,
    varCounter,
    createLines,
    updateLines,
    prefixIdentifiers,
    (content, loc) => `(${prefixIdentifiers(content, loc)} ?? '')`,
  );
}

/** 本发射器（完整名 / `_ctx` 前缀）的列表项组件 props。 */
function buildItemComponentProps(vnode: VNodeCall, locals: ReadonlySet<string>): string {
  return buildItemComponentPropsShared(vnode, locals, prefixIdentifiers);
}

// ============================================================
// 处理 JSCallExpression（v-for 转换结果）
// ============================================================

function buildReconcileArrayCode(
  node: JSCallExpression,
  varCounter: Map<string, number>,
  locals: ReadonlySet<string> = new Set(),
): { listCode: string; options: string } | null {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  // RENDER_LIST 是 v-for 转换后的 callee
  if (callee === 'RENDER_LIST' || callee === 'renderList') {
    // 提取迭代源和渲染函数
    const sourceExpr = node.arguments[0];
    const renderFn = node.arguments[1];

    const source = getTestExpr(sourceExpr as JSChildNode | string | undefined);
    if (!source) return null;

    // 从箭头函数（COMPOUND_EXPRESSION）中提取 item 变量名与渲染项 VNodeCall
    let itemVar = 'item';
    let itemParams: string[] = ['item'];
    let itemLocals: ReadonlySet<string> = new Set(['item']);
    let renderItem: VNodeCall | null = null;
    /** `v-for` 与 `v-if` 同元素：renderItem 被 transform 包成条件表达式 */
    let itemCondition: JSConditionalExpression | null = null;
    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        for (const child of compound.children) {
          if (typeof child === 'string' && child.includes('=>')) {
            // 解析箭头头，拿**全部**形参（索引形参此前被整段忽略）
            const headMatch = /^\s*\(?\s*([^)]*?)\s*\)?\s*=>/.exec(child);
            const parsed = (headMatch?.[1] ?? '')
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean);
            if (parsed.length > 0) {
              itemVar = parsed[0]!;
              itemParams = parsed;
            }
          } else if (typeof child !== 'string' && child.type === NodeTypes.VNODE_CALL) {
            renderItem = child as VNodeCall;
          } else if (
            typeof child !== 'string' &&
            child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
          ) {
            // `<p v-for v-if>`：条件包裹渲染项。旧实现只认 VNODE_CALL，
            // renderItem 为 null ⇒ create 回调返回 undefined ⇒ WeakMap 键非法
            // （`Invalid value used as weak map key`）。
            itemCondition = child as JSConditionalExpression;
            const consequent = (child as JSConditionalExpression).consequent;
            if (
              consequent &&
              typeof consequent === 'object' &&
              !Array.isArray(consequent) &&
              (consequent as { type?: number }).type === NodeTypes.VNODE_CALL
            ) {
              renderItem = consequent as VNodeCall;
            }
          }
        }
      }
    }
    itemLocals = new Set(itemParams);

    // 由渲染项 VNodeCall 生成通用 create / update 逻辑：
    // 使用 document.createElement + textContent/属性绑定，替代此前硬编码的 benchmark 表格模板
    let createBody = '';
    let updateBody = '';
    // 列表项是**组件**（`tag` 为裸标识符如 `Row`；元素的 `tag` 是带引号字符串 `"li"`）
    // => 不能按元素处理；改为造容器 + `mountComponent`（与优化版同构）。
    // 注意：`create` 回调**必须 return 容器节点**，否则 reconcileArray 里
    // `reconcileKeyMap.set(node, …)` 会收到 undefined。
    const itemIsComponent =
      !!renderItem &&
      typeof renderItem.tag === 'string' &&
      renderItem.tag !== '' &&
      !/^["']/.test(renderItem.tag);
    if (itemIsComponent && renderItem) {
      const rawTag = String(renderItem.tag);
      // C-35f：kebab 组件的 tag 是查找**表达式**（`_ctx["my-comp"] || …`），
      // 直接拼进变量名会产出 `const _(_ctx[…])` —— 非法标识符，整模块 SyntaxError。
      const hostVar = genVarName('lytComp', varCounter);
      const itemProps = buildItemComponentProps(renderItem, itemLocals);
      // 列表项的子节点（VNODE_CALL）→ 默认插槽内容。
      // 列表项 children 是 VNODE_CALL（type 9）且为「单对象」而非数组，先归一化为数组；
      // 复用既有 serializeVNodeCall（严格模式递归处理 VNODE_CALL → TO_DISPLAY_STRING 叶子）。
      const rawKids = renderItem.children as unknown;
      const kidList =
        rawKids === undefined || rawKids === null
          ? []
          : Array.isArray(rawKids)
            ? rawKids
            : [rawKids];
      const kidVNodes: string[] = [];
      for (const kid of kidList) {
        const code = serializeVNodeCall(kid, BASE_EMIT_PROFILE.ctxPrefix, itemLocals);
        if (code) kidVNodes.push(code);
      }
      const slotsArg = kidVNodes.length ? ',{default:()=>[' + kidVNodes.join(',') + ']}' : '';
      if (rawTag === FRAGMENT_SENTINEL) {
        // `<template v-for>`：容器里挂 Fragment，而不是把哨兵当组件名传入。
        // children 必须走完整 vnode 序列化：内嵌 v-if / 文本 / 拼接文本都经此，
        // 旧实现逐个 `serializeVNodeCall` 只认 VNODE_CALL，条件节点被丢掉后
        // Fragment 里只剩注释锚点。
        const kidsCode = serializeVNodeCallChildren(
          renderItem.children,
          BASE_EMIT_PROFILE.ctxPrefix,
          itemLocals,
        );
        const frag = `createVNode(Fragment, null, ${kidsCode ?? 'null'})`;
        // 每项不产生**元素**包裹：挂进 DocumentFragment 后把 Fragment 的子节点整组返回。
        // 这组节点的首尾就是运行时 Fragment 自身的一对注释锚点，DOM 层级与 vnode 路径一致
        //（多出的只有注释，没有任何元素）。
        createBody = buildFragmentMountCreate(frag, 'mountVNode');
        updateBody = buildFragmentMountUpdate(frag, 'mountVNode');
      } else {
        createBody =
          'const ' +
          hostVar +
          " = document.createElement('div');" +
          'mountComponent(' +
          componentRefExpr(rawTag, BASE_EMIT_PROFILE.ctxParam) +
          ',' +
          itemProps +
          ',' +
          hostVar +
          slotsArg +
          ');' +
          'return ' +
          hostVar +
          ';';
        updateBody =
          'mountComponent(' +
          componentRefExpr(rawTag, BASE_EMIT_PROFILE.ctxParam) +
          ',' +
          itemProps +
          ',_el' +
          slotsArg +
          ');';
      }
    } else if (renderItem && typeof renderItem.tag === 'string') {
      const tag = renderItem.tag.replace(/^"|"$/g, '');
      const elVar = genVarName(tag, varCounter);
      const children = renderItem.children;
      const kidList = normalizeVNodeChildren(children);

      if (containsConditionalNode(children)) {
        // 列表项内嵌 v-if/v-else：旧实现只认「文本 / 嵌套元素」，条件节点被整段丢弃，
        // 列表项全部空渲染。这里把选中分支 vnode 挂进列表项元素；
        // 多子节点时用 Fragment 保持顺序。
        const createLines = [`const ${elVar} = document.createElement(${JSON.stringify(tag)});`];
        const updateLines: string[] = [];
        emitListItemProps(renderItem.props, elVar, '_el', itemLocals, createLines, updateLines);
        if (kidList.length === 1) {
          const expr = serializeConditionalVNode(
            kidList[0],
            BASE_EMIT_PROFILE.ctxPrefix,
            itemLocals,
          );
          if (expr) {
            createLines.push(`mountVNode(${expr}, ${elVar});`);
            // mountVNode 会先清空宿主；条件为假时必须显式清空，否则旧分支残留
            updateLines.push(
              `{ const _v = ${expr}; if (_v) { mountVNode(_v, _el); } else { setHTML(_el, ''); } }`,
            );
          }
        } else {
          const kidsCode = serializeVNodeCallChildren(
            children,
            BASE_EMIT_PROFILE.ctxPrefix,
            itemLocals,
          );
          if (kidsCode) {
            const frag = `createVNode(Fragment, null, ${kidsCode})`;
            createLines.push(`mountVNode(${frag}, ${elVar});`);
            updateLines.push(`mountVNode(${frag}, _el);`);
          }
        }
        createBody = `${createLines.join('\n')}\nreturn ${elVar};`;
        updateBody = updateLines.join('\n');
      } else if (containsElementVNode(children)) {
        // 列表项含嵌套元素：逐层生成 create/update（旧实现只认直接子文本 ⇒ 子元素整段丢失）
        const createLines = [`const ${elVar} = document.createElement(${JSON.stringify(tag)});`];
        const updateLines: string[] = [];
        emitListItemProps(renderItem.props, elVar, '_el', itemLocals, createLines, updateLines);
        emitListItemNode(children, elVar, '_el', itemLocals, varCounter, createLines, updateLines);
        createBody = `${createLines.join('\n')}\nreturn ${elVar};`;
        updateBody = updateLines.join('\n');
      } else {
        createBody = `const ${elVar} = document.createElement('${tag}');`;

        // 插值 {{ item.xxx }} 在 transform 后为 TO_DISPLAY_STRING 调用，
        // 通过 extractChildrenText 提取表达式；静态文本则原样写入
        const dynamicText = extractItemChildrenText(renderItem.children, itemLocals);
        if (dynamicText) {
          // 循环变量保持裸名（locals），其余标识符前缀化为 `_ctx.`
          const textCode = prefixIdentifiers(dynamicText, itemLocals);
          createBody += `${elVar}.textContent = ${textCode};`;
          // update 回调的参数是已存在元素 _el（由 reconcileArray 传入），
          // 不能引用 create 内的局部变量名
          updateBody = `_el.textContent = ${textCode};`;
        } else if (typeof children === 'string') {
          // ⚠️ 必须先转义反斜杠再转义单引号：顺序颠倒时 `it's a\b` 会先变成
          //   `it\'s a\b`，再被反斜杠转义二次处理成 `it\\'s a\\b`，
          //   产物 `'it\\'s a\\b'` 语法错误（`Unexpected identifier 's'`）。
          const escaped = children.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          createBody += `${elVar}.textContent = '${escaped}';`;
        }

        // 处理静态 props（如 class="foo"）与非静态绑定
        if (renderItem.props && renderItem.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
          const objExpr = renderItem.props as JSObjectExpression;
          for (const prop of objExpr.properties) {
            if (prop.type !== NodeTypes.JS_PROPERTY) continue;
            const jsProp = prop as JSProperty;
            // C-35c：`v-bind="obj"`（spread）不得作为 `__spread__` 属性输出
            if ((jsProp as { spread?: boolean }).spread === true) {
              const spreadCode = prefixIdentifiers(
                (jsProp.value as SimpleExpressionNode).content,
                itemLocals,
              );
              createBody += `for (const [_k, _v] of Object.entries(${spreadCode})) { ${elVar}.setAttribute(_k, _v); }`;
              updateBody += `for (const [_k, _v] of Object.entries(${spreadCode})) { _el.setAttribute(_k, _v); }`;
              continue;
            }
            if (
              !jsProp.key ||
              typeof jsProp.key === 'string' ||
              Array.isArray(jsProp.key) ||
              jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
              !jsProp.value ||
              typeof jsProp.value === 'string' ||
              Array.isArray(jsProp.value) ||
              jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
            ) {
              continue;
            }
            const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
            const value = (jsProp.value as SimpleExpressionNode).content;
            if (key === 'key') continue; // :key 不写为 DOM 属性
            // ⚠️ 旧判据「值里没有 `_ctx` / 没有 `(` 就算静态」会把 `:data-k="x"`
            //   写成字面量 `data-k="x"`（for08 实测）。静态只认**字面量**，
            //   其余一律按表达式处理并加前缀（循环变量在 locals 里保持裸名）。
            if (!isStaticPropValue(value)) {
              const valueCode = prefixIdentifiers(value, itemLocals);
              // 动态绑定：create 用新元素，update 用 reconcileArray 传入的已存在元素
              createBody += `${elVar}.setAttribute('${key}', ${valueCode});`;
              updateBody += `_el.setAttribute('${key}', ${valueCode});`;
            } else {
              // 静态属性
              createBody += `${elVar}.setAttribute('${key}', '${value.replace(/^"|"$/g, '')}');`;
            }
          }
        }

        createBody += `return ${elVar};`;
      }
    }

    // 提取 :key 绑定，缺省回退到 item.id（与优化版行为一致）
    let userKeyExpr: string | null = null;
    if (
      renderItem &&
      renderItem.props &&
      renderItem.props.type === NodeTypes.JS_OBJECT_EXPRESSION
    ) {
      const objExpr = renderItem.props as JSObjectExpression;
      for (const prop of objExpr.properties) {
        if (prop.type !== NodeTypes.JS_PROPERTY) continue;
        const jsProp = prop as JSProperty;
        if (
          jsProp.key &&
          typeof jsProp.key !== 'string' &&
          !Array.isArray(jsProp.key) &&
          jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
          jsProp.key.content.replace(/^["']|["']$/g, '') === 'key' &&
          jsProp.value &&
          typeof jsProp.value !== 'string' &&
          !Array.isArray(jsProp.value) &&
          jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
        ) {
          userKeyExpr = jsProp.value.content;
          break;
        }
      }
    }

    if (!userKeyExpr) {
      if (__DEV__) {
        console.warn(
          `[lytjs/compiler] v-for is missing a "key" attribute. ` +
            `This may cause performance issues and incorrect DOM updates. ` +
            `Add a unique :key binding to the v-for element, e.g., :key="item.id" or :key="index". ` +
            `See: https://lytjs.dev/guide/template-syntax.html#v-for-key`,
        );
      }
    }

    const keyExpr = userKeyExpr ?? `${itemVar}.id`;

    // `v-for` 与 `v-if` 同元素：v-if 等同一项过滤（被隐藏的项不创建 DOM，与 vnode 路径一致）。
    // filter 回调拿 (item, index)，因此条件里引用索引形参也成立。
    const sourceCode = prefixIdentifiers(source, locals);
    let listCode = sourceCode;
    if (itemCondition) {
      const cond =
        typeof itemCondition.test === 'string'
          ? itemCondition.test
          : getExpContent(itemCondition.test as SimpleExpressionNode);
      if (cond) {
        listCode = `(${sourceCode}).filter((${itemParams.join(', ')}) => (${prefixIdentifiers(cond, itemLocals)}))`;
      }
    }

    const options = `{
      key: (${itemParams.join(', ')}) => ${keyExpr},
      create: (${itemParams.join(', ')}) => {
        ${createBody}
      }${
        updateBody
          ? `,
      update: (_el, ${itemParams.join(', ')}) => {
        ${updateBody}
      }`
          : ''
      }
    }`;
    return { listCode, options };
  }
  return null;
}

/** 顶层 v-for：在 render 里直接 `effect(() => reconcileArray(...))`。 */
function processCallExpression(
  node: JSCallExpression,
  varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
  locals: ReadonlySet<string> = new Set(),
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);
  if (callee !== 'RENDER_LIST' && callee !== 'renderList') return;

  const binding = buildReconcileArrayCode(node, varCounter, locals);
  if (!binding) return;

  // 容器变量：render 的第二个形参叫 _container（见本文件 :164 生成的
  // `export function render(_ctx, _container)`）。此处曾写死 '_ul'，
  // 是为 ul/li 列表 demo 特判，换任何根容器都会产出 ReferenceError。
  const containerVar = parentVar ?? BASE_EMIT_PROFILE.containerParam;
  dynamicBindings.push({
    varName: containerVar,
    code: `effect(() => {\n    reconcileArray(${containerVar}, ${binding.listCode}, ${binding.options});\n  });`,
  });
}

// ============================================================
// Helper: 获取 test 表达式
// ============================================================

// ============================================================
// Helper: 从条件分支中提取元素信息
// ============================================================

function extractElementFromBranch(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): { tag: string } | null {
  if (!branch) return null;
  if (typeof branch === 'string') return null;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      const result = extractElementFromBranch(item);
      if (result) return result;
    }
    return null;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      // 组件分支的 tag 是标识符/表达式（不带引号）：它不是 HTML 标签，
      // 既不能进 elementVars（会生成非法变量名），也不需要静态兄弟锚点
      if (vnode.tag === '' || !/^["']/.test(vnode.tag)) return null;
      return { tag: vnode.tag.replace(/^"|"$/g, '') };
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return { tag: (branch as ElementNode).tag };
  }
  return null;
}

// ============================================================
// Helper: 从条件分支中提取插值文本
// ============================================================

/**
 * 从列表项的 children 提取文本表达式（支持**复合内容** `{{ a }}:{{ b }}`）。
 *
 * ⚠️ 2026-09-30 修复：列表项内容此前只认「children 直接是 TO_DISPLAY_STRING」的形态，
 * 而 `{{ k }}:{{ i }}` 在 transform 后是 COMPOUND_EXPRESSION，其孩子是
 * **INTERPOLATION** 节点（本仓 NodeTypes.INTERPOLATION = 4）与**代码片段字符串**
 * （如 `" + "`）⇒ 整段内容丢失。
 */
function extractItemChildrenText(children: unknown, locals: ReadonlySet<string>): string | null {
  if (children === undefined || children === null) return null;
  if (typeof children === 'string') return null;

  if (Array.isArray(children)) {
    const parts: string[] = [];
    for (const kid of children) {
      const r = extractItemChildrenText(kid, locals);
      if (r === null) return null;
      parts.push(r);
    }
    return parts.length ? parts.join('') : null;
  }

  const node = children as {
    type?: number;
    content?: unknown;
    callee?: unknown;
    arguments?: unknown[];
    children?: unknown[];
  };

  if (node.type === NodeTypes.COMPOUND_EXPRESSION) {
    // 孩子里**字符串就是代码片段**（如 `" + "` / `"':' "`），原样拼接
    if (!Array.isArray(node.children)) return null;
    const parts: string[] = [];
    for (const kid of node.children) {
      if (typeof kid === 'string') {
        parts.push(kid);
        continue;
      }
      const r = extractItemChildrenText(kid, locals);
      if (r === null) return null;
      parts.push(r);
    }
    return parts.length ? parts.join('') : null;
  }

  if (node.type === NodeTypes.INTERPOLATION) {
    const inner = node.content as { content?: unknown } | undefined;
    return typeof inner?.content === 'string' ? inner.content : null;
  }

  if (node.type === NodeTypes.SIMPLE_EXPRESSION) {
    const raw = node.content;
    if (typeof raw === 'string') return raw;
    const nested = (raw as { content?: unknown } | undefined)?.content;
    return typeof nested === 'string' ? nested : null;
  }

  if (node.type === NodeTypes.JS_CALL_EXPRESSION) {
    const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);
    if (callee === 'TO_DISPLAY_STRING' || callee === 'toDisplayString') {
      return extractItemChildrenText((node.arguments ?? [])[0], locals);
    }
    return null;
  }

  return null;
}

/** 列表项的 children 里是否有**嵌套元素**（`<li v-for><span>{{x}}</span></li>`）。 */

/**
 * `JS_CALL_EXPRESSION` 的 RENDER_LIST 调用（v-for 在 Signal 模式的 transform 产物）
 * → `...((source).map((item,i)=>vnode))`
 *
 * 结构（实测）：
 *   callee = 'RENDER_LIST'
 *   arguments = [ SIMPLE_EXPRESSION(source),
 *                 COMPOUND_EXPRESSION([ "(item, i) => { ", VNODE_CALL, " }" ]) ]
 *
 * **关键**：循环变量必须作为 `locals` 传给 `prefixIdentifiers`，否则 `item.id`
 * 会被误加前缀变成 `_ctx.item.id`。同样采用严格模式（失败即整体返回 null）。
 */
export function serializeListVNode(
  node: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return serializeListVNodeShared(node, locals, {
    vnodeCall: (n, scope) => serializeVNodeCall(n, prefix, scope),
    srcExpr: (exp, scope) => prefixIdentifiers(exp, scope),
  });
}

/**
 * `JS_CONDITIONAL_EXPRESSION`（v-if 在 Signal 模式的 transform 产物）→ `(cond ? vnode : null)`
 *
 * 返回 null 表示无法完整还原（此时调用方跳过，不下发半成品）。
 * v-else / v-else-if 分支暂不支持 —— 有 alternate 时同样返回 null。
 */
export function serializeConditionalVNode(
  node: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return serializeConditionalVNodeShared(node, locals, {
    vnodeCall: (n, scope) => serializeVNodeCall(n, prefix, scope),
    conditional: (n, scope) => serializeConditionalVNode(n, prefix, scope),
    testExpr: (exp, scope) => prefixIdentifiers(exp, scope),
  });
}

/**
 * `VNODE_CALL` → `createVNode(tag, props, children)`
 *
 * **严格模式**：任何一段无法识别都让整体返回 null（调用方跳过），
 * 避免"只渲染一半"这种比不渲染更危险的结果。
 */
export function serializeVNodeCall(
  vnode: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return serializeVNodeCallShared(vnode, locals, {
    vnode: 'createVNode',
    propValue: (exp, scope) => prefixIdentifiers(exp, scope),
    children: (ch, scope) => serializeVNodeCallChildren(ch, prefix, scope),
    // 组件 tag 是**裸名**（如 `Inner`）必须前缀化；HTML 标签已是 JSON 字符串（如 `"div"`）
    //
    // ⚠️ `<template>` 在 VNode 模式下编译成哨兵。signal 模式的目标同样是**运行时
    //   `Fragment`**（此前折回字面量 `template` 元素，导致 `<template v-if>` 静默空渲染、
    //   内容丢失）。哨兵不当作组件名，故不参与组件名校验。
    //   哨兵的 `isComponent` 实测为 false，故**必须先判哨兵**，否则会当普通标签透出。
    tag: (tag, isComponent) =>
      tag === FRAGMENT_SENTINEL ? 'Fragment' : isComponent ? `${prefix}${tag}` : tag,
  });
}

/** `VNODE_CALL.children` → 数组代码；无法完整识别返回 null */
export function serializeVNodeCallChildren(
  children: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return serializeVNodeCallChildrenShared(children, locals, {
    staticText: (text) => `createVNode(Text,null,${JSON.stringify(text)})`,
    child: (ch, scope) => serializeVNodeCallChild(ch, prefix, scope),
  });
}

/** 单个 child → vnode 代码；无法识别返回 null */
export function serializeVNodeCallChild(
  child: unknown,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return serializeVNodeCallChildShared(child, locals, {
    textVNode: (exp, scope) => `createVNode(Text,null,${prefixIdentifiers(exp, scope)})`,
    element: (el, scope) => serializeVNodeElement(el, prefix, scope),
    vnodeCall: (n, scope) => serializeVNodeCall(n, prefix, scope),
    conditional: (n, scope) => serializeConditionalVNode(n, prefix, scope),
    literalText: (code) => `createVNode(Text,null,${code})`,
    textExpression: (exp, scope) => prefixIdentifiers(exp, scope),
  });
}

/**
 * 判断子树中是否存在「带子内容的组件」（这类组件需要把子内容编译为插槽 vnode）
 */
function hasComponentWithChildren(children: TemplateChildNode[]): boolean {
  for (const child of children) {
    if (!child || child.type !== NodeTypes.ELEMENT) continue;
    const element = child as ElementNode;
    if (element.tagType === ElementTypes.COMPONENT && element.children.length > 0) return true;
    if (hasComponentWithChildren(element.children)) return true;
  }
  return false;
}

/**
 * 把组件的子内容编译为「插槽对象」字面量：`{default:()=>[vnode,...]}`
 *
 * 返回 null 表示没有可编译的子内容（此时不传第 4 个参数）。
 * 首版只覆盖**静态内容**（文本 / 元素 / 嵌套组件）；插值与指令仍不参与插槽编译。
 */
function buildComponentSlotsObject(
  node: ElementNode,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string | null {
  return buildComponentSlotsObjectShared(node, locals, (children, scope) =>
    collectSlotVNodes(children, prefix, scope),
  );
}

/** 递归收集子节点对应的 vnode 构造代码（跳过注释与动态内容） */
function collectSlotVNodes(
  children: TemplateChildNode[],
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string[] {
  return collectSlotVNodesShared(children, locals, {
    text: (text) => `createVNode(Text,null,${JSON.stringify(text)})`,
    interpolation: (exp) => `createVNode(Text,null,${prefixIdentifiers(exp, locals)})`,
    conditional: (node, scope) =>
      serializeConditionalVNode(node as JSConditionalExpression, prefix, scope),
    list: (node, scope) => serializeListVNode(node as JSCallExpression, prefix, scope),
    element: (el, scope) => serializeVNodeElement(el, prefix, scope),
  });
}

/** 单个元素 → `createVNode(tag, attrs, children)` */
function serializeVNodeElement(
  node: ElementNode,
  prefix: string,
  locals: ReadonlySet<string> = new Set(),
): string {
  return serializeVNodeElementShared(node, locals, {
    vnode: 'createVNode',
    propsObject: buildComponentPropsObject,
    componentTag: (tag) => `${prefix}${tag}`,
    slots: (el, scope) => buildComponentSlotsObject(el, prefix, scope),
    showExpr: (exp, scope) => prefixIdentifiers(exp, scope),
    collectChildren: (children, scope) => collectSlotVNodes(children, prefix, scope),
  });
}

/**
 * 判断子树中是否包含组件元素
 */
/**
 * 预扫：transformed AST 里是否存在**组件 vnode**。
 *
 * 为什么要单独写：此阶段 `v-for` 已被 transform 成 `RENDER_LIST` 的
 * `JS_CALL_EXPRESSION`（`children` 里不再有元素节点）⇒ 只走 `children` 的
 * `containsComponent` 找不到列表项里的组件；必须**连 `arguments` 一起走**。
 * 判据与列表分支一致：`VNODE_CALL` 的 `tag` 是**裸标识符**（元素是带引号字符串）。
 */
function containsComponentVNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(containsComponentVNode);
  const n = node as {
    type?: number;
    tag?: string;
    children?: unknown;
    arguments?: unknown;
    consequent?: unknown;
    alternate?: unknown;
  };
  if (
    n.type === NodeTypes.VNODE_CALL &&
    typeof n.tag === 'string' &&
    n.tag !== '' &&
    !/^["']/.test(n.tag)
  ) {
    return true;
  }
  return (
    containsComponentVNode(n.children) ||
    containsComponentVNode(n.arguments) ||
    // `v-if` 分支里的组件（如 `<my-comp v-if="ok"/>`）只出现在 consequent/alternate 上
    containsComponentVNode(n.consequent) ||
    containsComponentVNode(n.alternate)
  );
}

/**
 * 判定子树中是否存在「带子内容的列表项组件」—— 即出现在 RENDER_LIST / 条件表达式里的
 * 裸标识符 VNODE_CALL（组件）且带有 children（插槽内容）。
 * 这类构造需要引入 `createVNode` / `Text` 才能把子内容编译成插槽 vnode
 * （普通「直接 ELEMENT 子组件」由 hasComponentWithChildren 覆盖，而 v-for 项组件
 * 是 VNODE_CALL 形态，必须单独预扫）。
 */
function hasListComponentVNodeWithChildren(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasListComponentVNodeWithChildren);
  const n = node as { type?: number; tag?: string; children?: unknown; arguments?: unknown };
  if (
    n.type === NodeTypes.VNODE_CALL &&
    typeof n.tag === 'string' &&
    n.tag !== '' &&
    !/^["']/.test(n.tag)
  ) {
    const c = n.children;
    if (c !== undefined && c !== null && !(Array.isArray(c) && c.length === 0)) return true;
  }
  return (
    hasListComponentVNodeWithChildren(n.children) || hasListComponentVNodeWithChildren(n.arguments)
  );
}

function containsComponent(children: TemplateChildNode[]): boolean {
  for (const child of children) {
    if (!child || child.type !== NodeTypes.ELEMENT) continue;
    const element = child as ElementNode;
    if (element.tagType === ElementTypes.COMPONENT) return true;
    if (containsComponent(element.children)) return true;
  }
  return false;
}

/**
 * 构造传给组件的 props 对象字面量（`_ctx.` 前缀，与本 codegen 的前缀约定一致）
 */
function buildComponentPropsObject(
  node: ElementNode,
  locals: ReadonlySet<string> = new Set(),
): string {
  return buildComponentPropsObjectShared(node, locals, {
    expr: (raw, scope) => prefixIdentifiers(raw, scope),
  });
}
