/**
 * @lytjs/renderer - Shared utilities
 *
 * This module provides shared utility functions used across the renderer package,
 * including HTML escaping, boolean attribute detection, and void element checks.
 * It re-exports selected utilities from @lytjs/common-string for convenience.
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
