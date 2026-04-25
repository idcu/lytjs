/**
 * @lytjs/devtools - DevTools 单元测试
 *
 * 测试 DevTools 的工具函数、模块导出和类实例化。
 * 由于 DevTools 依赖浏览器 DOM，部分测试使用模拟环境。
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

// ================================================================
// DOM 模拟环境
// ================================================================

// DevTools 类依赖浏览器 DOM，这里提供最小化的模拟
const mockElements: any[] = []
let mockIdCounter = 0

const mockDocument = {
  createElement(tag: string) {
    const el: any = {
      tagName: tag.toUpperCase(),
      className: '',
      innerHTML: '',
      textContent: '',
      style: {
        setProperty() {},
        getPropertyValue() { return '' },
        removeProperty() {},
        width: '',
        height: '',
        left: '',
        top: '',
        display: '',
        cssText: '',
      },
      childNodes: [] as any[],
      children: [] as any[],
      parentNode: null as any,
      id: '',
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 100,
      offsetHeight: 100,
      getBoundingClientRect() {
        return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }
      },
      appendChild(child: any) {
        this.childNodes.push(child)
        this.children.push(child)
        child.parentNode = this
        return child
      },
      removeChild(child: any) {
        const idx = this.childNodes.indexOf(child)
        if (idx > -1) {
          this.childNodes.splice(idx, 1)
          this.children.splice(idx, 1)
          child.parentNode = null
        }
        return child
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null },
      classList: {
        add() {},
        remove() {},
        toggle() {},
        contains() { return false },
      },
      dataset: {},
      querySelector(selector: string) {
        // Simple selector matching: class or tag
        const matches: any[] = []
        const traverse = (node: any) => {
          if (selector.startsWith('.')) {
            const cls = selector.slice(1)
            if (node.className?.includes(cls)) {
              matches.push(node)
            }
          } else if (node.tagName === selector.toUpperCase()) {
            matches.push(node)
          }
          for (const child of node.children || []) {
            traverse(child)
          }
        }
        for (const child of this.children) {
          traverse(child)
        }
        return matches[0] || null
      },
      querySelectorAll(selector: string) {
        const matches: any[] = []
        const traverse = (node: any) => {
          if (selector.startsWith('.')) {
            const cls = selector.slice(1)
            if (node.className?.includes(cls)) {
              matches.push(node)
            }
          } else if (node.tagName === selector.toUpperCase()) {
            matches.push(node)
          }
          for (const child of node.children || []) {
            traverse(child)
          }
        }
        for (const child of this.children) {
          traverse(child)
        }
        return matches
      },
      remove() {},
    }
    el.id = `mock-el-${++mockIdCounter}`
    mockElements.push(el)
    return el
  },
  createDocumentFragment() {
    return {
      childNodes: [] as any[],
      children: [] as any[],
      appendChild(child: any) {
        this.childNodes.push(child)
        this.children.push(child)
        return child
      },
      removeChild(child: any) {
        const idx = this.childNodes.indexOf(child)
        if (idx > -1) this.childNodes.splice(idx, 1)
        return child
      },
    }
  },
  documentElement: {
    style: {},
    setProperty() {},
  },
  body: null as any,
  head: null as any,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
}

mockDocument.body = mockDocument.createElement('body')
mockDocument.head = mockDocument.createElement('head')

// 设置全局 document 和 window
;(globalThis as any).document = mockDocument
;(globalThis as any).window = {
  document: mockDocument,
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
  getComputedStyle() { return {}; },
  requestAnimationFrame(fn: Function) { return setTimeout(fn, 0); },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  console,
}
;(globalThis as any).HTMLElement = class {}
;(globalThis as any).Event = class {
  constructor(public type: string) {}
}
;(globalThis as any).CustomEvent = class {
  constructor(public type: string, public detail?: any) {}
}
;(globalThis as any).MutationObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
}

// ================================================================
// 导入 DevTools 模块（在设置好 DOM 模拟之后）
// ================================================================

import {
  DevTools,
  createDevTools,
  DevToolsPanel,
  ComponentTreeInspector,
  StateInspector,
  EventTracker,
  TimeTravelDebugger,
  connectToApp,
  disconnect,
  isAppConnected,
  getComponentCount,
  getAllComponents,
  getRootComponent,
  getComponentById,
  getEventRecords,
  getStateChangeRecords,
  clearRecords,
  refreshComponentTree,
} from '../src/index'

// ================================================================
// 辅助函数
// ================================================================

function expectInstanceOf(value: any, cls: any) {
  expect(value).toBeDefined()
  expect(value.constructor).toBe(cls)
}

// ================================================================
// 测试套件
// ================================================================

describe('@lytjs/devtools - DevTools 类', () => {
  it('DevTools 类可以实例化', () => {
    // DevTools 构造函数会创建面板 DOM，需要 DOM 环境
    const devtools = new DevTools()
    expect(devtools).toBeDefined()
    expectInstanceOf(devtools, DevTools)
    // 清理
    devtools.destroy()
  })

  it('DevTools 有 show/hide/toggle 方法', () => {
    const devtools = new DevTools()
    expect(typeof devtools.show).toBe('function')
    expect(typeof devtools.hide).toBe('function')
    expect(typeof devtools.toggle).toBe('function')
    expect(typeof devtools.isVisible).toBe('function')
    devtools.destroy()
  })

  it('DevTools 有 refreshTree/clearAllRecords 方法', () => {
    const devtools = new DevTools()
    expect(typeof devtools.refreshTree).toBe('function')
    expect(typeof devtools.clearAllRecords).toBe('function')
    devtools.destroy()
  })

  it('DevTools 有 getPanel/getComponentTree 等获取器方法', () => {
    const devtools = new DevTools()
    expect(typeof devtools.getPanel).toBe('function')
    expect(typeof devtools.getComponentTree).toBe('function')
    expect(typeof devtools.getStateInspector).toBe('function')
    expect(typeof devtools.getEventTracker).toBe('function')
    expect(typeof devtools.getTimeTravel).toBe('function')
    devtools.destroy()
  })

  it('DevTools destroy 方法可以正常调用', () => {
    const devtools = new DevTools()
    expect(() => devtools.destroy()).not.toThrow()
  })
})

describe('@lytjs/devtools - createDevTools 工厂函数', () => {
  it('createDevTools 工厂函数返回插件格式对象（有 install 方法）', () => {
    const plugin = createDevTools()
    expect(plugin).toBeDefined()
    expect(typeof plugin).toBe('object')
    expect(typeof plugin.install).toBe('function')
  })

  it('createDevTools 可以接受配置参数', () => {
    const plugin = createDevTools({
      width: 480,
      height: 640,
      autoShow: false,
      title: 'Test DevTools',
    })
    expect(plugin).toBeDefined()
    expect(typeof plugin.install).toBe('function')
  })
})

describe('@lytjs/devtools - 子模块类', () => {
  it('ComponentTreeInspector 类可以实例化', () => {
    // ComponentTreeInspector 需要 panel 参数，创建一个 mock panel
    const mockPanel = {
      registerTabRenderer() {},
      switchTab() {},
      setConnected() {},
    } as any
    const inspector = new ComponentTreeInspector(mockPanel, () => {})
    expect(inspector).toBeDefined()
    expectInstanceOf(inspector, ComponentTreeInspector)
  })

  it('StateInspector 类可以实例化', () => {
    const mockPanel = {} as any
    const inspector = new StateInspector(mockPanel)
    expect(inspector).toBeDefined()
    expectInstanceOf(inspector, StateInspector)
  })

  it('EventTracker 类可以实例化', () => {
    const mockPanel = {} as any
    const tracker = new EventTracker(mockPanel)
    expect(tracker).toBeDefined()
    expectInstanceOf(tracker, EventTracker)
  })

  it('TimeTravelDebugger 类可以实例化', () => {
    const mockPanel = {} as any
    const debugger_ = new TimeTravelDebugger(mockPanel)
    expect(debugger_).toBeDefined()
    expectInstanceOf(debugger_, TimeTravelDebugger)
  })

  it('DevToolsPanel 类可以实例化', () => {
    const panel = new DevToolsPanel({
      width: 400,
      height: 500,
      title: 'Test Panel',
    })
    expect(panel).toBeDefined()
    expectInstanceOf(panel, DevToolsPanel)
  })
})

describe('@lytjs/devtools - hooks 模块', () => {
  it('connectToApp 函数存在', () => {
    expect(connectToApp).toBeDefined()
    expect(typeof connectToApp).toBe('function')
  })

  it('disconnect 函数存在', () => {
    expect(disconnect).toBeDefined()
    expect(typeof disconnect).toBe('function')
  })

  it('isAppConnected 初始为 false', () => {
    // 确保初始状态为 false（如果没有连接过）
    expect(isAppConnected()).toBe(false)
  })

  it('getComponentCount 初始为 0', () => {
    // 确保初始状态为 0（如果没有连接过应用）
    expect(getComponentCount()).toBe(0)
  })

  it('getAllComponents 初始返回空数组', () => {
    const components = getAllComponents()
    expect(Array.isArray(components)).toBe(true)
    expect(components.length).toBe(0)
  })

  it('getRootComponent 初始返回 null', () => {
    const root = getRootComponent()
    expect(root).toBeNull()
  })

  it('getComponentById 初始返回 null', () => {
    const comp = getComponentById('non-existent')
    expect(comp).toBeNull()
  })

  it('getEventRecords 初始返回空数组', () => {
    const events = getEventRecords()
    expect(Array.isArray(events)).toBe(true)
    expect(events.length).toBe(0)
  })

  it('getStateChangeRecords 初始返回空数组', () => {
    const records = getStateChangeRecords()
    expect(Array.isArray(records)).toBe(true)
    expect(records.length).toBe(0)
  })

  it('clearRecords 函数存在且可调用', () => {
    expect(clearRecords).toBeDefined()
    expect(typeof clearRecords).toBe('function')
    expect(() => clearRecords()).not.toThrow()
  })

  it('refreshComponentTree 函数存在', () => {
    expect(refreshComponentTree).toBeDefined()
    expect(typeof refreshComponentTree).toBe('function')
  })
})

describe('@lytjs/devtools - 模块导出完整性', () => {
  it('所有主要类从 index.ts 正确导出', () => {
    expect(DevTools).toBeDefined()
    expect(createDevTools).toBeDefined()
    expect(DevToolsPanel).toBeDefined()
    expect(ComponentTreeInspector).toBeDefined()
    expect(StateInspector).toBeDefined()
    expect(EventTracker).toBeDefined()
    expect(TimeTravelDebugger).toBeDefined()
  })

  it('所有 hooks 函数从 index.ts 正确导出', () => {
    expect(connectToApp).toBeDefined()
    expect(disconnect).toBeDefined()
    expect(isAppConnected).toBeDefined()
    expect(getComponentCount).toBeDefined()
    expect(getAllComponents).toBeDefined()
    expect(getRootComponent).toBeDefined()
    expect(getComponentById).toBeDefined()
    expect(getEventRecords).toBeDefined()
    expect(getStateChangeRecords).toBeDefined()
    expect(clearRecords).toBeDefined()
    expect(refreshComponentTree).toBeDefined()
  })
})
