/**
 * Lyt.js js-framework-benchmark - Keyed Benchmark
 *
 * Implements the standard keyed benchmark for js-framework-benchmark.
 * Each row has a unique key (id), enabling efficient keyed diffing.
 *
 * This implementation uses a proper keyed diff algorithm instead of
 * full re-rendering (innerHTML rebuild). It maintains a key -> DOM element
 * map and performs minimal DOM operations:
 * - New items: create and insert
 * - Removed items: remove from DOM
 * - Moved items: use insertBefore to reorder
 * - Updated items: patch text content in place
 *
 * Operations:
 * - Create: Build 1000 rows
 * - Add: Add one row at bottom
 * - Update: Update every 10th row (label += ' !!!')
 * - Swap: Swap rows 1 and 2
 * - Remove: Remove last row
 * - Select: Select row at given index
 */

import { buildData, getNextId } from './shared'

// ============================================================
// State
// ============================================================

let data: Array<{ id: number; label: string }> = []
let selected: number | null = null
let container: HTMLElement | null = null
let tbody: HTMLElement | null = null

/**
 * key -> row DOM element mapping for keyed diff
 */
const rowMap = new Map<number, HTMLTableRowElement>()

/**
 * Cached reference to the table head element
 */
let thead: HTMLTableSectionElement | null = null

// ============================================================
// Row Creation & Update
// ============================================================

/**
 * Create a single <tr> element for the given data item
 */
function createRow(item: { id: number; label: string }, isSelected: boolean): HTMLTableRowElement {
  const tr = document.createElement('tr')

  // id column
  const tdId = document.createElement('td')
  tdId.className = 'id-col'
  tdId.textContent = String(item.id)
  tr.appendChild(tdId)

  // label column
  const tdLabel = document.createElement('td')
  tdLabel.className = 'label-col'
  const link = document.createElement('a')
  link.href = '#'
  link.textContent = item.label
  tdLabel.appendChild(link)
  tr.appendChild(tdLabel)

  // select column
  const tdSelect = document.createElement('td')
  tdSelect.className = isSelected ? 'danger' : ''
  const selectLink = document.createElement('a')
  selectLink.href = '#'
  selectLink.textContent = 'Select'
  selectLink.addEventListener('click', (e) => {
    e.preventDefault()
    selected = item.id
    patchSelected()
  })
  tdSelect.appendChild(selectLink)
  tr.appendChild(tdSelect)

  return tr
}

/**
 * Update an existing row's text content in place
 */
function patchRow(tr: HTMLTableRowElement, item: { id: number; label: string }, isSelected: boolean): void {
  // Update label text
  const tdLabel = tr.children[1] as HTMLElement
  const link = tdLabel.firstChild as HTMLAnchorElement
  link.textContent = item.label

  // Update select class
  const tdSelect = tr.children[2] as HTMLElement
  tdSelect.className = isSelected ? 'danger' : ''
  // Note: click handler does NOT need re-attachment because it references
  // the module-level `selected` variable via closure, which is always current.
}

// ============================================================
// Keyed Diff Algorithm
// ============================================================

/**
 * Perform a keyed diff between the current DOM state and the new data array.
 *
 * Algorithm:
 * 1. Build a Set of new keys for quick lookup
 * 2. Remove rows whose keys are no longer in the new data
 * 3. Iterate through new data, creating or patching rows as needed
 * 4. Use insertBefore to maintain correct order (handles moves)
 */
function keyedPatch(): void {
  if (!tbody) return

  const newKeys = new Set<number>()
  for (let i = 0; i < data.length; i++) {
    newKeys.add(data[i].id)
  }

  // Step 1: Remove rows that are no longer in the data
  for (const [key, tr] of rowMap) {
    if (!newKeys.has(key)) {
      if (tr.parentNode) {
        tr.parentNode.removeChild(tr)
      }
      rowMap.delete(key)
    }
  }

  // Step 2: Iterate through new data, create/patch/reorder
  let prevNode: Node | null = null

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const isSelected = selected === item.id

    if (rowMap.has(item.id)) {
      // Existing row: patch in place
      const tr = rowMap.get(item.id)!

      // Patch content
      patchRow(tr, item, isSelected)

      // Reorder if needed: insertBefore the next sibling or append
      const nextExpected = i < data.length - 1
        ? rowMap.get(data[i + 1].id) ?? null
        : null

      if (tr.nextSibling !== nextExpected) {
        // Remove first to avoid duplicates in environments where
        // insertBefore doesn't auto-remove existing children
        if (tr.parentNode) {
          tr.parentNode.removeChild(tr)
        }
        if (nextExpected) {
          tbody.insertBefore(tr, nextExpected)
        } else {
          tbody.appendChild(tr)
        }
      }

      prevNode = tr
    } else {
      // New row: create and insert
      const tr = createRow(item, isSelected)
      rowMap.set(item.id, tr)

      if (prevNode && prevNode.parentNode === tbody) {
        // Insert after prevNode
        if (prevNode.nextSibling) {
          tbody.insertBefore(tr, prevNode.nextSibling)
        } else {
          tbody.appendChild(tr)
        }
      } else {
        // Insert at the correct position
        // Find the next existing row in the new order
        let nextRef: Node | null = null
        for (let j = i + 1; j < data.length; j++) {
          if (rowMap.has(data[j].id)) {
            nextRef = rowMap.get(data[j].id)!
            break
          }
        }
        if (nextRef) {
          tbody.insertBefore(tr, nextRef)
        } else {
          tbody.appendChild(tr)
        }
      }

      prevNode = tr
    }
  }
}

/**
 * Patch only the selected state across all rows
 * (lightweight update - only toggles CSS class)
 */
function patchSelected(): void {
  if (!tbody) return
  for (const [key, tr] of rowMap) {
    const tdSelect = tr.children[2] as HTMLElement
    tdSelect.className = selected === key ? 'danger' : ''
  }
}

// ============================================================
// Initial Render
// ============================================================

/**
 * Build the full table structure (only called once during createElement)
 */
function buildTable(): void {
  if (!container) return

  // Clear container
  container.innerHTML = ''

  const table = document.createElement('table')
  table.className = 'table table-striped table-bordered'

  // Build thead
  thead = document.createElement('thead')
  const headRow = document.createElement('tr')
  const th1 = document.createElement('th')
  th1.textContent = 'id'
  const th2 = document.createElement('th')
  th2.textContent = 'label'
  const th3 = document.createElement('th')
  th3.textContent = ''
  headRow.appendChild(th1)
  headRow.appendChild(th2)
  headRow.appendChild(th3)
  thead.appendChild(headRow)
  table.appendChild(thead)

  // Build tbody
  tbody = document.createElement('tbody')
  table.appendChild(tbody)

  container.appendChild(table)
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
  rowMap.clear()
  tbody = null
  thead = null

  // Build the static table structure
  buildTable()

  return {
    container: container!,
    destroy: () => {
      if (container) {
        container.innerHTML = ''
      }
      rowMap.clear()
      data = []
      selected = null
      container = null
      tbody = null
      thead = null
    },
  }
}

/**
 * Run the keyed benchmark - build 1000 rows
 */
export function runBenchmark(): void {
  data = buildData(1000)
  selected = null
  keyedPatch()
}

/**
 * Add one row at the bottom
 */
export function addRow(): void {
  const nextId = getNextId(data)
  data.push({ id: nextId, label: `Row ${nextId}` })
  keyedPatch()
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
  keyedPatch()
}

/**
 * Swap row 1 and row 2 (indices 0 and 1)
 */
export function swapRows(): void {
  if (data.length < 2) return
  const temp = data[0]
  data[0] = data[1]
  data[1] = temp
  keyedPatch()
}

/**
 * Remove the last row
 */
export function removeRow(): void {
  if (data.length === 0) return
  data.pop()
  keyedPatch()
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
