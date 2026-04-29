/**
 * @lytjs/renderer - SSR Renderer
 * Server-side rendering to string
 */

import type { VNode } from '@lytjs/vdom'
import { Fragment, Text, ShapeFlags, getVNodeProps } from '@lytjs/vdom'
import { isString, isArray, isObject, isFunction, isNullish } from '@lytjs/common-is'
import { escapeHtml, isBooleanAttr, isVoidElement } from '../utils'

// ============================================================
// Helpers
// ============================================================

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// ============================================================
// renderToString - main entry
// ============================================================

export interface SSRInput {
  vnode: VNode
}

/**
 * Render a VNode to an HTML string (async for future Suspense support)
 */
export async function renderToString(input: SSRInput): Promise<string> {
  return renderVNodeToString(input.vnode)
}

// ============================================================
// renderVNodeToString
// ============================================================

function renderVNodeToString(vnode: VNode): string {
  const { type, shapeFlag, children } = vnode

  // Handle Fragment
  if (type === Fragment) {
    return renderFragmentToString(vnode)
  }

  // Handle Text
  if (type === Text) {
    const text = isFunction(children) ? '' : String(children ?? '')
    return escapeHtml(text)
  }

  // Handle Comment
  if (type === Comment) {
    const text = isFunction(children) ? '' : String(children ?? '')
    return `<!--${text}-->`
  }

  // Handle Element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return renderElementToString(vnode)
  }

  return ''
}

// ============================================================
// renderFragmentToString
// ============================================================

function renderFragmentToString(vnode: VNode): string {
  const children = vnode.children
  if (isArray(children)) {
    return children
      .map((child) => (child != null ? renderVNodeToString(child) : ''))
      .join('')
  }
  return ''
}

// ============================================================
// renderElementToString
// ============================================================

function renderElementToString(vnode: VNode): string {
  const tag = vnode.type as string
  const props = getVNodeProps(vnode) ?? {}
  const { shapeFlag, children } = vnode

  // Build opening tag with attributes
  let html = `<${tag}`

  // Render props as attributes
  for (const key in props) {
    if (key === 'key' || key === 'ref') continue
    html += renderAttributeToString(key, props[key])
  }

  // Self-closing elements
  if (isVoidElement(tag)) {
    html += ' />'
    return html
  }

  html += '>'

  // Render children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = isFunction(children) ? '' : String(children ?? '')
    html += escapeHtml(text)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN && isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child != null) {
        html += renderVNodeToString(child)
      }
    }
  }

  html += `</${tag}>`
  return html
}

// ============================================================
// renderAttributeToString
// ============================================================

function renderAttributeToString(key: string, value: unknown): string {
  // Skip null/undefined
  if (isNullish(value)) return ''

  // Skip event handlers
  if (/^on[A-Z]/.test(key)) return ''

  // Class handling
  if (key === 'class') {
    const classValue = value == null ? '' : String(value)
    if (!classValue) return ''
    return ` class="${escapeHtml(classValue)}"`
  }

  // Style handling
  if (key === 'style') {
    if (isString(value)) {
      if (!value) return ''
      return ` style="${escapeHtml(value)}"`
    }
    if (isObject(value)) {
      const styles: string[] = []
      for (const k in value as Record<string, unknown>) {
        const val = (value as Record<string, unknown>)[k]
        if (val != null && val !== '') {
          styles.push(`${camelToKebab(k)}:${String(val)}`)
        }
      }
      if (styles.length === 0) return ''
      return ` style="${escapeHtml(styles.join(';'))}"`
    }
    return ''
  }

  // Boolean attributes
  if (isBooleanAttr(key)) {
    if (value === false || value === '') return ''
    return ` ${key}`
  }

  // Regular attributes
  return ` ${key}="${escapeHtml(String(value))}"`
}
