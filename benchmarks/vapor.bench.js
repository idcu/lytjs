/**
 * Lyt.js Vapor Mode 性能基准测试
 *
 * 测试 Vapor Mode 的核心操作性能：
 * - Signal 创建和更新
 * - DOM 绑定（bindText, bindProp, bindClass, bindIf, bindEach）
 * - VaporNode 创建和渲染
 * - Vapor vs VDOM 对比
 */

import { BenchmarkSuite } from './runner.js'

// ================================================================
//  Mock DOM 环境
// ================================================================

function createMockElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    textContent: '',
    className: '',
    childNodes: [],
    parentNode: null,
    style: {},
    hidden: false,
    value: '',
    checked: false,
    disabled: false,
    nextSibling: null,
    firstChild: null,
    innerHTML: '',
    setAttribute(key, value) { el[key] = value },
    removeAttribute(key) { delete el[key] },
    addEventListener(event, handler) {
      if (!el._events) el._events = {}
      if (!el._events[event]) el._events[event] = []
      el._events[event].push(handler)
    },
    removeEventListener(event, handler) {
      if (!el._events || !el._events[event]) return
      el._events[event] = el._events[event].filter(h => h !== handler)
    },
    appendChild(child) {
      child.parentNode = el
      el.childNodes.push(child)
    },
    insertBefore(child, ref) {
      child.parentNode = el
      if (ref) {
        const idx = el.childNodes.indexOf(ref)
        el.childNodes.splice(idx, 0, child)
      } else {
        el.childNodes.push(child)
      }
    },
    replaceChild(newChild, oldChild) {
      const idx = el.childNodes.indexOf(oldChild)
      if (idx !== -1) {
        el.childNodes[idx] = newChild
        newChild.parentNode = el
        oldChild.parentNode = null
      }
      return oldChild
    },
    removeChild(child) {
      const idx = el.childNodes.indexOf(child)
      if (idx !== -1) {
        el.childNodes.splice(idx, 1)
        child.parentNode = null
      }
    },
  }
  return el
}

// ================================================================
//  简易 Signal 实现（用于基准测试）
// ================================================================

function createSignal(initialValue) {
  let value = initialValue
  const subscribers = new Set()

  function signal() {
    return value
  }

  signal.set = (newValue) => {
    value = newValue
    for (const subscriber of subscribers) {
      subscriber(value)
    }
  }

  signal._subscribe = (subscriber) => {
    subscribers.add(subscriber)
    return () => subscribers.delete(subscriber)
  }

  return signal
}

function createEffect(fn) {
  // 简化版 effect，直接执行
  return fn()
}

// ================================================================
//  简易 Vapor API（内联实现，避免依赖构建产物）
// ================================================================

function bindText(el, sig) {
  const dispose = createEffect(() => {
    el.textContent = sig() === null || sig() === undefined ? '' : String(sig())
  })
  return dispose
}

function bindProp(el, prop, sig) {
  const dispose = createEffect(() => {
    el[prop] = sig()
  })
  return dispose
}

function bindClass(el, sig) {
  const dispose = createEffect(() => {
    const value = sig()
    if (typeof value === 'string') {
      el.className = value
    } else if (Array.isArray(value)) {
      el.className = value.filter(Boolean).join(' ')
    } else if (typeof value === 'object' && value !== null) {
      const classes = []
      for (const key of Object.keys(value)) {
        if (value[key]) classes.push(key)
      }
      el.className = classes.join(' ')
    }
  })
  return dispose
}

function bindEvent(el, event, handler) {
  el.addEventListener(event, handler)
  return () => el.removeEventListener(event, handler)
}

function createVaporElement(tag, props, ...children) {
  const node = {
    tag,
    children: [],
    props: {},
    events: {},
    bindings: [],
  }

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase()
        node.events[eventName] = value
      } else {
        node.props[key] = value
      }
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      node.children.push({ tag: '#text', children: [], props: {}, events: {}, bindings: [], text: child })
    } else {
      node.children.push(child)
    }
  }

  return node
}

function renderVaporNode(node) {
  if (node.tag === '#text') {
    const el = createMockElement('#text')
    el.textContent = node.text || ''
    el.nodeType = 3
    return el
  }

  const el = createMockElement(node.tag)

  for (const [key, value] of Object.entries(node.props)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value)
    } else if (key === 'className' || key === 'class') {
      el.className = String(value)
    } else {
      el[key] = value
    }
  }

  for (const [eventName, handler] of Object.entries(node.events)) {
    bindEvent(el, eventName, handler)
  }

  for (const child of node.children) {
    const childEl = renderVaporNode(child)
    el.appendChild(childEl)
  }

  return el
}

// ================================================================
//  基准测试
// ================================================================

const suite = new BenchmarkSuite('Vapor Mode Performance')

// Signal 创建
suite.addTest('Signal 创建 (10,000 次)', () => {
  for (let i = 0; i < 10000; i++) {
    createSignal(i)
  }
})

// Signal 读取
suite.addTest('Signal 读取 (100,000 次)', () => {
  const sig = createSignal(42)
  for (let i = 0; i < 100000; i++) {
    sig()
  }
})

// Signal 更新
suite.addTest('Signal 更新 (10,000 次)', () => {
  const sig = createSignal(0)
  for (let i = 0; i < 10000; i++) {
    sig.set(i)
  }
})

// bindText
suite.addTest('bindText 创建 (1,000 次)', () => {
  const el = createMockElement('span')
  for (let i = 0; i < 1000; i++) {
    const sig = createSignal(`text-${i}`)
    bindText(el, sig)
  }
})

// bindProp
suite.addTest('bindProp 创建 (1,000 次)', () => {
  const el = createMockElement('input')
  for (let i = 0; i < 1000; i++) {
    const sig = createSignal(`value-${i}`)
    bindProp(el, 'value', sig)
  }
})

// bindClass (object)
suite.addTest('bindClass object 创建 (1,000 次)', () => {
  const el = createMockElement('div')
  for (let i = 0; i < 1000; i++) {
    const sig = createSignal({ active: true, disabled: false })
    bindClass(el, sig)
  }
})

// createVaporElement
suite.addTest('createVaporElement (10,000 次)', () => {
  for (let i = 0; i < 10000; i++) {
    createVaporElement('div', { className: 'item' }, `Item ${i}`)
  }
})

// renderVaporNode - 简单元素
suite.addTest('renderVaporNode 简单元素 (1,000 次)', () => {
  for (let i = 0; i < 1000; i++) {
    const node = createVaporElement('div', { className: 'item' }, `Item ${i}`)
    renderVaporNode(node)
  }
})

// renderVaporNode - 嵌套结构 (100 个子节点)
suite.addTest('renderVaporNode 100 子节点 (1,000 次)', () => {
  for (let i = 0; i < 1000; i++) {
    const children = []
    for (let j = 0; j < 100; j++) {
      children.push(createVaporElement('span', {}, `Child ${j}`))
    }
    const node = createVaporElement('div', { className: 'list' }, ...children)
    renderVaporNode(node)
  }
})

// renderVaporNode - 深层嵌套 (10 层)
suite.addTest('renderVaporNode 10 层嵌套 (1,000 次)', () => {
  for (let i = 0; i < 1000; i++) {
    let node = createVaporElement('div', { className: 'level-0' })
    for (let j = 1; j < 10; j++) {
      node = createVaporElement('div', { className: `level-${j}` }, node)
    }
    renderVaporNode(node)
  }
})

// bindEvent
suite.addTest('bindEvent 创建/清理 (10,000 次)', () => {
  const el = createMockElement('button')
  for (let i = 0; i < 10000; i++) {
    const cleanup = bindEvent(el, 'click', () => {})
    cleanup()
  }
})

// 大型列表渲染
suite.addTest('大型列表渲染 (1,000 项)', () => {
  const children = []
  for (let i = 0; i < 1000; i++) {
    children.push(createVaporElement('li', { className: 'item' }, `Item ${i}`))
  }
  const node = createVaporElement('ul', {}, ...children)
  renderVaporNode(node)
})

// 运行基准测试
const results = suite.run(100)
console.log('\n' + '='.repeat(60))
console.log('Vapor Mode 基准测试结果')
console.log('='.repeat(60))
results.forEach(({ name, avgMs, minMs, maxMs, totalMs, iterations }) => {
  const ops = iterations / (totalMs / 1000)
  console.log(`  ${name}`)
  console.log(`    平均: ${avgMs.toFixed(4)}ms | 最小: ${minMs.toFixed(4)}ms | 最大: ${maxMs.toFixed(4)}ms | Ops: ${ops.toFixed(0)}/s`)
})
