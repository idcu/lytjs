// src/transform.ts
// AST transform pipeline - main entry
// 包含 transform、markConstants、hoistStatic、collectDynamicChildren
// optimize 阶段的逻辑已合并到此模块中

import { NodeTypes } from "./constants";
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
} from "./types";
import {
  createSimpleExpression,
  createCallExpression,
  createArrayExpression,
} from "./ast";
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
  isJS,
} from "./transforms";

// ============================================================
// Main transform function
// ============================================================

export function transform(
  root: RootNode,
  options: TransformOptions = {},
): void {
  const context = createTransformContext(root, options);
  traverseNode(root, context, options);

  // Copy context data to root
  root.helpers = Array.from(context.helpers.keys());
  root.components = Array.from(context.components);
  root.directives = Array.from(context.directives);
  root.hoists = context.hoists;
  root.temps = context.temps;
  root.cached = context.cached;

  // Create root codegen node
  if (root.children.length === 1) {
    const child = root.children[0];
    if (child) {
      if (
        child.type === NodeTypes.ELEMENT &&
        (child as ElementNode).codegenNode
      ) {
        root.codegenNode = (child as ElementNode).codegenNode as JSChildNode;
      } else if (child.type === NodeTypes.TEXT) {
        root.codegenNode = child as unknown as JSChildNode;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        root.codegenNode = createCallExpression(
          context.helper("TO_DISPLAY_STRING"),
          [(child as InterpolationNode).content],
        );
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
      root.codegenNode = createCallExpression(context.helper("CREATE_VNODE"), [
        createSimpleExpression("Fragment", true),
        createSimpleExpression("null", true),
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
// Create Transform Context
// ============================================================

function createTransformContext(
  root: RootNode,
  options: TransformOptions,
): TransformContext {
  const helpers = new Map<string, number>();
  const components = new Set<string>();
  const directives = new Set<string>();
  let currentNode: RootNode | TemplateChildNode | null = root;

  const context: TransformContext = {
    self: null as unknown as TransformContext,
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
        const idx = parent.children.indexOf(
          context.currentNode as TemplateChildNode,
        );
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
      if (typeof exp === "string") context.identifiers.add(exp);
      else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic)
        context.identifiers.add(exp.content);
    },
    removeIdentifiers(exp: ExpressionNode | string): void {
      if (typeof exp === "string") context.identifiers.delete(exp);
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
    error(msg: string, _node?: BaseNode): void {
      // 优先调用 options.onError 回调，否则直接抛出错误
      if (options.onError) {
        options.onError(new Error(`[lytjs/compiler] ${msg}`));
      } else {
        throw new Error(`[lytjs/compiler] ${msg}`);
      }
    },
  };
  context.self = context;
  return context;
}

// ============================================================
// Traverse Node
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
// Default transforms
// ============================================================

export const builtInTransforms: NodeTransform[] = [
  transformIf as NodeTransform,
  transformFor as NodeTransform,
  transformOnce as NodeTransform,
  transformElement as unknown as NodeTransform,
];

export const builtInDirectiveTransforms: Record<string, DirectiveTransform> = {
  bind: transformBind,
  on: transformOn,
  model: transformModel,
  show: transformShow,
};

// Re-export individual transforms for backward compatibility
export {
  transformElement,
  transformIf,
  transformFor,
  transformOnce,
  transformSlot,
};
export { transformBind, transformOn, transformModel, transformShow };

// ============================================================
// Mark Constants (原 optimize.ts)
// ============================================================

function markConstants(root: RootNode): void {
  walk(root.children, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      // An element is constant if:
      // 1. It has no directives
      // 2. All its attributes are static
      // 3. All its children are constant (including descendants)
      const hasDirectives = element.props.some(
        (p) => p.type === NodeTypes.DIRECTIVE,
      );
      const hasDynamicBindings = element.props.some(
        (p) =>
          p.type === NodeTypes.DIRECTIVE &&
          (p.name === "bind" || p.name === "on"),
      );
      const hasInterpolation = hasDescendantInterpolation(element);

      if (!hasDirectives && !hasDynamicBindings && !hasInterpolation) {
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

  walk(root.children, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      if (element.isStatic && element.codegenNode) {
        // Hoist static elements
        hoists.push(element.codegenNode);
        element.codegenNode = createHoistedReference(hoists.length - 1);
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
      start: { line: 0, column: 0, offset: 0 },
      end: { line: 0, column: 0, offset: 0 },
      source: "",
    },
  };
}

// ============================================================
// Collect Dynamic Children - Block Tree (原 optimize.ts)
// ============================================================

function collectDynamicChildren(root: RootNode): void {
  // Find the root element and collect its dynamic children
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
  for (const child of element.children) {
    if (child.type === NodeTypes.ELEMENT) {
      const childElement = child as ElementNode;

      if (!childElement.isStatic) {
        if (childElement.codegenNode) {
          element.dynamicChildren!.push(childElement.codegenNode);
        }
        // 递归收集：为子元素自身也建立 dynamicChildren，
        // 确保嵌套动态节点（如嵌套 v-for）的 Block Tree 完整
        childElement.dynamicChildren = [];
        collectDynamicChildrenFromElement(childElement);
      }
    }
  }
}

// ============================================================
// Walk helper (原 optimize.ts)
// ============================================================

function walk(
  nodes: TemplateChildNode[],
  fn: (node: TemplateChildNode) => void,
): void {
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
