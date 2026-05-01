/**
 * @lytjs/renderer - Shared utilities
 */

import { escapeHtml, isBooleanAttr, VOID_ELEMENTS } from "@lytjs/common-string";

export { escapeHtml, isBooleanAttr };

// ============================================================
// Self-closing elements
// ============================================================

/**
 * Check if a tag is a void (self-closing) element
 */
export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag);
}
