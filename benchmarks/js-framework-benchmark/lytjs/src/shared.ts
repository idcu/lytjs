/**
 * Lyt.js js-framework-benchmark - Shared Utilities
 *
 * Provides common data generation and utility functions
 * used by both keyed and non-keyed benchmarks.
 */

// ============================================================
// Data Generation
// ============================================================

/**
 * Build an array of N items for the benchmark
 * Each item has: id (number), label (string)
 */
export function buildData(count: number): Array<{ id: number; label: string }> {
  const data: Array<{ id: number; label: string }> = []
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      label: `Row ${i + 1}`,
    })
  }
  return data
}

/**
 * Generate a new row ID (max existing id + 1)
 */
export function getNextId(data: Array<{ id: number; label: string }>): number {
  let max = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i].id > max) max = data[i].id
  }
  return max + 1
}

// ============================================================
// Minimal DOM Mock (for Node.js test environment)
// ============================================================

/**
 * Create a mock DOM element for testing
 */
export interface MockElement {
  tagName: string
  nodeType: number
  childNodes: MockElement[]
  parentNode: MockElement | null
  firstChild: MockElement | null
  lastChild: MockElement | null
  nextSibling: MockElement | null
  textContent: string
  innerHTML: string
  className: string
  id: string
  style: Record<string, string>
  attributes: Record<string, string>
  eventListeners: Record<string, Function[]>
  dataset: Record<string, string>
  children: MockElement[]
}

export function createMockElement(tag: string): MockElement {
  return {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    childNodes: [],
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    textContent: '',
    innerHTML: '',
    className: '',
    id: '',
    style: {},
    attributes: {},
    eventListeners: {},
    dataset: {},
    children: [],
  }
}

export function createMockTextNode(text: string): MockElement {
  return {
    tagName: '#text',
    nodeType: 3,
    childNodes: [],
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    textContent: text,
    innerHTML: text,
    className: '',
    id: '',
    style: {},
    attributes: {},
    eventListeners: {},
    dataset: {},
    children: [],
  }
}

// ============================================================
// Minimal Renderer (for benchmark runtime)
// ============================================================

/**
 * Minimal VNode interface for the benchmark renderer
 */
export interface BVNode {
  type: string
  props: Record<string, any> | null
  children: string | BVNode[] | null
  key: string | number | null
  el: any
}

/**
 * Create a VNode (minimal h function for benchmark)
 */
export function bh(
  type: string,
  props?: Record<string, any> | null,
  children?: string | BVNode[] | null
): BVNode {
  const key = props?.key ?? null
  let cleanProps = props
  if (props && 'key' in props) {
    const { key: _k, ...rest } = props
    cleanProps = rest
  }
  return {
    type,
    props: cleanProps || null,
    children: children || null,
    key,
    el: null,
  }
}

/**
 * Mount a VNode tree into a container (real or mock DOM)
 */
export function mountVNode(vnode: BVNode, container: any): void {
  const el = createElement(vnode)
  vnode.el = el
  if (container.appendChild) {
    container.appendChild(el)
  } else if (container.insert) {
    container.insert(el)
  }
}

/**
 * Create a real DOM element from a VNode
 */
function createElement(vnode: BVNode): any {
  if (typeof vnode.type === 'string') {
    const el = document.createElement(vnode.type)
    applyProps(el, vnode.props)
    if (typeof vnode.children === 'string') {
      el.appendChild(document.createTextNode(vnode.children))
    } else if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        const childEl = createElement(child)
        child.el = childEl
        el.appendChild(childEl)
      }
    }
    return el
  }
  return null
}

/**
 * Apply props to a DOM element
 */
function applyProps(el: any, props: Record<string, any> | null): void {
  if (!props) return
  for (const key of Object.keys(props)) {
    const val = props[key]
    if (key === 'className') {
      el.className = val
    } else if (key === 'style' && typeof val === 'object') {
      for (const s in val) {
        el.style[s] = val[s]
      }
    } else if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, val)
    } else if (key === 'href' || key === 'id') {
      el.setAttribute(key, val)
    } else {
      el.setAttribute(key, val)
    }
  }
}

/**
 * Unmount a VNode tree - remove from DOM
 */
export function unmountVNode(container: any): void {
  if (container.innerHTML !== undefined) {
    container.innerHTML = ''
  } else if (container.childNodes) {
    container.childNodes.length = 0
  }
}

/**
 * Count child elements in a container (for testing)
 */
export function countRows(container: any): number {
  if (container.querySelectorAll) {
    return container.querySelectorAll('tr').length
  }
  if (container.childNodes) {
    return container.childNodes.length
  }
  return 0
}

/**
 * Get the selected row ID from container (for testing)
 */
export function getSelectedRowId(container: any): number | null {
  if (container.querySelector) {
    const selected = container.querySelector('.danger')
    if (selected) {
      const parent = selected.closest('tr')
      if (parent) {
        const idAttr = parent.querySelector('.id-col')
        if (idAttr) return parseInt(idAttr.textContent, 10)
      }
    }
  }
  return null
}
