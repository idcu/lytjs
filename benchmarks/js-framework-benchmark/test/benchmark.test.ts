/**
 * Lyt.js js-framework-benchmark - Test Suite
 *
 * Tests the benchmark implementation including:
 * - createElement, runBenchmark, addRow, updateEvery10thRow, swapRows, removeRow, selectRow, destroy
 * - Keyed vs non-keyed behavior differences
 * - Performance benchmarks
 * - Memory leak detection
 *
 * Uses a mock DOM environment for Node.js compatibility.
 */

import { describe, it, expect, beforeEach, afterEach } from '../../../packages/test-utils/src/index.ts'

// ============================================================
// Mock DOM Environment
// ============================================================

/**
 * Lightweight mock DOM element for Node.js testing
 */
class MockElement {
  tagName: string
  nodeType: number
  childNodes: MockElement[]
  parentNode: MockElement | null
  firstChild: MockElement | null
  lastChild: MockElement | null
  nextSibling: MockElement | null
  textContent: string
  className: string
  id: string
  style: Record<string, string>
  attributes: Record<string, string>
  eventListeners: Record<string, Function[]>
  children: MockElement[]

  constructor(tag: string) {
    this.tagName = tag.toUpperCase()
    this.nodeType = tag === '#text' ? 3 : 1
    this.childNodes = []
    this.parentNode = null
    this.firstChild = null
    this.lastChild = null
    this.nextSibling = null
    this._textContent = ''
    this.className = ''
    this.id = ''
    this.style = {}
    this.attributes = {}
    this.eventListeners = {}
    this.children = []
  }

  // Use a backing field for innerHTML so we can add a setter
  private _innerHTML: string = ''

  get innerHTML(): string {
    return this._innerHTML
  }

  set innerHTML(val: string) {
    this._innerHTML = val
    if (val === '') {
      // Clear all children when innerHTML is set to empty
      this.childNodes.length = 0
      this.children.length = 0
      this.firstChild = null
      this.lastChild = null
    }
  }

  // Use a backing field for textContent so we can add a setter
  private _textContent: string

  get textContent(): string {
    return this._textContent
  }

  set textContent(val: string) {
    this._textContent = val
    if (val === '') {
      // Clear all children when textContent is set to empty
      this.childNodes.length = 0
      this.children.length = 0
      this.firstChild = null
      this.lastChild = null
    }
  }

  appendChild(child: MockElement): MockElement {
    child.parentNode = this
    this.childNodes.push(child)
    this.children.push(child)
    this.firstChild = this.childNodes[0] || null
    this.lastChild = this.childNodes[this.childNodes.length - 1] || null
    return child
  }

  removeChild(child: MockElement): MockElement {
    const idx = this.childNodes.indexOf(child)
    if (idx !== -1) {
      this.childNodes.splice(idx, 1)
      this.children.splice(idx, 1)
      child.parentNode = null
      this.firstChild = this.childNodes[0] || null
      this.lastChild = this.childNodes[this.childNodes.length - 1] || null
    }
    return child
  }

  insertBefore(child: MockElement, ref: MockElement | null): MockElement {
    if (!ref) return this.appendChild(child)
    const idx = this.childNodes.indexOf(ref)
    if (idx !== -1) {
      child.parentNode = this
      this.childNodes.splice(idx, 0, child)
      this.children.splice(idx, 0, child)
      this.firstChild = this.childNodes[0] || null
      this.lastChild = this.childNodes[this.childNodes.length - 1] || null
    }
    return child
  }

  replaceChild(newChild: MockElement, oldChild: MockElement): MockElement {
    const idx = this.childNodes.indexOf(oldChild)
    if (idx !== -1) {
      this.childNodes[idx] = newChild
      this.children[idx] = newChild
      newChild.parentNode = this
      oldChild.parentNode = null
    }
    return oldChild
  }

  setAttribute(key: string, val: string): void {
    this.attributes[key] = val
    if (key === 'class') this.className = val
    if (key === 'id') this.id = val
  }

  getAttribute(key: string): string | null {
    return this.attributes[key] || null
  }

  removeAttribute(key: string): void {
    delete this.attributes[key]
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners[event]) this.eventListeners[event] = []
    this.eventListeners[event].push(handler)
  }

  removeEventListener(event: string, handler: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler)
    }
  }

  querySelector(selector: string): MockElement | null {
    // Very basic selector support for testing
    if (selector === '.danger' || selector.startsWith('td.')) {
      return this._findDeep((el: MockElement) => {
        if (selector === '.danger') return el.className === 'danger'
        if (selector === '.id-col') return el.className === 'id-col'
        if (selector === '.label-col') return el.className === 'label-col'
        return false
      })
    }
    return null
  }

  querySelectorAll(selector: string): MockElement[] {
    if (selector === 'tr') {
      return this._findAllDeep((el: MockElement) => el.tagName === 'TR')
    }
    if (selector === 'td') {
      return this._findAllDeep((el: MockElement) => el.tagName === 'TD')
    }
    if (selector === 'a') {
      return this._findAllDeep((el: MockElement) => el.tagName === 'A')
    }
    return []
  }

  closest(selector: string): MockElement | null {
    if (selector === 'tr') {
      let el: MockElement | null = this
      while (el) {
        if (el.tagName === 'TR') return el
        el = el.parentNode
      }
    }
    return null
  }

  private _findDeep(predicate: (el: MockElement) => boolean): MockElement | null {
    for (const child of this.childNodes) {
      if (child instanceof MockElement && predicate(child)) return child
      if (child instanceof MockElement) {
        const found = child._findDeep(predicate)
        if (found) return found
      }
    }
    return null
  }

  private _findAllDeep(predicate: (el: MockElement) => boolean): MockElement[] {
    const results: MockElement[] = []
    for (const child of this.childNodes) {
      if (child instanceof MockElement) {
        if (predicate(child)) results.push(child)
        results.push(...child._findAllDeep(predicate))
      }
    }
    return results
  }
}

/**
 * Mock document for Node.js environment
 */
const mockDocument = {
  _elements: new Map<string, MockElement>(),

  createElement(tag: string): MockElement {
    return new MockElement(tag)
  },

  createTextNode(text: string): MockElement {
    const el = new MockElement('#text')
    el.textContent = text
    el.innerHTML = text
    return el
  },

  getElementById(id: string): MockElement | null {
    return this._elements.get(id) || null
  },

  querySelector(_selector: string): MockElement | null {
    return null
  },
}

// Install global document mock
;(globalThis as any).document = mockDocument

// ============================================================
// Helper: Setup a container for each test
// ============================================================

function setupContainer(id: string): MockElement {
  const container = new MockElement('div')
  container.id = id
  mockDocument._elements.set(id, container)
  return container
}

function cleanupContainer(id: string): void {
  mockDocument._elements.delete(id)
}

// ============================================================
// Helper: Count TR elements in a mock container
// ============================================================

function countTrElements(container: MockElement): number {
  return container.querySelectorAll('tr').length
}

// ============================================================
// Helper: Get all row IDs from the rendered table
// ============================================================

function getRowIds(container: MockElement): number[] {
  const trs = container.querySelectorAll('tr')
  const ids: number[] = []
  // Skip the header row (first tr)
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 0 && tds[0].childNodes.length > 0) {
      const textNode = tds[0].childNodes[0]
      const id = parseInt(textNode.textContent, 10)
      if (!isNaN(id)) ids.push(id)
    }
  }
  return ids
}

// ============================================================
// Helper: Get row labels from the rendered table
// ============================================================

function getRowLabels(container: MockElement): string[] {
  const trs = container.querySelectorAll('tr')
  const labels: string[] = []
  // Skip the header row
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 1) {
      const anchors = tds[1].querySelectorAll('a')
      if (anchors.length > 0 && anchors[0].childNodes.length > 0) {
        labels.push(anchors[0].childNodes[0].textContent)
      }
    }
  }
  return labels
}

// ============================================================
// Helper: Check if a row has the 'danger' class (selected)
// ============================================================

function getSelectedRowIndices(container: MockElement): number[] {
  const trs = container.querySelectorAll('tr')
  const selected: number[] = []
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 2 && tds[2].className === 'danger') {
      selected.push(i - 1) // 0-based index
    }
  }
  return selected
}

// ============================================================
// Tests - Shared Utilities
// ============================================================

describe('js-framework-benchmark/shared', () => {
  beforeEach(() => {
    // 确保使用本文件的 mock document（其他测试文件可能覆盖了全局 document）
    ;(globalThis as any).document = mockDocument
  })

  it('buildData should create correct number of items', () => {
    // Import and test the shared module's buildData
    const { buildData } = require('../lyt/src/shared.ts')
    const data = buildData(100)
    expect(data.length).toBe(100)
    expect(data[0].id).toBe(1)
    expect(data[0].label).toBe('Row 1')
    expect(data[99].id).toBe(100)
    expect(data[99].label).toBe('Row 100')
  })

  it('getNextId should return max + 1', () => {
    const { buildData, getNextId } = require('../lyt/src/shared.ts')
    const data = buildData(10)
    expect(getNextId(data)).toBe(11)
  })

  it('getNextId should handle empty array', () => {
    const { getNextId } = require('../lyt/src/shared.ts')
    expect(getNextId([])).toBe(1)
  })
})

// ============================================================
// Tests - Keyed Benchmark
// ============================================================

describe('js-framework-benchmark/keyed', () => {
  let container: MockElement
  const CONTAINER_ID = 'keyed-test'

  beforeEach(() => {
    // 确保使用本文件的 mock document
    ;(globalThis as any).document = mockDocument
    container = setupContainer(CONTAINER_ID)
  })

  afterEach(() => {
    cleanupContainer(CONTAINER_ID)
  })

  it('createElement should create container and return handle', () => {
    const keyed = require('../lyt/src/keyed.ts')
    const result = keyed.createElement(CONTAINER_ID)
    expect(result.container).toBeTruthy()
    expect(result.destroy).toBeDefined()
  })

  it('runBenchmark should render 1000 rows', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    const trCount = countTrElements(container)
    // 1000 data rows + 1 header row = 1001
    expect(trCount).toBe(1001)
  })

  it('runBenchmark should render correct row IDs', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    const ids = getRowIds(container)
    expect(ids.length).toBe(1000)
    expect(ids[0]).toBe(1)
    expect(ids[999]).toBe(1000)
  })

  it('addRow should add one row (1001 total)', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()
    keyed.addRow()

    const trCount = countTrElements(container)
    expect(trCount).toBe(1002) // 1001 data + 1 header
    const ids = getRowIds(container)
    expect(ids.length).toBe(1001)
    expect(ids[1000]).toBe(1001)
  })

  it('updateEvery10thRow should update correct rows', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()
    keyed.updateEvery10thRow()

    const labels = getRowLabels(container)
    // Row 10 (index 9) should be updated
    expect(labels[9]).toBe('Row 10 !!!')
    // Row 20 (index 19) should be updated
    expect(labels[19]).toBe('Row 20 !!!')
    // Row 1 (index 0) should NOT be updated
    expect(labels[0]).toBe('Row 1')
    // Row 5 (index 4) should NOT be updated
    expect(labels[4]).toBe('Row 5')
  })

  it('swapRows should swap rows 1 and 2', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    // Before swap: row 0 has id=1, row 1 has id=2
    let ids = getRowIds(container)
    expect(ids[0]).toBe(1)
    expect(ids[1]).toBe(2)

    keyed.swapRows()

    // After swap: row 0 has id=2, row 1 has id=1
    ids = getRowIds(container)
    expect(ids[0]).toBe(2)
    expect(ids[1]).toBe(1)
    // Rest should be unchanged
    expect(ids[2]).toBe(3)
  })

  it('removeRow should remove last row', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    let trCount = countTrElements(container)
    expect(trCount).toBe(1001)

    keyed.removeRow()

    trCount = countTrElements(container)
    expect(trCount).toBe(1000) // 999 data + 1 header

    const ids = getRowIds(container)
    expect(ids.length).toBe(999)
    // Last row should be id=999 (id=1000 was removed)
    expect(ids[998]).toBe(999)
  })

  it('selectRow should mark a row as selected', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()
    keyed.selectRow(50)

    const selected = getSelectedRowIndices(container)
    expect(selected.length).toBe(1)
    expect(selected[0]).toBe(50)
  })

  it('selectRow with different index should update selection', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()
    keyed.selectRow(10)
    keyed.selectRow(20)

    const selected = getSelectedRowIndices(container)
    expect(selected.length).toBe(1)
    expect(selected[0]).toBe(20)
  })

  it('destroy should clean up container', () => {
    const keyed = require('../lyt/src/keyed.ts')
    const handle = keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    expect(countTrElements(container)).toBe(1001)

    handle.destroy()

    // Container should be empty
    expect(container.childNodes.length).toBe(0)
  })

  it('getData should return current data', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()

    const data = keyed.getData()
    expect(data.length).toBe(1000)
    expect(data[0].id).toBe(1)
  })

  it('getSelected should return selected id', () => {
    const keyed = require('../lyt/src/keyed.ts')
    keyed.createElement(CONTAINER_ID)
    keyed.runBenchmark()
    keyed.selectRow(42)

    expect(keyed.getSelected()).toBe(43) // id = index + 1
  })
})

// ============================================================
// Tests - Non-Keyed Benchmark
// ============================================================

describe('js-framework-benchmark/non-keyed', () => {
  let container: MockElement
  const CONTAINER_ID = 'nonkeyed-test'

  beforeEach(() => {
    // 确保使用本文件的 mock document
    ;(globalThis as any).document = mockDocument
    container = setupContainer(CONTAINER_ID)
  })

  afterEach(() => {
    cleanupContainer(CONTAINER_ID)
  })

  it('createElement should create container and return handle', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    const result = nonKeyed.createElement(CONTAINER_ID)
    expect(result.container).toBeTruthy()
    expect(result.destroy).toBeDefined()
  })

  it('runBenchmark should render 1000 rows', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()

    const trCount = countTrElements(container)
    expect(trCount).toBe(1001)
  })

  it('addRow should add one row', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()
    nonKeyed.addRow()

    const ids = getRowIds(container)
    expect(ids.length).toBe(1001)
  })

  it('updateEvery10thRow should update correct rows', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()
    nonKeyed.updateEvery10thRow()

    const labels = getRowLabels(container)
    expect(labels[9]).toBe('Row 10 !!!')
    expect(labels[0]).toBe('Row 1')
  })

  it('swapRows should swap rows 1 and 2', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()

    nonKeyed.swapRows()

    const ids = getRowIds(container)
    expect(ids[0]).toBe(2)
    expect(ids[1]).toBe(1)
  })

  it('removeRow should remove last row', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()
    nonKeyed.removeRow()

    const ids = getRowIds(container)
    expect(ids.length).toBe(999)
    expect(ids[998]).toBe(999)
  })

  it('selectRow should mark a row as selected', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()
    nonKeyed.selectRow(30)

    const selected = getSelectedRowIndices(container)
    expect(selected.length).toBe(1)
    expect(selected[0]).toBe(30)
  })

  it('destroy should clean up container', () => {
    const nonKeyed = require('../lyt/src/non-keyed.ts')
    const handle = nonKeyed.createElement(CONTAINER_ID)
    nonKeyed.runBenchmark()
    handle.destroy()

    expect(container.childNodes.length).toBe(0)
  })
})

// ============================================================
// Tests - Keyed vs Non-Keyed Behavior
// ============================================================

describe('js-framework-benchmark/keyed-vs-nonkeyed', () => {
  beforeEach(() => {
    ;(globalThis as any).document = mockDocument
  })

  it('both should render the same initial data', () => {
    const container1 = setupContainer('kvsk-1')
    const container2 = setupContainer('kvsk-2')

    const keyed = require('../lyt/src/keyed.ts')
    const nonKeyed = require('../lyt/src/non-keyed.ts')

    keyed.createElement('kvsk-1')
    keyed.runBenchmark()
    nonKeyed.createElement('kvsk-2')
    nonKeyed.runBenchmark()

    const ids1 = getRowIds(container1)
    const ids2 = getRowIds(container2)

    expect(ids1.length).toBe(ids2.length)
    expect(ids1[0]).toBe(ids2[0])
    expect(ids1[999]).toBe(ids2[999])

    cleanupContainer('kvsk-1')
    cleanupContainer('kvsk-2')
  })

  it('both should produce same result after swap', () => {
    const container1 = setupContainer('kvsk-3')
    const container2 = setupContainer('kvsk-4')

    const keyed = require('../lyt/src/keyed.ts')
    const nonKeyed = require('../lyt/src/non-keyed.ts')

    keyed.createElement('kvsk-3')
    keyed.runBenchmark()
    keyed.swapRows()

    nonKeyed.createElement('kvsk-4')
    nonKeyed.runBenchmark()
    nonKeyed.swapRows()

    const ids1 = getRowIds(container1)
    const ids2 = getRowIds(container2)

    expect(ids1[0]).toBe(2)
    expect(ids2[0]).toBe(2)
    expect(ids1[1]).toBe(1)
    expect(ids2[1]).toBe(1)

    cleanupContainer('kvsk-3')
    cleanupContainer('kvsk-4')
  })
})

// ============================================================
// Tests - Performance
// ============================================================

describe('js-framework-benchmark/performance', () => {
  beforeEach(() => {
    ;(globalThis as any).document = mockDocument
  })

  it('1000 row render should complete within 500ms', () => {
    const container = setupContainer('perf-1')
    const keyed = require('../lyt/src/keyed.ts')

    keyed.createElement('perf-1')

    const start = performance.now()
    keyed.runBenchmark()
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)

    cleanupContainer('perf-1')
  })

  it('1000 row update (every 10th) should complete within 500ms', () => {
    const container = setupContainer('perf-2')
    const keyed = require('../lyt/src/keyed.ts')

    keyed.createElement('perf-2')
    keyed.runBenchmark()

    const start = performance.now()
    keyed.updateEvery10thRow()
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)

    cleanupContainer('perf-2')
  })

  it('1000 row swap should complete within 500ms', () => {
    const container = setupContainer('perf-3')
    const keyed = require('../lyt/src/keyed.ts')

    keyed.createElement('perf-3')
    keyed.runBenchmark()

    const start = performance.now()
    keyed.swapRows()
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)

    cleanupContainer('perf-3')
  })

  it('1000 row remove should complete within 500ms', () => {
    const container = setupContainer('perf-4')
    const keyed = require('../lyt/src/keyed.ts')

    keyed.createElement('perf-4')
    keyed.runBenchmark()

    const start = performance.now()
    keyed.removeRow()
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)

    cleanupContainer('perf-4')
  })
})

// ============================================================
// Tests - Memory / Cleanup
// ============================================================

describe('js-framework-benchmark/memory', () => {
  beforeEach(() => {
    ;(globalThis as any).document = mockDocument
  })

  it('destroy should clear all data references', () => {
    const container = setupContainer('mem-1')
    const keyed = require('../lyt/src/keyed.ts')

    const handle = keyed.createElement('mem-1')
    keyed.runBenchmark()
    keyed.selectRow(50)

    handle.destroy()

    // After destroy, getData should return empty
    expect(keyed.getData().length).toBe(0)
    expect(keyed.getSelected()).toBe(null)
  })

  it('multiple create/destroy cycles should not leak', () => {
    const keyed = require('../lyt/src/keyed.ts')

    for (let i = 0; i < 5; i++) {
      const id = `mem-cycle-${i}`
      const c = setupContainer(id)
      const handle = keyed.createElement(id)
      keyed.runBenchmark()
      keyed.addRow()
      keyed.updateEvery10thRow()
      keyed.selectRow(i)
      handle.destroy()
      cleanupContainer(id)
    }

    // Final state should be clean
    expect(keyed.getData().length).toBe(0)
    expect(keyed.getSelected()).toBe(null)
  })
})

// ============================================================
// Tests - IIFE Bundle Validation
// ============================================================

describe('js-framework-benchmark/iife-bundle', () => {
  beforeEach(() => {
    ;(globalThis as any).document = mockDocument
  })

  it('IIFE bundle file should exist', () => {
    const fs = require('fs')
    const path = require('path')
    const bundlePath = path.join(__dirname, '..', 'lyt', 'dist', 'js-framework-benchmark.js')
    expect(fs.existsSync(bundlePath)).toBe(true)
  })

  it('IIFE bundle should contain expected API functions', () => {
    const fs = require('fs')
    const path = require('path')
    const bundlePath = path.join(__dirname, '..', 'lyt', 'dist', 'js-framework-benchmark.js')
    const content = fs.readFileSync(bundlePath, 'utf-8')

    expect(content).toContain('createElement')
    expect(content).toContain('runBenchmark')
    expect(content).toContain('addRow')
    expect(content).toContain('updateEvery10thRow')
    expect(content).toContain('swapRows')
    expect(content).toContain('removeRow')
    expect(content).toContain('selectRow')
    expect(content).toContain('LytBenchmark')
    expect(content).toContain('createElementNonKeyed')
    expect(content).toContain('runBenchmarkNonKeyed')
  })

  it('IIFE bundle should be a valid UMD module', () => {
    const fs = require('fs')
    const path = require('path')
    const bundlePath = path.join(__dirname, '..', 'lyt', 'dist', 'js-framework-benchmark.js')
    const content = fs.readFileSync(bundlePath, 'utf-8')

    expect(content).toContain('define.amd')
    expect(content).toContain('module.exports')
    expect(content).toContain('self')
  })
})
