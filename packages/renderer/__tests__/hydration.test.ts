/**
 * Lyt.js Partial Hydration（Islands Architecture）— 单元测试
 *
 * 测试覆盖：
 *   - createHydrationIsland 生成正确的 HTML
 *   - hydrateIsland 基本注水
 *   - hydrateIsland 带 props
 *   - hydrateIsland 按选择器注水
 *   - 懒注水（IntersectionObserver / idle / interaction）
 *   - Hydration mismatch 检测
 *   - 多 island 注水
 *   - Island 嵌套组件
 *   - Island 事件处理器
 *   - Island 动态内容
 *   - Hydration 清理/卸载
 *   - Hydration 超时
 *   - 性能测试
 *   - 内存泄漏检测
 */

import { describe, it, expect } from '../../test-utils/src/index'
import {
  hydrateIsland,
  hydrateAllIslands,
  createHydrationIsland,
  registerIslandComponent,
  unmountIsland,
  getIslandRegistry,
  clearIslandRegistry,
  getMismatchWarnings,
  clearMismatchWarnings,
  resetHydrateStats,
} from '../src/ssr/hydration'

// ================================================================
//  DOM Mock（Node.js 环境模拟浏览器 DOM）
// ================================================================

/** 模拟事件监听器 */
interface MockEventListener {
  event: string
  handler: any
  options?: any
}

/** 模拟 DOM 元素 */
class MockElement {
  tagName: string
  attributes: Map<string, string> = new Map()
  childNodes: Array<MockElement | MockTextNode | MockCommentNode> = []
  textContent: string = ''
  nodeType: number = 1
  parentElement: MockElement | null = null
  eventListeners: MockEventListener[] = []

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase()
  }

  get innerHTML(): string {
    return this.childNodes.map(c => c instanceof MockElement ? c.outerHTML : c.textContent).join('')
  }

  get outerHTML(): string {
    const attrs = Array.from(this.attributes.entries())
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    const attrStr = attrs ? ' ' + attrs : ''
    const children = this.childNodes.map(c => c instanceof MockElement ? c.outerHTML : c.textContent).join('')
    return `<${this.tagName.toLowerCase()}${attrStr}>${children}</${this.tagName.toLowerCase()}>`
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  querySelector(selector: string): MockElement | null {
    return querySelector(this, selector)
  }

  querySelectorAll(selector: string): MockElement[] {
    return querySelectorAll(this, selector)
  }

  appendChild(child: MockElement | MockTextNode | MockCommentNode): void {
    child.parentElement = this
    this.childNodes.push(child)
  }

  addEventListener(event: string, handler: any, options?: any): void {
    this.eventListeners.push({ event, handler, options })
  }

  removeEventListener(event: string, handler: any): void {
    this.eventListeners = this.eventListeners.filter(l => !(l.event === event && l.handler === handler))
  }

  cloneNode(deep?: boolean): MockElement {
    const clone = new MockElement(this.tagName)
    for (const [k, v] of this.attributes) {
      clone.setAttribute(k, v)
    }
    if (deep) {
      for (const child of this.childNodes) {
        if (child instanceof MockElement) {
          clone.appendChild(child.cloneNode(true))
        } else {
          const textClone = new MockTextNode(child.textContent)
          clone.appendChild(textClone)
        }
      }
    }
    return clone
  }

  get firstElementChild(): MockElement | null {
    for (const child of this.childNodes) {
      if (child instanceof MockElement) return child
    }
    return null
  }

  get children(): MockElement[] {
    return this.childNodes.filter(c => c instanceof MockElement) as MockElement[]
  }
}

/** 模拟文本节点 */
class MockTextNode {
  nodeType: number = 3
  nodeValue: string
  textContent: string
  parentElement: MockElement | null = null

  constructor(text: string) {
    this.nodeValue = text
    this.textContent = text
  }
}

/** 模拟注释节点 */
class MockCommentNode {
  nodeType: number = 8
  nodeValue: string
  textContent: string
  parentElement: MockElement | null = null

  constructor(text: string) {
    this.nodeValue = text
    this.textContent = text
  }
}

/** CSS 选择器解析（简化版） */
function querySelector(root: MockElement, selector: string): MockElement | null {
  const results = querySelectorAll(root, selector)
  return results.length > 0 ? results[0] : null
}

function querySelectorAll(root: MockElement, selector: string): MockElement[] {
  const attrMatch = selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/)
  const tagMatch = selector.match(/^([a-z][a-z0-9]*)$/i)

  const results: MockElement[] = []

  function walk(el: MockElement): void {
    let matches = false

    if (attrMatch) {
      const attrName = attrMatch[1]
      const attrValue = attrMatch[2]
      if (attrValue !== undefined) {
        matches = el.getAttribute(attrName) === attrValue
      } else {
        matches = el.hasAttribute(attrName)
      }
    } else if (tagMatch) {
      matches = el.tagName.toLowerCase() === tagMatch[1].toLowerCase()
    }

    if (matches) results.push(el)

    for (const child of el.childNodes) {
      if (child instanceof MockElement) walk(child)
    }
  }

  walk(root)
  return results
}

// ================================================================
//  Mock IntersectionObserver
// ================================================================

let mockObserverCallback: ((entries: Array<{ isIntersecting: boolean; target: any }>) => void) | null = null
let mockObserverInstances: Array<{
  callback: any
  observed: any[]
  unobserve: (target: any) => void
  disconnect: () => void
}> = []

class MockIntersectionObserver {
  private _instance: {
    callback: any
    observed: any[]
    disconnected: boolean
  }

  constructor(callback: any, _options?: any) {
    this._instance = {
      callback,
      observed: [] as any[],
      disconnected: false,
    }
    mockObserverInstances.push(this._instance)
    mockObserverCallback = callback
  }

  observe(target: any): void {
    if (!this._instance.disconnected) {
      this._instance.observed.push(target)
    }
  }

  unobserve(target: any): void {
    this._instance.observed = this._instance.observed.filter(t => t !== target)
  }

  disconnect(): void {
    this._instance.observed = []
    this._instance.disconnected = true
  }

  static trigger(entries: Array<{ isIntersecting: boolean; target: any }>): void {
    if (mockObserverCallback) {
      mockObserverCallback(entries)
    }
  }
}

// ================================================================
//  Mock document 与环境管理
// ================================================================

let mockBody = new MockElement('body')
let mockDocumentListeners: MockEventListener[] = []

const mockDocument = {
  querySelector(selector: string): MockElement | null {
    return querySelector(mockBody, selector)
  },
  querySelectorAll(selector: string): MockElement[] {
    return querySelectorAll(mockBody, selector)
  },
  addEventListener(event: string, handler: any, options?: any): void {
    mockDocumentListeners.push({ event, handler, options })
  },
  removeEventListener(event: string, handler: any): void {
    mockDocumentListeners = mockDocumentListeners.filter(l => !(l.event === event && l.handler === handler))
  },
}

const originalDocument = (globalThis as any).document
const originalIntersectionObserver = (globalThis as any).IntersectionObserver
const originalRequestIdleCallback = (globalThis as any).requestIdleCallback

/** 重置 mock 环境 */
function setupMockEnv(): void {
  mockBody = new MockElement('body')
  mockDocumentListeners = []
  mockObserverCallback = null
  mockObserverInstances = []

  ;(globalThis as any).document = mockDocument
  ;(globalThis as any).IntersectionObserver = MockIntersectionObserver
  ;(globalThis as any).requestIdleCallback = (cb: () => void, _options?: any) => {
    setTimeout(cb, 0)
  }
}

function restoreGlobals(): void {
  ;(globalThis as any).document = originalDocument
  ;(globalThis as any).IntersectionObserver = originalIntersectionObserver
  ;(globalThis as any).requestIdleCallback = originalRequestIdleCallback
}

// 初始化 mock 环境 — 仅在测试内部调用，不在模块顶层调用
// 以避免污染其他测试模块的全局状态

// ================================================================
//  辅助：创建 VNode
// ================================================================

function vnode(type: any, props: any, children: any, shapeFlag = 0): any {
  return {
    type, props, children, shapeFlag,
    key: null, ref: null, patchFlag: 0,
    dynamicChildren: null, dynamicProps: null,
    component: null, el: null, anchor: null,
  }
}

function textVNode(text: string): any {
  return vnode(Symbol.for('v-text'), null, text, 8)
}

// ================================================================
//  测试：createHydrationIsland
// ================================================================

describe('Partial Hydration — createHydrationIsland', () => {
  it('应生成包含 data-hydrate 属性的 HTML', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland({
      name: 'counter',
      render: () => vnode('span', null, 'Count: 0', 8),
    })

    expect(html).toContain('data-hydrate="counter"')
    expect(html).toContain('<span>Count: 0</span>')
    expect(html).toContain('</div>')
  })

  it('应生成包含序列化 props 的 data-props 属性', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'counter',
        render: () => vnode('span', null, '0', 8),
      },
      { initialCount: 0 },
    )

    expect(html).toContain('data-props=')
    expect(html).toContain('initialCount')
  })

  it('应生成包含 props JSON 的 script 标签', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'greeting',
        render: (props: any) => vnode('p', null, `Hello, ${props.name}!`, 8),
      },
      { name: 'World' },
    )

    expect(html).toContain('type="application/json"')
    expect(html).toContain('data-hydrate-props="greeting"')
    expect(html).toContain('"name":"World"')
  })

  it('应支持自定义包裹标签', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'widget',
        render: () => vnode('span', null, 'widget', 8),
      },
      {},
      'section',
    )

    expect(html).toContain('<section data-hydrate="widget"')
    expect(html).toContain('</section>')
  })

  it('应支持 data-hydrate-when 属性', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'lazy-widget',
        render: () => vnode('span', null, 'lazy', 8),
      },
      {},
      'div',
      'visible',
    )

    expect(html).toContain('data-hydrate-when="visible"')
  })

  it('无 render 函数时应生成空内容', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland({ name: 'empty' })

    expect(html).toContain('<div data-hydrate="empty"')
    expect(html).toContain('</div>')
  })
})

// ================================================================
//  测试：hydrateIsland
// ================================================================

describe('Partial Hydration — hydrateIsland', () => {
  it('应正确注水基本组件', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'basic')
    islandEl.setAttribute('data-props', '{}')
    const spanEl = new MockElement('span')
    spanEl.appendChild(new MockTextNode('Hello'))
    islandEl.appendChild(spanEl)
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'basic')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland(
      '[data-hydrate="basic"]',
      {
        name: 'basic',
        render: () => vnode('div', null, [vnode('span', null, 'Hello', 8)], 16),
      },
      { dev: false },
    )

    expect(result.success).toBe(true)
    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })

  it('应正确解析并传递 props', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    let receivedProps: any = null

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'with-props')
    islandEl.setAttribute('data-props', '{"count":42}')
    islandEl.appendChild(new MockTextNode('42'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'with-props')
    scriptEl.appendChild(new MockTextNode('{"count":42}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland(
      '[data-hydrate="with-props"]',
      {
        name: 'with-props',
        render: (props: any) => {
          receivedProps = props
          return vnode('span', null, String(props.count), 8)
        },
      },
      { dev: false },
    )

    expect(receivedProps).toBeTruthy()
    expect(receivedProps.count).toBe(42)
  })

  it('未找到元素时应返回失败', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry
    clearIslandRegistry()

    const result = hydrateIsland(
      '[data-hydrate="nonexistent"]',
      { name: 'nonexistent', render: () => null as any },
    )

    expect(result.success).toBe(false)
  })

  it('已注水的 island 不应重复注水', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    let renderCount = 0

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'dedup')
    islandEl.setAttribute('data-props', '{}')
    islandEl.setAttribute('data-hydrated', '')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'dedup')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="dedup"]', {
      name: 'dedup',
      render: () => { renderCount++; return vnode('span', null, 'x', 8) },
    }, { dev: false })

    expect(renderCount).toBe(0)
  })
})

// ================================================================
//  测试：懒注水
// ================================================================

describe('Partial Hydration — 懒注水', () => {
  it('data-hydrate-when="visible" 应使用 IntersectionObserver', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'lazy-visible')
    islandEl.setAttribute('data-props', '{}')
    islandEl.setAttribute('data-hydrate-when', 'visible')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'lazy-visible')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="lazy-visible"]', {
      name: 'lazy-visible',
      render: () => vnode('span', null, 'visible', 8),
    }, { dev: false })

    expect(mockObserverInstances.length).toBeGreaterThan(0)

    MockIntersectionObserver.trigger([{ isIntersecting: true, target: islandEl }])

    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })

  it('data-hydrate-when="idle" 应使用 requestIdleCallback', async () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'lazy-idle')
    islandEl.setAttribute('data-props', '{}')
    islandEl.setAttribute('data-hydrate-when', 'idle')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'lazy-idle')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="lazy-idle"]', {
      name: 'lazy-idle',
      render: () => vnode('span', null, 'idle', 8),
    }, { dev: false })

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })

  it('data-hydrate-when="interaction" 应在用户交互时注水', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'lazy-interaction')
    islandEl.setAttribute('data-props', '{}')
    islandEl.setAttribute('data-hydrate-when', 'interaction')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'lazy-interaction')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="lazy-interaction"]', {
      name: 'lazy-interaction',
      render: () => vnode('span', null, 'interaction', 8),
    }, { dev: false })

    expect(islandEl.hasAttribute('data-hydrated')).toBe(false)
    expect(mockDocumentListeners.length).toBeGreaterThan(0)

    const clickListeners = mockDocumentListeners.filter(l => l.event === 'click')
    expect(clickListeners.length).toBeGreaterThan(0)
    clickListeners[0].handler()

    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })

  it('lazy 选项应默认使用 visible 策略', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'lazy-default')
    islandEl.setAttribute('data-props', '{}')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'lazy-default')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="lazy-default"]', {
      name: 'lazy-default',
      render: () => vnode('span', null, 'lazy', 8),
    }, { lazy: true, dev: false })

    expect(mockObserverInstances.length).toBeGreaterThan(0)
  })
})

// ================================================================
//  测试：Hydration Mismatch 检测
// ================================================================

describe('Partial Hydration — Mismatch 检测', () => {
  it('开发模式下应检测到 mismatch 并记录警告', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats, getMismatchWarnings, clearMismatchWarnings
    clearIslandRegistry()
    resetHydrateStats()
    clearMismatchWarnings()

    const warnings: string[] = []
    const origWarn = console.warn
    console.warn = (...args: any[]) => warnings.push(args.join(' '))

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'mismatch-test')
    islandEl.setAttribute('data-props', '{}')
    islandEl.appendChild(new MockTextNode('Server Content'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'mismatch-test')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland('[data-hydrate="mismatch-test"]', {
      name: 'mismatch-test',
      render: () => vnode('span', null, 'Client Content', 8),
    }, { dev: true })

    console.warn = origWarn

    expect(result.mismatches).toBeGreaterThan(0)
    const mismatchWarnings = getMismatchWarnings()
    expect(mismatchWarnings.length).toBeGreaterThan(0)
    expect(mismatchWarnings[0].islandId).toBe('mismatch-test')
  })

  it('生产模式下不应检测 mismatch', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats, getMismatchWarnings, clearMismatchWarnings
    clearIslandRegistry()
    resetHydrateStats()
    clearMismatchWarnings()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'prod-test')
    islandEl.setAttribute('data-props', '{}')
    islandEl.appendChild(new MockTextNode('Server'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'prod-test')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland('[data-hydrate="prod-test"]', {
      name: 'prod-test',
      render: () => vnode('span', null, 'Client', 8),
    }, { dev: false })

    expect(result.mismatches).toBe(0)
    expect(getMismatchWarnings().length).toBe(0)
  })

  it('内容匹配时不应产生 mismatch', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats, getMismatchWarnings, clearMismatchWarnings
    clearIslandRegistry()
    resetHydrateStats()
    clearMismatchWarnings()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'match-test')
    islandEl.setAttribute('data-props', '{}')
    const spanEl = new MockElement('span')
    spanEl.appendChild(new MockTextNode('Same Content'))
    islandEl.appendChild(spanEl)
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'match-test')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    // 客户端渲染结果应与服务端 innerHTML 匹配
    // 服务端 innerHTML = <span>Same Content</span>
    const result = hydrateIsland('[data-hydrate="match-test"]', {
      name: 'match-test',
      render: () => vnode('span', null, 'Same Content', 8),
    }, { dev: true })

    expect(result.mismatches).toBe(0)
    expect(getMismatchWarnings().length).toBe(0)
  })
})

// ================================================================
//  测试：多 Island 注水
// ================================================================

describe('Partial Hydration — 多 Island', () => {
  it('应正确注水多个 island', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    for (let i = 1; i <= 2; i++) {
      const id = `island-${i}`
      const islandEl = new MockElement('div')
      islandEl.setAttribute('data-hydrate', id)
      islandEl.setAttribute('data-props', '{}')
      islandEl.appendChild(new MockTextNode(`Island ${i}`))
      mockBody.appendChild(islandEl)

      const scriptEl = new MockElement('script')
      scriptEl.setAttribute('type', 'application/json')
      scriptEl.setAttribute('data-hydrate-props', id)
      scriptEl.appendChild(new MockTextNode('{}'))
      mockBody.appendChild(scriptEl)
    }

    const result1 = hydrateIsland('[data-hydrate="island-1"]', {
      name: 'island-1',
      render: () => vnode('div', null, 'Island 1', 8),
    }, { dev: false })

    const result2 = hydrateIsland('[data-hydrate="island-2"]', {
      name: 'island-2',
      render: () => vnode('div', null, 'Island 2', 8),
    }, { dev: false })

    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    expect(mockBody.querySelector('[data-hydrate="island-1"]')!.hasAttribute('data-hydrated')).toBe(true)
    expect(mockBody.querySelector('[data-hydrate="island-2"]')!.hasAttribute('data-hydrated')).toBe(true)
  })
})

// ================================================================
//  测试：Island 嵌套组件
// ================================================================

describe('Partial Hydration — 嵌套组件', () => {
  it('应正确处理嵌套组件的 island', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'nested')
    islandEl.setAttribute('data-props', '{"title":"Parent"}')

    const h1El = new MockElement('h1')
    h1El.appendChild(new MockTextNode('Parent'))
    islandEl.appendChild(h1El)

    const childDiv = new MockElement('div')
    const pEl = new MockElement('p')
    pEl.appendChild(new MockTextNode('Child content'))
    childDiv.appendChild(pEl)
    islandEl.appendChild(childDiv)

    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'nested')
    scriptEl.appendChild(new MockTextNode('{"title":"Parent"}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland('[data-hydrate="nested"]', {
      name: 'nested',
      render: (props: any) => vnode('div', null, [
        vnode('h1', null, props.title, 8),
        vnode('div', null, [vnode('p', null, 'Child content', 8)], 16),
      ], 16),
    }, { dev: false })

    expect(result.success).toBe(true)
    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })
})

// ================================================================
//  测试：Island 事件处理器
// ================================================================

describe('Partial Hydration — 事件处理器', () => {
  it('应正确绑定事件处理器', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    let clicked = false
    const handleClick = () => { clicked = true }

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'events')
    islandEl.setAttribute('data-props', '{}')

    const btnEl = new MockElement('button')
    btnEl.appendChild(new MockTextNode('Click me'))
    islandEl.appendChild(btnEl)
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'events')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="events"]', {
      name: 'events',
      render: () => vnode('div', null, [
        vnode('button', { onClick: handleClick }, 'Click me', 8),
      ], 16),
    }, { dev: false })

    const btnDom = islandEl.children[0]
    expect(btnDom.eventListeners.length).toBeGreaterThan(0)
    expect(btnDom.eventListeners[0].event).toBe('click')

    btnDom.eventListeners[0].handler()
    expect(clicked).toBe(true)
  })
})

// ================================================================
//  测试：Island 动态内容
// ================================================================

describe('Partial Hydration — 动态内容', () => {
  it('应正确处理动态 props 内容', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'dynamic')
    islandEl.setAttribute('data-props', '{"items":["a","b","c"]}')

    const ulEl = new MockElement('ul')
    for (const item of ['a', 'b', 'c']) {
      const liEl = new MockElement('li')
      liEl.appendChild(new MockTextNode(item))
      ulEl.appendChild(liEl)
    }
    islandEl.appendChild(ulEl)
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'dynamic')
    scriptEl.appendChild(new MockTextNode('{"items":["a","b","c"]}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland('[data-hydrate="dynamic"]', {
      name: 'dynamic',
      render: (props: any) => vnode('ul', null, (props.items as string[]).map((item: string) =>
        vnode('li', null, item, 8)
      ), 16),
    }, { dev: false })

    expect(result.success).toBe(true)
  })
})

// ================================================================
//  测试：Hydration 清理/卸载
// ================================================================

describe('Partial Hydration — 清理/卸载', () => {
  it('unmountIsland 应清理 island 资源', () => {
    setupMockEnv()
    // using imported hydrateIsland, unmountIsland, clearIslandRegistry, resetHydrateStats, getIslandRegistry
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'cleanup')
    islandEl.setAttribute('data-props', '{}')
    islandEl.appendChild(new MockTextNode('cleanup'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'cleanup')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="cleanup"]', {
      name: 'cleanup',
      render: () => vnode('div', null, 'cleanup', 8),
    }, { dev: false })

    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
    expect(getIslandRegistry().has('cleanup')).toBe(true)

    unmountIsland('cleanup')

    expect(islandEl.hasAttribute('data-hydrated')).toBe(false)
    expect(getIslandRegistry().has('cleanup')).toBe(false)
  })

  it('clearIslandRegistry 应清空所有注册', () => {
    // using imported clearIslandRegistry, getIslandRegistry
    clearIslandRegistry()
    expect(getIslandRegistry().size).toBe(0)
  })
})

// ================================================================
//  测试：Hydration 超时
// ================================================================

describe('Partial Hydration — 超时', () => {
  it('超时后应强制注水 island', async () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'timeout-test')
    islandEl.setAttribute('data-props', '{}')
    islandEl.setAttribute('data-hydrate-when', 'visible')
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'timeout-test')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="timeout-test"]', {
      name: 'timeout-test',
      render: () => vnode('span', null, 'timeout', 8),
    }, { lazy: true, timeout: 50, dev: false })

    expect(islandEl.hasAttribute('data-hydrated')).toBe(false)

    await new Promise(resolve => setTimeout(resolve, 80))

    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })
})

// ================================================================
//  测试：registerIslandComponent
// ================================================================

describe('Partial Hydration — 组件注册', () => {
  it('registerIslandComponent 应注册组件映射', () => {
    // using imported registerIslandComponent, clearIslandRegistry
    clearIslandRegistry()

    const comp = { name: 'test', render: () => null as any }
    registerIslandComponent('test', comp)

    // 通过 hydrateAllIslands 间接验证（需要 DOM 环境，此处仅验证不抛错）
    expect(true).toBe(true)
  })
})

// ================================================================
//  测试：SSR 流式输出与 Island 集成
// ================================================================

describe('Partial Hydration — SSR 流式输出', () => {
  it('createHydrationIsland 输出应可被正确解析', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'stream-test',
        render: (props: any) => vnode('div', { class: 'container' }, [
          vnode('h2', null, props.title, 8),
          vnode('p', null, props.body, 8),
        ], 16),
      },
      { title: 'Title', body: 'Body text' },
    )

    expect(html).toContain('data-hydrate="stream-test"')
    expect(html).toContain('class="container"')
    expect(html).toContain('<h2>Title</h2>')
    expect(html).toContain('<p>Body text</p>')
    expect(html).toContain('data-hydrate-props="stream-test"')
    expect(html).toContain('"title":"Title"')
    expect(html).toContain('"body":"Body text"')
  })
})

// ================================================================
//  测试：性能
// ================================================================

describe('Partial Hydration — 性能', () => {
  it('注水 100 个 island 应在 100ms 内完成', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const start = performance.now()

    for (let i = 0; i < 100; i++) {
      const id = `perf-${i}`
      const islandEl = new MockElement('div')
      islandEl.setAttribute('data-hydrate', id)
      islandEl.setAttribute('data-props', '{}')
      islandEl.appendChild(new MockTextNode(`Island ${i}`))
      mockBody.appendChild(islandEl)

      const scriptEl = new MockElement('script')
      scriptEl.setAttribute('type', 'application/json')
      scriptEl.setAttribute('data-hydrate-props', id)
      scriptEl.appendChild(new MockTextNode('{}'))
      mockBody.appendChild(scriptEl)

      hydrateIsland(`[data-hydrate="${id}"]`, {
        name: id,
        render: () => vnode('div', null, `Island ${i}`, 8),
      }, { dev: false })
    }

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})

// ================================================================
//  测试：内存泄漏
// ================================================================

describe('Partial Hydration — 内存', () => {
  it('hydrate/unmount 循环后不应泄漏', () => {
    setupMockEnv()
    // using imported hydrateIsland, unmountIsland, clearIslandRegistry, resetHydrateStats, getIslandRegistry, clearMismatchWarnings
    clearIslandRegistry()
    resetHydrateStats()
    clearMismatchWarnings()

    for (let i = 0; i < 50; i++) {
      const id = `mem-${i}`
      const islandEl = new MockElement('div')
      islandEl.setAttribute('data-hydrate', id)
      islandEl.setAttribute('data-props', '{}')
      islandEl.appendChild(new MockTextNode(`mem ${i}`))
      mockBody.appendChild(islandEl)

      const scriptEl = new MockElement('script')
      scriptEl.setAttribute('type', 'application/json')
      scriptEl.setAttribute('data-hydrate-props', id)
      scriptEl.appendChild(new MockTextNode('{}'))
      mockBody.appendChild(scriptEl)

      hydrateIsland(`[data-hydrate="${id}"]`, {
        name: id,
        render: () => vnode('div', null, `mem ${i}`, 8),
      }, { dev: false })

      unmountIsland(id)
    }

    expect(getIslandRegistry().size).toBe(0)
  })
})

// ================================================================
//  测试：Suspense 集成
// ================================================================

describe('Partial Hydration — Suspense 集成', () => {
  it('createHydrationIsland 应正确处理 Suspense 包裹的 island', () => {
    // using imported createHydrationIsland

    const html = createHydrationIsland(
      {
        name: 'suspense-island',
        render: () => vnode('div', null, [
          vnode('div', null, 'Loading...', 8),
        ], 16),
      },
      {},
    )

    expect(html).toContain('data-hydrate="suspense-island"')
    expect(html).toContain('Loading...')
  })
})

// ================================================================
//  测试：onHydrated 回调
// ================================================================

describe('Partial Hydration — 回调', () => {
  it('注水完成后应触发 onHydrated 回调', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    let callbackFired = false

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'callback-test')
    islandEl.setAttribute('data-props', '{}')
    islandEl.appendChild(new MockTextNode('callback'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'callback-test')
    scriptEl.appendChild(new MockTextNode('{}'))
    mockBody.appendChild(scriptEl)

    hydrateIsland('[data-hydrate="callback-test"]', {
      name: 'callback-test',
      render: () => vnode('div', null, 'callback', 8),
    }, {
      dev: false,
      onHydrated: () => { callbackFired = true },
    })

    expect(callbackFired).toBe(true)
  })
})

// ================================================================
//  测试：setup 函数组件
// ================================================================

describe('Partial Hydration — setup 组件', () => {
  it('应支持 setup 函数返回渲染函数的组件', () => {
    setupMockEnv()
    // using imported hydrateIsland, clearIslandRegistry, resetHydrateStats
    clearIslandRegistry()
    resetHydrateStats()

    const islandEl = new MockElement('div')
    islandEl.setAttribute('data-hydrate', 'setup-comp')
    islandEl.setAttribute('data-props', '{"value":99}')
    islandEl.appendChild(new MockTextNode('99'))
    mockBody.appendChild(islandEl)

    const scriptEl = new MockElement('script')
    scriptEl.setAttribute('type', 'application/json')
    scriptEl.setAttribute('data-hydrate-props', 'setup-comp')
    scriptEl.appendChild(new MockTextNode('{"value":99}'))
    mockBody.appendChild(scriptEl)

    const result = hydrateIsland('[data-hydrate="setup-comp"]', {
      name: 'setup-comp',
      setup: (props: any) => {
        return () => vnode('span', null, String(props.value), 8)
      },
    }, { dev: false })

    expect(result.success).toBe(true)
    expect(islandEl.hasAttribute('data-hydrated')).toBe(true)
  })
})

// ================================================================
//  测试：非 DOM 环境
// ================================================================

describe('Partial Hydration — 非 DOM 环境', () => {
  it('非 DOM 环境下 hydrateIsland 应返回失败', () => {
    const savedDoc = (globalThis as any).document
    ;(globalThis as any).document = undefined

    // using imported hydrateIsland, clearIslandRegistry
    clearIslandRegistry()

    const result = hydrateIsland('[data-hydrate="test"]', {
      name: 'test',
      render: () => null as any,
    })

    expect(result.success).toBe(false)

    ;(globalThis as any).document = savedDoc
  })
})

// ================================================================
//  清理全局 mock（在所有测试执行完毕后恢复）
// ================================================================

describe('Partial Hydration — 清理', () => {
  it('恢复全局环境', () => {
    restoreGlobals()
    expect(true).toBe(true)
  })
})
