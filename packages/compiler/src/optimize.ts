// src/optimize.ts
// AST optimizer - hoist static subtrees, mark constants, patch flags

import { NodeTypes, PatchFlags } from './constants';
import type {
  RootNode,
  ElementNode,
  TextNode,
  TemplateChildNode,
  JSChildNode,
  VNodeCall,
  CompilerOptions,
} from './types';

// ============================================================
// Main optimize function
// ============================================================

export function optimize(root: RootNode, _options: CompilerOptions = {}): void {
  // First, mark constants
  markConstants(root);

  // Then, hoist static subtrees
  hoistStatic(root);

  // Then, mark patch flags on dynamic nodes
  markPatchFlags(root);

  // Finally, collect dynamic children for Block Tree
  collectDynamicChildren(root);
}

// ============================================================
// Mark Constants
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
        (p) => p.type === NodeTypes.DIRECTIVE && (p.name === 'bind' || p.name === 'on'),
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
// Hoist Static
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
      source: '',
    },
  };
}

// ============================================================
// Mark Patch Flags
// ============================================================

function markPatchFlags(root: RootNode): void {
  walk(root.children, (node) => {
    if (node.type === NodeTypes.ELEMENT) {
      const element = node as ElementNode;

      if (element.isStatic) return;

      // Check for dynamic content
      const hasDynamicProps = element.props.some(
        (p) =>
          p.type === NodeTypes.DIRECTIVE &&
          (p.name === 'bind' || p.name === 'on' || p.name === 'model'),
      );

      const hasInterpolation = element.children.some(
        (c) => c.type === NodeTypes.INTERPOLATION,
      );

      if (hasDynamicProps) {
        element.patchFlag = PatchFlags.FULL_PROPS;
      } else if (hasInterpolation) {
        element.patchFlag = PatchFlags.TEXT;
      }

      // Also set patch flag on codegenNode
      if (element.codegenNode && element.codegenNode.type === NodeTypes.VNODE_CALL) {
        const vnodeCall = element.codegenNode as VNodeCall;
        if (element.patchFlag) {
          vnodeCall.patchFlag = String(element.patchFlag);
        }
      }
    }
  });
}

// ============================================================
// Collect Dynamic Children (Block Tree)
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
// Walk helper
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
