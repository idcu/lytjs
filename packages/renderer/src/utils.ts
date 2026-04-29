/**
 * @lytjs/renderer - Shared utilities
 */

import { escapeHTML as escapeHtml } from '@lytjs/common-string'

export { escapeHtml }

// ============================================================
// Boolean attribute list
// ============================================================

const BOOLEAN_ATTRS = new Set([
  'disabled',
  'readonly',
  'checked',
  'selected',
  'multiple',
  'autofocus',
  'async',
  'defer',
  'controls',
  'loop',
  'muted',
  'default',
  'open',
  'required',
  'reversed',
  'allowfullscreen',
])

/**
 * Check if a key is a boolean HTML attribute
 */
export function isBooleanAttr(key: string): boolean {
  return BOOLEAN_ATTRS.has(key)
}

// ============================================================
// Self-closing elements
// ============================================================

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Check if a tag is a void (self-closing) element
 */
export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag)
}
