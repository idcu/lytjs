/**
 * Test the built IIFE bundle with mock DOM environment.
 * This validates that the signal-optimized benchmark works correctly.
 */

// ============================================================
// Mock DOM Environment (simplified, no nextSibling tracking)
// ============================================================

class MockElement {
  constructor(tag) {
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
    this._innerHTML = ''
  }

  get innerHTML() { return this._innerHTML }
  set innerHTML(val) {
    this._innerHTML = val
    if (val === '') {
      this.childNodes.length = 0
      this.children.length = 0
      this.firstChild = null
      this.lastChild = null
    }
  }

  get textContent() { return this._textContent }
  set textContent(val) {
    this._textContent = val
    if (val === '') {
      this.childNodes.length = 0
      this.children.length = 0
      this.firstChild = null
      this.lastChild = null
    } else if (this.childNodes.length > 0 && this.childNodes[0].nodeType === 3) {
      // Update existing text node
      this.childNodes[0]._textContent = val
    } else {
      // Replace children with a text node
      this.childNodes.length = 0
      this.children.length = 0
      const tn = mockDocument.createTextNode(val)
      tn.parentNode = this
      this.childNodes.push(tn)
      this.children.push(tn)
      this.firstChild = tn
      this.lastChild = tn
    }
  }

  appendChild(child) {
    // Handle DocumentFragment: move all children
    if (child.childNodes && child.nodeType === 11) {
      while (child.childNodes.length > 0) {
        const fc = child.childNodes.shift()
        fc.parentNode = this
        this.childNodes.push(fc)
        this.children.push(fc)
      }
      this._fixNextSibling()
      return child
    }
    child.parentNode = this
    this.childNodes.push(child)
    this.children.push(child)
    this._fixNextSibling()
    return child
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child)
    if (idx !== -1) {
      this.childNodes.splice(idx, 1)
      this.children.splice(idx, 1)
      child.parentNode = null
      this._fixNextSibling()
    }
    return child
  }

  _fixNextSibling() {
    for (let i = 0; i < this.childNodes.length; i++) {
      this.childNodes[i].nextSibling = this.childNodes[i + 1] || null
    }
  }

  insertBefore(child, ref) {
    if (!ref) return this.appendChild(child)
    // If child is already in this node, remove it first
    if (child.parentNode === this) {
      const oldIdx = this.childNodes.indexOf(child)
      if (oldIdx !== -1) {
        this.childNodes.splice(oldIdx, 1)
        this.children.splice(oldIdx, 1)
      }
    }
    const idx = this.childNodes.indexOf(ref)
    if (idx !== -1) {
      child.parentNode = this
      this.childNodes.splice(idx, 0, child)
      this.children.splice(idx, 0, child)
      this._fixNextSibling()
    }
    return child
  }

  setAttribute(key, val) {
    this.attributes[key] = val
    if (key === 'class') this.className = val
    if (key === 'id') this.id = val
  }

  getAttribute(key) { return this.attributes[key] || null }
  removeAttribute(key) { delete this.attributes[key] }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = []
    this.eventListeners[event].push(handler)
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler)
    }
  }

  querySelectorAll(selector) {
    if (selector === 'tr') return this._findAllDeep(el => el.tagName === 'TR')
    if (selector === 'td') return this._findAllDeep(el => el.tagName === 'TD')
    if (selector === 'a') return this._findAllDeep(el => el.tagName === 'A')
    return []
  }

  _findAllDeep(predicate) {
    const results = []
    for (const child of this.childNodes) {
      if (predicate(child)) results.push(child)
      if (child._findAllDeep) results.push(...child._findAllDeep(predicate))
    }
    return results
  }
}

const mockDocument = {
  _elements: new Map(),
  createElement(tag) { return new MockElement(tag) },
  createTextNode(text) {
    const el = new MockElement('#text')
    el._textContent = text
    return el
  },
  getElementById(id) { return this._elements.get(id) || null },
  querySelector() { return null },
  createDocumentFragment() {
    return {
      nodeType: 11,
      childNodes: [],
      appendChild(child) { this.childNodes.push(child); return child },
    }
  },
}

// ============================================================
// Helpers
// ============================================================

function setupContainer(id) {
  const container = new MockElement('div')
  container.id = id
  mockDocument._elements.set(id, container)
  return container
}

function cleanupContainer(id) {
  mockDocument._elements.delete(id)
}

function countTrElements(container) {
  return container.querySelectorAll('tr').length
}

function getRowIds(container) {
  const trs = container.querySelectorAll('tr')
  const ids = []
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 0 && tds[0].childNodes.length > 0) {
      const textNode = tds[0].childNodes[0]
      const id = parseInt(textNode._textContent, 10)
      if (!isNaN(id)) ids.push(id)
    }
  }
  return ids
}

function getRowLabels(container) {
  const trs = container.querySelectorAll('tr')
  const labels = []
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 1) {
      const anchors = tds[1].querySelectorAll('a')
      if (anchors.length > 0 && anchors[0].childNodes.length > 0) {
        labels.push(anchors[0].childNodes[0]._textContent)
      }
    }
  }
  return labels
}

function getSelectedRowIndices(container) {
  const trs = container.querySelectorAll('tr')
  const selected = []
  for (let i = 1; i < trs.length; i++) {
    const tds = trs[i].querySelectorAll('td')
    if (tds.length > 2 && tds[2].className === 'danger') {
      selected.push(i - 1)
    }
  }
  return selected
}

// ============================================================
// Simple test assertions
// ============================================================

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) {
    failed++
    console.log(`  FAIL: ${message}`)
    throw new Error(message)
  }
}

function assertEqual(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    failed++
    console.log(`  FAIL: ${message} (expected ${expected}, got ${actual})`)
    throw new Error(message)
  }
}

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (e) {
    if (!e.message.startsWith('FAIL:')) {
      console.log(`  ERROR in "${name}": ${e.message}`)
    }
  }
}

// ============================================================
// Load the IIFE bundle
// ============================================================

const fs = require('fs')
const path = require('path')
const bundlePath = path.join(__dirname, '..', 'lytjs', 'dist', 'js-framework-benchmark.js')

if (!fs.existsSync(bundlePath)) {
  console.error('ERROR: Bundle not found. Run build-benchmark-bundle.js first.')
  process.exit(1)
}

const bundleCode = fs.readFileSync(bundlePath, 'utf-8')
const vm = require('vm')
const sandbox = {
  document: mockDocument,
  console,
  window: {},
  self: {},
  module: { exports: {} },
  exports: {},
  define: { amd: {} },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  performance: { now: () => Date.now() },
}
vm.createContext(sandbox)
vm.runInContext(bundleCode, sandbox)

const bm = sandbox.LytBenchmark || sandbox.module.exports

if (!bm) {
  console.error('ERROR: LytBenchmark not found in bundle')
  process.exit(1)
}

console.log('Testing Lyt.js Signal-Optimized Benchmark (IIFE Bundle)')
console.log('='.repeat(60))

// ============================================================
// Keyed Signal Tests
// ============================================================

console.log('\n--- Keyed Signal Tests ---')

test('createElement returns handle', () => {
  setupContainer('test-1')
  const result = bm.createElement('test-1')
  assert(!!result.container, 'container should exist')
  assert(typeof result.destroy === 'function', 'destroy should be a function')
  cleanupContainer('test-1')
})

test('runBenchmark renders 1000 rows', () => {
  setupContainer('test-2')
  bm.createElement('test-2')
  bm.runBenchmark()
  const el = sandbox.document.getElementById('test-2')
  assertEqual(el.querySelectorAll('tr').length, 1001, 'should have 1001 tr elements')
  cleanupContainer('test-2')
})

test('runBenchmark renders correct IDs', () => {
  setupContainer('test-3')
  bm.createElement('test-3')
  bm.runBenchmark()
  const el = sandbox.document.getElementById('test-3')
  const ids = getRowIds(el)
  assertEqual(ids.length, 1000, 'should have 1000 data rows')
  assertEqual(ids[0], 1, 'first row id should be 1')
  assertEqual(ids[999], 1000, 'last row id should be 1000')
  cleanupContainer('test-3')
})

test('addRow adds one row', () => {
  setupContainer('test-4')
  bm.createElement('test-4')
  bm.runBenchmark()
  bm.addRow()
  const el = sandbox.document.getElementById('test-4')
  assertEqual(el.querySelectorAll('tr').length, 1002, 'should have 1002 tr elements')
  const ids = getRowIds(el)
  assertEqual(ids.length, 1001, 'should have 1001 data rows')
  assertEqual(ids[1000], 1001, 'new row id should be 1001')
  cleanupContainer('test-4')
})

test('updateEvery10thRow updates correct rows', () => {
  setupContainer('test-5')
  bm.createElement('test-5')
  bm.runBenchmark()
  bm.updateEvery10thRow()
  const el = sandbox.document.getElementById('test-5')
  const labels = getRowLabels(el)
  assertEqual(labels[9], 'Row 10 !!!', 'row 10 should be updated')
  assertEqual(labels[19], 'Row 20 !!!', 'row 20 should be updated')
  assertEqual(labels[0], 'Row 1', 'row 1 should not be updated')
  assertEqual(labels[4], 'Row 5', 'row 5 should not be updated')
  cleanupContainer('test-5')
})

test('swapRows swaps rows 1 and 2', () => {
  setupContainer('test-6')
  bm.createElement('test-6')
  bm.runBenchmark()
  bm.swapRows()
  const el = sandbox.document.getElementById('test-6')
  const ids = getRowIds(el)
  assertEqual(ids[0], 2, 'first row should have id 2')
  assertEqual(ids[1], 1, 'second row should have id 1')
  assertEqual(ids[2], 3, 'third row should have id 3')
  cleanupContainer('test-6')
})

test('removeRow removes last row', () => {
  setupContainer('test-7')
  bm.createElement('test-7')
  bm.runBenchmark()
  bm.removeRow()
  const el = sandbox.document.getElementById('test-7')
  assertEqual(el.querySelectorAll('tr').length, 1000, 'should have 1000 tr elements')
  const ids = getRowIds(el)
  assertEqual(ids.length, 999, 'should have 999 data rows')
  assertEqual(ids[998], 999, 'last row id should be 999')
  cleanupContainer('test-7')
})

test('selectRow marks a row as selected', () => {
  setupContainer('test-8')
  bm.createElement('test-8')
  bm.runBenchmark()
  bm.selectRow(50)
  const el = sandbox.document.getElementById('test-8')
  const selected = getSelectedRowIndices(el)
  assertEqual(selected.length, 1, 'should have 1 selected row')
  assertEqual(selected[0], 50, 'selected row index should be 50')
  cleanupContainer('test-8')
})

test('selectRow updates selection', () => {
  setupContainer('test-9')
  bm.createElement('test-9')
  bm.runBenchmark()
  bm.selectRow(10)
  bm.selectRow(20)
  const el = sandbox.document.getElementById('test-9')
  const selected = getSelectedRowIndices(el)
  assertEqual(selected.length, 1, 'should have 1 selected row')
  assertEqual(selected[0], 20, 'selected row index should be 20')
  cleanupContainer('test-9')
})

test('destroy cleans up', () => {
  setupContainer('test-10')
  const handle = bm.createElement('test-10')
  bm.runBenchmark()
  const el = sandbox.document.getElementById('test-10')
  assert(el.querySelectorAll('tr').length > 0, 'should have rows before destroy')
  handle.destroy()
  assertEqual(el.childNodes.length, 0, 'container should be empty after destroy')
  cleanupContainer('test-10')
})

// ============================================================
// Non-Keyed Signal Tests
// ============================================================

console.log('\n--- Non-Keyed Signal Tests ---')

test('non-keyed: runBenchmark renders 1000 rows', () => {
  setupContainer('nks-1')
  bm.createElementNonKeyed('nks-1')
  bm.runBenchmarkNonKeyed()
  const el = sandbox.document.getElementById('nks-1')
  assertEqual(el.querySelectorAll('tr').length, 1001, 'should have 1001 tr elements')
  cleanupContainer('nks-1')
})

test('non-keyed: addRow adds one row', () => {
  setupContainer('nks-2')
  bm.createElementNonKeyed('nks-2')
  bm.runBenchmarkNonKeyed()
  bm.addRowNonKeyed()
  const el = sandbox.document.getElementById('nks-2')
  const ids = getRowIds(el)
  assertEqual(ids.length, 1001, 'should have 1001 data rows')
  cleanupContainer('nks-2')
})

test('non-keyed: updateEvery10thRow updates correct rows', () => {
  setupContainer('nks-3')
  bm.createElementNonKeyed('nks-3')
  bm.runBenchmarkNonKeyed()
  bm.updateEvery10thRowNonKeyed()
  const el = sandbox.document.getElementById('nks-3')
  const labels = getRowLabels(el)
  assertEqual(labels[9], 'Row 10 !!!', 'row 10 should be updated')
  assertEqual(labels[0], 'Row 1', 'row 1 should not be updated')
  cleanupContainer('nks-3')
})

test('non-keyed: swapRows swaps rows 1 and 2', () => {
  setupContainer('nks-4')
  bm.createElementNonKeyed('nks-4')
  bm.runBenchmarkNonKeyed()
  bm.swapRowsNonKeyed()
  const el = sandbox.document.getElementById('nks-4')
  const ids = getRowIds(el)
  assertEqual(ids[0], 2, 'first row should have id 2')
  assertEqual(ids[1], 1, 'second row should have id 1')
  cleanupContainer('nks-4')
})

test('non-keyed: removeRow removes last row', () => {
  setupContainer('nks-5')
  bm.createElementNonKeyed('nks-5')
  bm.runBenchmarkNonKeyed()
  bm.removeRowNonKeyed()
  const el = sandbox.document.getElementById('nks-5')
  const ids = getRowIds(el)
  assertEqual(ids.length, 999, 'should have 999 data rows')
  cleanupContainer('nks-5')
})

test('non-keyed: selectRow marks a row as selected', () => {
  setupContainer('nks-6')
  bm.createElementNonKeyed('nks-6')
  bm.runBenchmarkNonKeyed()
  bm.selectRowNonKeyed(30)
  const el = sandbox.document.getElementById('nks-6')
  const selected = getSelectedRowIndices(el)
  assertEqual(selected.length, 1, 'should have 1 selected row')
  assertEqual(selected[0], 30, 'selected row index should be 30')
  cleanupContainer('nks-6')
})

test('non-keyed: destroy cleans up', () => {
  setupContainer('nks-7')
  const handle = bm.createElementNonKeyed('nks-7')
  bm.runBenchmarkNonKeyed()
  handle.destroy()
  const el = sandbox.document.getElementById('nks-7')
  assertEqual(el.childNodes.length, 0, 'container should be empty after destroy')
  cleanupContainer('nks-7')
})

// ============================================================
// Summary
// ============================================================

console.log('\n' + '='.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) {
  process.exit(1)
} else {
  console.log('All tests passed!')
}
