/**
 * Lyt.js js-framework-benchmark - Keyed Signal Benchmark (Optimized)
 *
 * High-performance keyed benchmark using Lyt.js Signal system for
 * fine-grained reactive updates. Avoids VDOM diff overhead entirely.
 *
 * Key optimizations:
 * 1. Each row's label is managed by an independent signal
 * 2. updateEvery10thRow only triggers 100 signal updates (not 1000 VNode creates)
 * 3. selectRow only updates 2 DOM elements (old + new selection className)
 * 4. swapRows uses direct DOM node swapping (no VNode recreation)
 * 5. addRow/removeRow use direct DOM insertion/removal
 * 6. runBenchmark uses DocumentFragment for batch DOM insertion
 */

import { signal, effect, batch, untrack } from '@lytjs/reactivity/signal'
import { buildData, getNextId, resetId } from './shared'

// ============================================================
// Row Data Structure
// ============================================================

interface RowData {
  id: number
  labelSignal: { (): string; set(v: string): void }
  trEl: HTMLTableRowElement | any
  labelAnchorEl: HTMLAnchorElement | any
  selectTdEl: HTMLTableCellElement | any
}

// ============================================================
// State
// ============================================================

let rows: RowData[] = []
let selectedId: number | null = null
let containerEl: any = null
let tbodyEl: any = null
let disposed = false

// ============================================================
// DOM Creation Helpers
// ============================================================

/**
 * Create a single row DOM element and bind it to a signal.
 * Returns the RowData with DOM element references.
 */
function createRowElement(id: number, label: string): RowData {
  const labelSignal = signal(label)

  // Create DOM elements
  const tr = document.createElement('tr')

  // td.id-col
  const tdId = document.createElement('td')
  tdId.className = 'id-col'
  tdId.appendChild(document.createTextNode(String(id)))

  // td.label-col > a
  const tdLabel = document.createElement('td')
  tdLabel.className = 'label-col'
  const labelAnchor = document.createElement('a')
  labelAnchor.href = '#'
  labelAnchor.textContent = label
  tdLabel.appendChild(labelAnchor)

  // td.select > a
  const tdSelect = document.createElement('td')
  const selectAnchor = document.createElement('a')
  selectAnchor.href = '#'
  selectAnchor.textContent = 'Select'
  selectAnchor.addEventListener('click', (e: any) => {
    e.preventDefault()
    selectRowById(id)
  })
  tdSelect.appendChild(selectAnchor)

  tr.appendChild(tdId)
  tr.appendChild(tdLabel)
  tr.appendChild(tdSelect)

  // Set up fine-grained label update effect
  const disposeEffect = effect(() => {
    const currentLabel = labelSignal()
    if (labelAnchor.textContent !== currentLabel) {
      labelAnchor.textContent = currentLabel
    }
  })

  const rowData: RowData = {
    id,
    labelSignal,
    trEl: tr,
    labelAnchorEl: labelAnchor,
    selectTdEl: tdSelect,
  }

  // Store dispose on the element for cleanup
  ;(tr as any)._disposeEffect = disposeEffect

  return rowData
}

/**
 * Update the selected state on a row's td element.
 */
function updateRowSelection(row: RowData, isSelected: boolean): void {
  const newClass = isSelected ? 'danger' : ''
  if (row.selectTdEl.className !== newClass) {
    row.selectTdEl.className = newClass
  }
}

// ============================================================
// Selection
// ============================================================

/**
 * Select a row by its ID (called from click handler).
 * Only updates the old and new row's className - O(1) DOM operations.
 */
function selectRowById(id: number): void {
  if (disposed) return

  const oldSelectedId = selectedId
  selectedId = id

  // Deselect old row
  if (oldSelectedId !== null && oldSelectedId !== id) {
    const oldRow = findRowById(oldSelectedId)
    if (oldRow) {
      updateRowSelection(oldRow, false)
    }
  }

  // Select new row
  const newRow = findRowById(id)
  if (newRow) {
    updateRowSelection(newRow, true)
  }
}

/**
 * Find a row by ID using the rows array.
 * Since rows are in order and IDs are sequential, we can optimize lookup.
 */
function findRowById(id: number): RowData | null {
  // Fast path: if IDs are sequential, use index-based lookup
  if (id > 0 && id <= rows.length && rows[id - 1].id === id) {
    return rows[id - 1]
  }
  // Fallback: linear search (rare case after swaps)
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i]
  }
  return null
}

// ============================================================
// Benchmark API
// ============================================================

/**
 * Create the keyed signal benchmark instance
 */
export function createElement(id: string): { container: any; destroy: () => void } {
  containerEl = document.getElementById(id)
  rows = []
  selectedId = null
  tbodyEl = null
  disposed = false
  resetId()

  return {
    container: containerEl,
    destroy: () => {
      disposed = true
      // Dispose all row effects
      for (let i = 0; i < rows.length; i++) {
        const dispose = (rows[i].trEl as any)._disposeEffect
        if (dispose) dispose()
        rows[i].labelSignal.dispose()
      }
      if (containerEl) {
        containerEl.innerHTML = ''
      }
      rows = []
      selectedId = null
      tbodyEl = null
      containerEl = null
    },
  }
}

/**
 * Run the keyed benchmark - build rows using DocumentFragment
 * @param count - Number of rows to create (default: 1000)
 */
export function runBenchmark(count: number = 1000): void {
  if (disposed || !containerEl) return

  // Clean up old rows
  for (let i = 0; i < rows.length; i++) {
    const dispose = (rows[i].trEl as any)._disposeEffect
    if (dispose) dispose()
    rows[i].labelSignal.dispose()
  }

  // Clear container
  containerEl.innerHTML = ''

  // Build new data
  const data = buildData(count)
  selectedId = null

  // Create table structure
  const table = document.createElement('table')
  table.className = 'table table-striped table-bordered'

  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  const th1 = document.createElement('th')
  th1.textContent = 'id'
  const th2 = document.createElement('th')
  th2.textContent = 'label'
  const th3 = document.createElement('th')
  th3.textContent = ''
  headerRow.appendChild(th1)
  headerRow.appendChild(th2)
  headerRow.appendChild(th3)
  thead.appendChild(headerRow)

  tbodyEl = document.createElement('tbody')

  // Build all rows into a DocumentFragment for batch insertion
  const fragment = document.createDocumentFragment()
  rows = new Array(data.length)

  for (let i = 0; i < data.length; i++) {
    const row = createRowElement(data[i].id, data[i].label)
    rows[i] = row
    fragment.appendChild(row.trEl)
  }

  // Batch insert all rows
  tbodyEl.appendChild(fragment)
  table.appendChild(thead)
  table.appendChild(tbodyEl)
  containerEl.appendChild(table)
}

/**
 * Add one row at the bottom
 */
export function addRow(): void {
  if (disposed || !tbodyEl) return

  const nextId = getNextId(rows.map(r => ({ id: r.id, label: '' })))
  const row = createRowElement(nextId, `Row ${nextId}`)
  rows.push(row)
  tbodyEl.appendChild(row.trEl)
}

/**
 * Update every 10th row (change label) - only touches 100 signals
 */
export function updateEvery10thRow(): void {
  if (disposed) return

  // Use batch to coalesce all signal notifications
  batch(() => {
    for (let i = 0; i < rows.length; i++) {
      if ((i + 1) % 10 === 0) {
        rows[i].labelSignal.update(prev => prev + ' !!!')
      }
    }
  })
}

/**
 * Swap row 1 and row 2 (indices 0 and 1) - direct DOM swap
 */
export function swapRows(): void {
  if (disposed || rows.length < 2 || !tbodyEl) return

  // Get DOM references BEFORE swapping data
  const tr0 = rows[0].trEl
  const tr1 = rows[1].trEl

  // Swap in data array
  const temp = rows[0]
  rows[0] = rows[1]
  rows[1] = temp

  // Direct DOM swap using insertBefore
  // tr0 and tr1 are adjacent: [tr0, tr1, ...]
  // After swap we want: [tr1, tr0, ...]
  if (tr0.nextSibling === tr1) {
    // tr0 is immediately before tr1
    tbodyEl.insertBefore(tr1, tr0)
  } else if (tr1.nextSibling === tr0) {
    // tr1 is immediately before tr0
    tbodyEl.insertBefore(tr0, tr1)
  } else {
    // Non-adjacent: use placeholder
    const nextSibling = tr0.nextSibling
    tbodyEl.insertBefore(tr0, tr1.nextSibling)
    tbodyEl.insertBefore(tr1, nextSibling)
  }
}

/**
 * Remove the last row
 */
export function removeRow(): void {
  if (disposed || rows.length === 0 || !tbodyEl) return

  const lastRow = rows.pop()!
  const dispose = (lastRow.trEl as any)._disposeEffect
  if (dispose) dispose()
  lastRow.labelSignal.dispose()
  tbodyEl.removeChild(lastRow.trEl)
}

/**
 * Select a row by index
 */
export function selectRow(index: number): void {
  if (disposed || index < 0 || index >= rows.length) return
  selectRowById(rows[index].id)
}

/**
 * Get current data (for testing)
 */
export function getData(): Array<{ id: number; label: string }> {
  return untrack(() =>
    rows.map(r => ({ id: r.id, label: r.labelSignal() }))
  )
}

/**
 * Get selected ID (for testing)
 */
export function getSelected(): number | null {
  return selectedId
}
