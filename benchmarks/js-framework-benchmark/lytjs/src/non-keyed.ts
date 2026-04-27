/**
 * Lyt.js js-framework-benchmark - Non-Keyed Benchmark
 *
 * Same as keyed benchmark but without keys on list items.
 * Uses Lyt.js h() function to create VNodes (without key on <tr>).
 * Performs unkeyed diff (index-based comparison).
 *
 * Operations are identical to the keyed benchmark.
 */

import { h } from '@lytjs/core'
import { buildData, getNextId, resetId } from './shared'

// ============================================================
// VNode Interface (compatible with @lytjs/core h() output)
// ============================================================

interface VNode {
  type: string | object | symbol
  props: Record<string, any> | null
  children: string | VNode[] | null
  key: string | number | null
  ref: any
  shapeFlag: number
  el: any
  component: any
}

// ============================================================
// Lightweight VDOM Renderer (works with mock DOM and real DOM)
// ============================================================

/**
 * Create a real (or mock) DOM element from a VNode
 */
function createDOMElement(vnode: VNode): any {
  if (typeof vnode.type === 'string') {
    const el = document.createElement(vnode.type)
    applyProps(el, vnode.props)
    if (typeof vnode.children === 'string') {
      el.appendChild(document.createTextNode(vnode.children))
    } else if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        const childEl = createDOMElement(child)
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
 * Mount a VNode tree into a container element
 */
function mountVNode(vnode: VNode, container: any): void {
  const el = createDOMElement(vnode)
  vnode.el = el
  container.appendChild(el)
}

/**
 * Unmount a VNode tree - remove from DOM
 */
function unmountVNode(container: any): void {
  if (container.innerHTML !== undefined) {
    container.innerHTML = ''
  } else if (container.childNodes) {
    container.childNodes.length = 0
  }
}

// ============================================================
// State
// ============================================================

let data: Array<{ id: number; label: string }> = []
let selected: number | null = null
let container: any = null

// ============================================================
// Render Function (creates VNode tree using Lyt.js h() - NO keys)
// ============================================================

/**
 * Build the complete table VNode tree using Lyt.js h() function.
 * Each row <tr> does NOT have a key - this is the non-keyed variant.
 */
function renderTable(): VNode {
  const rows: VNode[] = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const isSelected = selected === item.id
    // Note: NO key attribute on <tr> - this is the non-keyed variant
    rows.push(
      h('tr', null, [
        h('td', { className: 'id-col' }, String(item.id)),
        h('td', { className: 'label-col' }, [
          h('a', { href: '#' }, item.label),
        ]),
        h('td', {
          className: isSelected ? 'danger' : '',
        }, [
          h('a', {
            href: '#',
            onClick: (e: any) => {
              e.preventDefault()
              selected = item.id
              rerender()
            },
          }, 'Select'),
        ]),
      ]) as VNode,
    )
  }

  return h('table', { className: 'table table-striped table-bordered' }, [
    h('thead', null, [
      h('tr', null, [
        h('th', null, 'id'),
        h('th', null, 'label'),
        h('th', null, ''),
      ]),
    ]),
    h('tbody', null, rows),
  ]) as VNode
}

/**
 * Re-render the table into the container (full re-render for non-keyed)
 */
function rerender(): void {
  if (!container) return
  unmountVNode(container)
  const vnode = renderTable()
  mountVNode(vnode, container)
}

// ============================================================
// Benchmark API
// ============================================================

/**
 * Create the non-keyed benchmark instance
 */
export function createElement(id: string): { container: any; destroy: () => void } {
  container = document.getElementById(id)
  data = []
  selected = null
  resetId()
  return {
    container,
    destroy: () => {
      unmountVNode(container)
      data = []
      selected = null
      container = null
    },
  }
}

/**
 * Run the non-keyed benchmark - build 1000 rows
 */
export function runBenchmark(): void {
  data = buildData(1000)
  selected = null
  rerender()
}

/**
 * Add one row at the bottom
 */
export function addRow(): void {
  const nextId = getNextId(data)
  data.push({ id: nextId, label: `Row ${nextId}` })
  rerender()
}

/**
 * Update every 10th row (change label)
 */
export function updateEvery10thRow(): void {
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 10 === 0) {
      data[i].label += ' !!!'
    }
  }
  rerender()
}

/**
 * Swap row 1 and row 2 (indices 0 and 1)
 */
export function swapRows(): void {
  if (data.length < 2) return
  const temp = data[0]
  data[0] = data[1]
  data[1] = temp
  rerender()
}

/**
 * Remove the last row
 */
export function removeRow(): void {
  if (data.length === 0) return
  data.pop()
  rerender()
}

/**
 * Select a row by index
 */
export function selectRow(index: number): void {
  if (index < 0 || index >= data.length) return
  selected = data[index].id
  rerender()
}

/**
 * Get current data (for testing)
 */
export function getData(): Array<{ id: number; label: string }> {
  return data
}

/**
 * Get selected ID (for testing)
 */
export function getSelected(): number | null {
  return selected
}
