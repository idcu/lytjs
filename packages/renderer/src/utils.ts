/**
 * @lytjs/renderer - Shared utilities
 */

// ============================================================
// HTML escaping for SSR
// ============================================================

const escapeRe = /[&<>"']/g

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape HTML special characters in a string
 */
export function escapeHtml(str: string): string {
  return str.replace(escapeRe, (match) => escapeMap[match]!)
}

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
