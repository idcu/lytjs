// src/transform.ts
// AST transform pipeline - main entry

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
    addIdentifiers(exp: any): void {
      if (typeof exp === "string") context.identifiers.add(exp);
      else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic)
        context.identifiers.add(exp.content);
    },
    removeIdentifiers(exp: any): void {
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
