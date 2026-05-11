// src/transform.ts
// AST 转换流水线 - 主入口
// 包含 transform、markConstants、hoistStatic、collectDynamicChildren
// optimize 阶段的逻辑已合并到此模块中

import { NodeTypes } from './constants';
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
  VNodeCall,
  ExpressionNode,
} from './types';
import { createSimpleExpression, createCallExpression, createArrayExpression } from './ast';
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

  // 以下原为 optimize 阶段的逻辑，现已合并到 transform 阶段
  // patchFlag 由 transform-element.ts 在 transform 过程中统一设置
  markConstants(root);
  hoistStatic(root);
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
      if (typeof exp === 'string') context.identifiers.add(exp);
      else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic)
        context.identifiers.add(exp.content);
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
  if (nodeTransforms) {
    const exitFns: Array<(() => void) | undefined> = [];
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
    for (let i = exitFns.length - 1; i >= 0; i--) {
      exitFns[i]?.();
      if (!context.currentNode) return;
    }
  }

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
      const hasInterpolation = hasDescendantInterpolation(element);

      if (!hasDirectives && !hasInterpolation) {
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

function hoistStatic(root: RootNode): void {
  const hoists: JSChildNode[] = [];
  const existingHoistsLen = root.hoists.length;

  walk(root.children, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      if (element.isStatic && element.codegenNode) {
        // 提升静态元素
        hoists.push(element.codegenNode);
        // 全局索引 = 已有提升 + 当前新提升数量 - 1
        element.codegenNode = createHoistedReference(existingHoistsLen + hoists.length - 1);
      }
    }
  });

  root.hoists = [...root.hoists, ...hoists];
}

function createHoistedReference(index: number): VNodeCall {
  return {
    type: NodeTypes.VNODE_CALL,
    tag: `_hoisted_${index + 1}`,
    props: undefined,
    children: undefined,
    patchFlag: undefined,
    dynamicProps: undefined,
    directives: undefined,
    isBlock: false,
    disableTracking: false,
    isComponent: false,
    loc: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
      source: '',
    },
  };
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

function hasDescendantInterpolation(element: ElementNode): boolean {
  for (const child of element.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      return true;
    }
    if (child.type === NodeTypes.ELEMENT) {
      if (hasDescendantInterpolation(child as ElementNode)) {
        return true;
      }
    }
  }
  return false;
}
