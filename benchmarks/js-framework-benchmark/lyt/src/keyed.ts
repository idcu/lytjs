/**
 * Lyt.js js-framework-benchmark - Keyed Benchmark
 *
 * Implements the standard keyed benchmark for js-framework-benchmark.
 * Each row has a unique key (id), enabling efficient keyed diffing.
 *
 * Operations:
 * - Create: Build 1000 rows
 * - Add: Add one row at bottom
 * - Update: Update every 10th row (label += ' !!!')
 * - Swap: Swap rows 1 and 2
 * - Remove: Remove last row
 * - Select: Select row at given index
 */

import { buildData, getNextId, bh, mountVNode, unmountVNode, type BVNode } from './shared'

// ============================================================
// State
// ============================================================

let data: Array<{ id: number; label: string }> = []
let selected: number | null = null
let container: any = null

// ============================================================
// Render
// ============================================================

/**
 * Render the full table with keyed rows
 */
function render(): BVNode {
  const rows: BVNode[] = []
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const isSelected = selected === item.id
    rows.push(
      bh('tr', { key: item.id }, [
        bh('td', { className: 'id-col', key: 'id' }, String(item.id)),
        bh('td', { className: 'label-col', key: 'label' }, [
          bh('a', { href: '#', key: 'link' }, item.label),
        ]),
        bh('td', {
          className: isSelected ? 'danger' : '',
          key: 'select',
        }, [
          bh('a', {
            href: '#',
            key: 'btn',
            onClick: (e: any) => {
              e.preventDefault()
              selected = item.id
              rerender()
            },
          }, 'Select'),
        ]),
      ])
    )
  }

  return bh('table', { className: 'table table-striped table-bordered' }, [
    bh('thead', { key: 'head' }, [
      bh('tr', { key: 'head-row' }, [
        bh('th', { key: 'h1' }, 'id'),
        bh('th', { key: 'h2' }, 'label'),
        bh('th', { key: 'h3' }, ''),
      ]),
    ]),
    bh('tbody', { key: 'body' }, rows),
  ])
}

/**
 * Re-render the table into the container
 */
function rerender(): void {
  if (!container) return
  unmountVNode(container)
  const vnode = render()
  mountVNode(vnode, container)
}

// ============================================================
// Benchmark API
// ============================================================

/**
 * Create the keyed benchmark instance
 */
export function createElement(id: string): { container: any; destroy: () => void } {
  container = document.getElementById(id)
  data = []
  selected = null
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
 * Run the keyed benchmark - build 1000 rows
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
