// src/transforms/scoped.ts
// CSS Scoped transform - adds scopeId attribute to elements and handles v-deep / :slotted()

import { NodeTypes } from '../constants';
import type {
  NodeTransform,
  TransformContext,
  ElementNode,
  DirectiveNode,
} from '../types';
import { createAttribute, createText } from '../ast';

/**
 * Extended TransformContext that includes scopeId.
 * The scopeId is set by the compiler when processing scoped components.
 */
interface ScopedTransformContext extends TransformContext {
  scopeId?: string;
}

/**
 * Get the scopeId from the transform context.
 * The scopeId may be stored directly on the context or in context.identifiers
 * as a special marker.
 */
function resolveScopeId(context: TransformContext): string | undefined {
  // Check for scopeId stored directly on the context
  const scopedCtx = context as ScopedTransformContext;
  if (scopedCtx.scopeId) {
    return scopedCtx.scopeId;
  }
  return undefined;
}

/**
 * Transform that adds scopeId attributes to all element nodes.
 *
 * This is the core of CSS Scoped styles:
 * - Each element in a scoped component gets a `data-v-xxxx` attribute
 * - The compiler also transforms the CSS selectors to include `[data-v-xxxx]`
 * - This ensures styles only apply to elements within the same component
 *
 * Additionally handles:
 * - `v-deep` directive: converts to `[data-v-xxxx]` selector prefix for deep selectors
 * - `:slotted()` pseudo-class: marks slotted content selectors
 */
export const transformScoped: NodeTransform = (
  node,
  context,
) => {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const scopeId = resolveScopeId(context);

  if (!scopeId) return;

  // Add scopeId as an attribute to the element
  // e.g., data-v-abc123=""
  const scopeAttr = createAttribute(scopeId, createText(''));
  element.props.push(scopeAttr);

  // Mark the scopeId on the element node itself (for codegen reference)
  element.scopeId = scopeId;

  // Process v-deep directives on child elements
  processVDeep(element, scopeId, context);
};

/**
 * Process v-deep directives within an element's children.
 *
 * v-deep is used to target nested elements that are not part of the
 * current component's template (e.g., child component roots).
 *
 * The v-deep directive is converted to a marker attribute that
 * the CSS scoping system uses to generate `[data-v-xxxx] _selector_` rules.
 */
function processVDeep(
  element: ElementNode,
  scopeId: string,
  _context: TransformContext,
): void {
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    if (!child) continue;
    if (child.type === NodeTypes.ELEMENT) {
      const childElement = child as ElementNode;

      // Check for v-deep directive
      const vDeepDir = childElement.props.find(
        (p): p is DirectiveNode =>
          p.type === NodeTypes.DIRECTIVE && p.name === 'deep',
      );

      if (vDeepDir) {
        // Remove the v-deep directive from props
        const dirIndex = childElement.props.indexOf(vDeepDir);
        if (dirIndex !== -1) {
          childElement.props.splice(dirIndex, 1);
        }

        // Add the v-deep marker attribute
        // The CSS scoping system will use this to generate deep selectors
        const deepAttr = createAttribute(`${scopeId}-deep`, createText(''));
        childElement.props.push(deepAttr);
      }

      // Recurse into child elements to handle deeply nested v-deep
      processVDeep(childElement, scopeId, _context);
    }
  }
}

/**
 * Check if an element has a v-deep directive.
 */
export function hasVDeep(element: ElementNode): boolean {
  return element.props.some(
    (p): p is DirectiveNode =>
      p.type === NodeTypes.DIRECTIVE && p.name === 'deep',
  );
}

/**
 * Get the scopeId from the transform context.
 */
export function getScopeId(context: TransformContext): string | undefined {
  return resolveScopeId(context);
}
