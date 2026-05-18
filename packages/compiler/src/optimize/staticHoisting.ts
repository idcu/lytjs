/**
 * @lytjs/compiler - Static Hoisting Optimization
 * 
 * Extracts static subtrees to reduce runtime overhead
 * 
 * FIX: P6.4-COMPILER-01 - Compile-time optimization
 */

import { NodeTypes } from '../constants';
import type {
  RootNode,
  ElementNode,
  TemplateChildNode,
  TextNode,
  CommentNode,
  InterpolationNode,
  DirectiveNode,
} from '../types';

// Mark which nodes are purely static
const STATIC_DIRECTIVES = new Set(['island']);

/**
 * Analyze the AST and mark static subtrees
 */
export function analyzeStatic(root: RootNode): {
  staticNodes: Map<number, TemplateChildNode[]>;
  dynamicNodes: TemplateChildNode[];
} {
  const staticNodes = new Map<number, TemplateChildNode[]>();
  const dynamicNodes: TemplateChildNode[] = [];
  let staticId = 0;

  for (const child of root.children) {
    if (isStaticNode(child)) {
      const group = staticNodes.get(staticId) || [];
      group.push(child);
      staticNodes.set(staticId, group);
    } else {
      // If we have accumulated static nodes, increment the id
      if (staticNodes.has(staticId)) {
        staticId++;
      }
      dynamicNodes.push(child);
    }
  }

  return { staticNodes, dynamicNodes };
}

/**
 * Check if a node is completely static (no dynamic bindings)
 */
export function isStaticNode(node: TemplateChildNode): boolean {
  switch (node.type) {
    case NodeTypes.TEXT:
      return true;
    case NodeTypes.COMMENT:
      return true;
    case NodeTypes.ELEMENT: {
      const el = node as ElementNode;
      // Check if any props are dynamic
      for (const prop of el.props) {
        if (prop.type === NodeTypes.DIRECTIVE) {
          const dir = prop as DirectiveNode;
          // Skip static directives like v-island (doesn't affect rendering)
          if (!STATIC_DIRECTIVES.has(dir.name)) {
            return false;
          }
        }
      }
      // Check if any children are dynamic
      for (const child of el.children) {
        if (!isStaticNode(child)) {
          return false;
        }
      }
      return true;
    }
    case NodeTypes.INTERPOLATION:
      return false;
    case NodeTypes.JS_CALL_EXPRESSION:
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
    case NodeTypes.VNODE_CALL:
      return false;
    default:
      return true;
  }
}

/**
 * Extract static text content from a node tree
 */
export function extractStaticText(node: TemplateChildNode): string {
  if (node.type === NodeTypes.TEXT) {
    return (node as TextNode).content;
  }
  if (node.type === NodeTypes.COMMENT) {
    return `<!--${(node as CommentNode).content}-->`;
  }
  if (node.type === NodeTypes.ELEMENT) {
    const el = node as ElementNode;
    let result = `<${el.tag}`;
    // Add static attributes
    for (const prop of el.props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        if (prop.value) {
          result += ` ${prop.name}="${escapeHtml(prop.value.content)}"`;
        } else {
          result += ` ${prop.name}`;
        }
      }
    }
    result += '>';
    // Add children
    for (const child of el.children) {
      result += extractStaticText(child);
    }
    result += `</${el.tag}>`;
    return result;
  }
  return '';
}

/**
 * Escape HTML for safe stringification
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
