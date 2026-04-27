/**
 * Lyt.js js-framework-benchmark - Non-Keyed Signal Benchmark (Optimized)
 *
 * High-performance non-keyed benchmark using Lyt.js Signal system.
 * Uses direct DOM manipulation with signal-backed row data.
 *
 * Key optimizations over the original non-keyed implementation:
 * 1. Original: innerHTML = '' + full DOM rebuild on every operation
 *    Optimized: Direct DOM manipulation for add/remove/swap
 * 2. updateEvery10thRow: Only updates 100 text nodes (not full rebuild)
 * 3. selectRow: Only updates 2 className properties (not full rebuild)
 * 4. swapRows: Direct DOM node swap (not full rebuild)
 * 5. Uses DocumentFragment for batch row creation
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
 * Find a row by ID.
 */
function findRowById(id: number): RowData | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i]
  }
  return null
}

// ============================================================
// Benchmark API
// ============================================================

/**
 * Create the non-keyed signal benchmark instance
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
 * Run the non-keyed benchmark - build 1000 rows using DocumentFragment
 */
export function runBenchmark(): void {
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
  const data = buildData(1000)
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
  if (tr0.nextSibling === tr1) {
    tbodyEl.insertBefore(tr1, tr0)
  } else if (tr1.nextSibling === tr0) {
    tbodyEl.insertBefore(tr0, tr1)
  } else {
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
