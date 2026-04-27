/**
 * Lyt.js js-framework-benchmark - Keyed Benchmark
 *
 * Implements the standard keyed benchmark for js-framework-benchmark.
 * Uses Lyt.js h() function to create VNodes and a lightweight VDOM
 * renderer that performs keyed diffing.
 *
 * Operations:
 * - runBenchmark(): Create 1000 rows
 * - addRow(): Add one row at bottom
 * - updateEvery10thRow(): Update every 10th row (label += ' !!!')
 * - swapRows(): Swap rows 1 and 2 (indices 0 and 1)
 * - removeRow(): Remove last row
 * - selectRow(index): Select row at given index
 * - createElement(id): Initialize benchmark with container
 * - getData(): Get current data array
 * - getSelected(): Get selected row id
 * - destroy(): Clean up
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
 * Mount a VNode tree into a container element
 */
function mountVNode(vnode: VNode, container: any): void {
  const el = createDOMElement(vnode)
  vnode.el = el
  container.appendChild(el)
}

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
// Keyed Diff Algorithm
// ============================================================

/**
 * Perform a keyed diff between the current DOM state and the new VNode tree.
 *
 * Uses a key -> DOM element map for efficient keyed diffing:
 * - New items: create and insert
 * - Removed items: remove from DOM
 * - Moved items: use insertBefore to reorder
 * - Updated items: patch text content and className in place
 */
function keyedPatch(
  container: any,
  oldVNode: VNode | null,
  newVNode: VNode,
): void {
  // Get tbody from old or new VNode
  const newTbody = findTbody(newVNode)
  const oldTbody = oldVNode ? findTbody(oldVNode) : null

  if (!newTbody) return

  // If no old vnode, do a full mount
  if (!oldVNode || !oldTbody) {
    // Clear container and mount new tree
    container.innerHTML = ''
    mountVNode(newVNode, container)
    return
  }

  // Build new row VNodes keyed by id
  const newRows = newTbody.children as VNode[]
  const oldRows = oldTbody.children as VNode[]

  // Build key -> VNode maps
  const oldKeyMap = new Map<number, VNode>()
  for (let i = 0; i < oldRows.length; i++) {
    const row = oldRows[i]
    if (row.key !== null && row.key !== undefined) {
      oldKeyMap.set(row.key as number, row)
    }
  }

  const newKeyMap = new Map<number, VNode>()
  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i]
    if (row.key !== null && row.key !== undefined) {
      newKeyMap.set(row.key as number, row)
    }
  }

  const tbodyEl = oldTbody.el

  // Preserve el references on structural VNodes
  newVNode.el = oldVNode.el
  newTbody.el = oldTbody.el

  // Step 1: Remove rows that are no longer in the new data
  for (const [key, oldRow] of oldKeyMap) {
    if (!newKeyMap.has(key)) {
      if (oldRow.el && oldRow.el.parentNode) {
        oldRow.el.parentNode.removeChild(oldRow.el)
      }
    }
  }

  // Step 2: Iterate through new rows, create/patch/reorder
  for (let i = 0; i < newRows.length; i++) {
    const newRow = newRows[i]
    const rowKey = newRow.key as number
    const oldRow = oldKeyMap.get(rowKey)

    if (oldRow) {
      // Existing row: patch in place
      patchRowVNode(oldRow, newRow)
      // Reorder if needed
      const nextRef = i < newRows.length - 1
        ? (oldKeyMap.get(newRows[i + 1].key as number)?.el ?? null)
        : null

      if (nextRef !== null) {
        if (oldRow.el.nextSibling !== nextRef) {
          if (oldRow.el.parentNode) {
            oldRow.el.parentNode.removeChild(oldRow.el)
          }
          tbodyEl.insertBefore(oldRow.el, nextRef)
        }
      } else {
        // Move to end
        if (oldRow.el.nextSibling !== null) {
          if (oldRow.el.parentNode) {
            oldRow.el.parentNode.removeChild(oldRow.el)
          }
          tbodyEl.appendChild(oldRow.el)
        }
      }
    } else {
      // New row: create and insert
      const trEl = createDOMElement(newRow)
      newRow.el = trEl

      // Find next reference element
      let nextRef: any = null
      for (let j = i + 1; j < newRows.length; j++) {
        const refRow = oldKeyMap.get(newRows[j].key as number)
        if (refRow && refRow.el) {
          nextRef = refRow.el
          break
        }
      }

      if (nextRef) {
        tbodyEl.insertBefore(trEl, nextRef)
      } else {
        tbodyEl.appendChild(trEl)
      }
    }
  }
}

/**
 * Patch an existing row VNode with new content
 */
function patchRowVNode(oldRow: VNode, newRow: VNode): void {
  const oldTds = (oldRow.children as VNode[])
  const newTds = (newRow.children as VNode[])

  newRow.el = oldRow.el

  for (let i = 0; i < newTds.length; i++) {
    if (i < oldTds.length) {
      patchElement(oldTds[i], newTds[i])
    }
  }
}

/**
 * Patch an element VNode (td, a, etc.)
 */
function patchElement(oldVNode: VNode, newVNode: VNode): void {
  if (!oldVNode.el) return

  newVNode.el = oldVNode.el

  // Patch props (className)
  const oldProps = oldVNode.props || {}
  const newProps = newVNode.props || {}

  for (const key in newProps) {
    if (oldProps[key] !== newProps[key]) {
      if (key === 'className') {
        oldVNode.el.className = newProps[key]
      } else if (key === 'href') {
        oldVNode.el.setAttribute(key, newProps[key])
      }
    }
  }

  // Patch children
  if (typeof newVNode.children === 'string') {
    if (typeof oldVNode.children === 'string' && oldVNode.children !== newVNode.children) {
      // Update text of first child text node
      const textNode = oldVNode.el.childNodes[0]
      if (textNode) {
        textNode.textContent = newVNode.children
      } else {
        oldVNode.el.appendChild(document.createTextNode(newVNode.children))
      }
    } else if (Array.isArray(oldVNode.children)) {
      // Old had element children, new has text - replace
      oldVNode.el.innerHTML = ''
      oldVNode.el.appendChild(document.createTextNode(newVNode.children))
    }
  } else if (Array.isArray(newVNode.children)) {
    if (typeof oldVNode.children === 'string') {
      // Old was text, new has elements - replace
      oldVNode.el.innerHTML = ''
      for (const child of newVNode.children) {
        const childEl = createDOMElement(child)
        child.el = childEl
        oldVNode.el.appendChild(childEl)
      }
    } else if (Array.isArray(oldVNode.children)) {
      // Both have element children - patch each
      for (let i = 0; i < newVNode.children.length; i++) {
        if (i < oldVNode.children.length) {
          patchElement(oldVNode.children[i], newVNode.children[i])
        } else {
          const childEl = createDOMElement(newVNode.children[i])
          newVNode.children[i].el = childEl
          oldVNode.el.appendChild(childEl)
        }
      }
    }
  }
}

/**
 * Find the tbody VNode in a VNode tree
 */
function findTbody(vnode: VNode): VNode | null {
  if (vnode.type === 'tbody') return vnode
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const found = findTbody(child)
      if (found) return found
    }
  }
  return null
}

// ============================================================
// State
// ============================================================

let data: Array<{ id: number; label: string }> = []
let selected: number | null = null
let container: HTMLElement | null = null
let lastVNode: VNode | null = null

// ============================================================
// Render Function (creates VNode tree using Lyt.js h())
// ============================================================

/**
 * Build the complete table VNode tree using Lyt.js h() function.
 * Each row <tr> has a key={item.id} for keyed diffing.
 */
function renderTable(): VNode {
  const rows: VNode[] = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const isSelected = selected === item.id
    rows.push(
      h('tr', { key: item.id }, [
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
              patchSelected()
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
 * Patch only the selected state across all rows
 * (lightweight update - only toggles CSS class on affected rows)
 */
function patchSelected(): void {
  if (!container || !lastVNode) return

  const tbody = findTbody(lastVNode)
  if (!tbody || !tbody.el) return

  const rows = tbody.children as VNode[]
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.el) continue
    const tds = row.children as VNode[]
    if (tds.length >= 3) {
      const selectTd = tds[2]
      const rowId = row.key as number
      const newClass = selected === rowId ? 'danger' : ''
      if (selectTd.el && selectTd.el.className !== newClass) {
        selectTd.el.className = newClass
      }
    }
  }
}

// ============================================================
// Benchmark API
// ============================================================

/**
 * Create the keyed benchmark instance
 */
export function createElement(id: string): { container: HTMLElement; destroy: () => void } {
  container = document.getElementById(id)
  data = []
  selected = null
  lastVNode = null
  resetId()

  return {
    container: container!,
    destroy: () => {
      if (container) {
        container.innerHTML = ''
      }
      data = []
      selected = null
      lastVNode = null
      container = null
    },
  }
}

/**
 * Run the keyed benchmark - build 1000 rows
 */
export function runBenchmark(): void {
  data = buildData(1000)
  selected = null
  const newVNode = renderTable()
  keyedPatch(container, lastVNode, newVNode)
  lastVNode = newVNode
}

/**
 * Add one row at the bottom
 */
export function addRow(): void {
  const nextId = getNextId(data)
  data.push({ id: nextId, label: `Row ${nextId}` })
  const newVNode = renderTable()
  keyedPatch(container, lastVNode, newVNode)
  lastVNode = newVNode
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
  const newVNode = renderTable()
  keyedPatch(container, lastVNode, newVNode)
  lastVNode = newVNode
}

/**
 * Swap row 1 and row 2 (indices 0 and 1)
 */
export function swapRows(): void {
  if (data.length < 2) return
  const temp = data[0]
  data[0] = data[1]
  data[1] = temp
  const newVNode = renderTable()
  keyedPatch(container, lastVNode, newVNode)
  lastVNode = newVNode
}

/**
 * Remove the last row
 */
export function removeRow(): void {
  if (data.length === 0) return
  data.pop()
  const newVNode = renderTable()
  keyedPatch(container, lastVNode, newVNode)
  lastVNode = newVNode
}

/**
 * Select a row by index
 */
export function selectRow(index: number): void {
  if (index < 0 || index >= data.length) return
  selected = data[index].id
  patchSelected()
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
