/**
 * @lytjs/plugin-virtual-list — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试虚拟列表功能。
 *
 * 测试覆盖：
 *   1. createVirtualList 创建虚拟列表实例
 *   2. 虚拟列表实例包含必要方法
 *   3. setItems 更新数据
 *   4. scrollToIndex 滚动到指定索引
 *   5. scrollTo 滚动到指定位置
 *   6. getVisibleRange 获取可见范围
 *   7. getScrollTop 获取滚动偏移
 *   8. forceUpdate 强制重新渲染
 *   9. getContainer 获取容器元素
 *  10. destroy 销毁虚拟列表
 *  11. 固定高度模式
 *  12. 自定义配置
 */

// DOM mock - must be before source imports
;(globalThis as any).document = {
  createElement(tag: string) {
    return {
      tagName: tag.toUpperCase(),
      style: { cssText: '', setProperty() {}, getPropertyValue() { return '' } },
      className: '',
      innerHTML: '',
      textContent: '',
      scrollTop: 0,
      clientHeight: 400,
      offsetHeight: 400,
      appendChild(child: any) { return child },
      removeChild(child: any) { return child },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() { return null },
      querySelector() { return null },
      querySelectorAll() { return [] },
    }
  },
}

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import { createVirtualList } from '../src/index'

// ================================================================
//  Mock：DOM 环境
// ================================================================

function createMockContainer() {
  const children: any[] = []
  const container: any = {
    children,
    childNodes: children,
    scrollTop: 0,
    clientHeight: 600,
    appendChild(child: any) { children.push(child); return child },
    removeChild(child: any) {
      const idx = children.indexOf(child)
      if (idx >= 0) children.splice(idx, 1)
      return child
    },
    contains(child: any) { return children.includes(child) },
  }
  return container
}

function createMockScrollContainer(container: any) {
  const scrollContainer: any = {
    style: {},
    className: '',
    scrollTop: 0,
    clientHeight: 400,
    appendChild(child: any) { container.appendChild(child) },
    addEventListener() {},
    removeEventListener() {},
  }
  return scrollContainer
}

// ================================================================
//  辅助函数
// ================================================================

function generateItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i}`,
  }))
}

// ================================================================
//  1. createVirtualList 创建虚拟列表实例
// ================================================================

describe('createVirtualList 创建虚拟列表实例', () => {

  it('返回包含必要方法的虚拟列表实例', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    expect(typeof list.setItems).toBe('function')
    expect(typeof list.scrollToIndex).toBe('function')
    expect(typeof list.scrollTo).toBe('function')
    expect(typeof list.getVisibleRange).toBe('function')
    expect(typeof list.getScrollTop).toBe('function')
    expect(typeof list.forceUpdate).toBe('function')
    expect(typeof list.getContainer).toBe('function')
    expect(typeof list.destroy).toBe('function')
    list.destroy()
  })
})

// ================================================================
//  2. setItems 更新数据
// ================================================================

describe('setItems 更新数据', () => {

  it('调用 setItems 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(10),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.setItems(generateItems(20))
    list.destroy()
  })

  it('setItems 空数组', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(10),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.setItems([])
    list.destroy()
  })
})

// ================================================================
//  3. scrollToIndex 滚动到指定索引
// ================================================================

describe('scrollToIndex 滚动到指定索引', () => {

  it('调用 scrollToIndex 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.scrollToIndex(50)
    list.destroy()
  })

  it('scrollToIndex 带对齐方式', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.scrollToIndex(50, 'center')
    list.scrollToIndex(50, 'bottom')
    list.destroy()
  })

  it('scrollToIndex 超出范围不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(10),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.scrollToIndex(-1)
    list.scrollToIndex(999)
    list.destroy()
  })
})

// ================================================================
//  4. scrollTo 滚动到指定位置
// ================================================================

describe('scrollTo 滚动到指定位置', () => {

  it('调用 scrollTo 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.scrollTo(500)
    list.destroy()
  })
})

// ================================================================
//  5. getVisibleRange 获取可见范围
// ================================================================

describe('getVisibleRange 获取可见范围', () => {

  it('返回包含 start 和 end 的对象', () => {
    // Ensure document mock returns elements with scrollTop/clientHeight
    const origCreateElement = (globalThis as any).document.createElement
    ;(globalThis as any).document.createElement = (tag: string) => {
      const el = origCreateElement(tag)
      el.scrollTop = 0
      el.clientHeight = 400
      el.offsetHeight = 400
      return el
    }
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      height: 400,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    const range = list.getVisibleRange()
    expect(range).toBeDefined()
    expect(typeof range.start).toBe('number')
    expect(typeof range.end).toBe('number')
    expect(range.start).toBeLessThanOrEqual(range.end)
    ;(globalThis as any).document.createElement = origCreateElement
    list.destroy()
  })
})

// ================================================================
//  6. getScrollTop 获取滚动偏移
// ================================================================

describe('getScrollTop 获取滚动偏移', () => {

  it('返回数字', () => {
    // Ensure document mock returns elements with scrollTop
    const origCreateElement = (globalThis as any).document.createElement
    ;(globalThis as any).document.createElement = (tag: string) => {
      const el = origCreateElement(tag)
      el.scrollTop = 0
      el.clientHeight = 400
      el.offsetHeight = 400
      return el
    }
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    const scrollTop = list.getScrollTop()
    expect(typeof scrollTop).toBe('number')
    ;(globalThis as any).document.createElement = origCreateElement
    list.destroy()
  })
})

// ================================================================
//  7. forceUpdate 强制重新渲染
// ================================================================

describe('forceUpdate 强制重新渲染', () => {

  it('调用 forceUpdate 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.forceUpdate()
    list.destroy()
  })
})

// ================================================================
//  8. getContainer 获取容器元素
// ================================================================

describe('getContainer 获取容器元素', () => {

  it('返回容器元素', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(10),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    const el = list.getContainer()
    expect(el).toBeDefined()
    list.destroy()
  })
})

// ================================================================
//  9. destroy 销毁虚拟列表
// ================================================================

describe('destroy 销毁虚拟列表', () => {

  it('调用 destroy 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.destroy()
  })

  it('多次 destroy 不报错', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    list.destroy()
    list.destroy()
  })
})

// ================================================================
//  10. 固定高度模式
// ================================================================

describe('固定高度模式', () => {

  it('使用 itemHeight 创建', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(1000),
      itemHeight: 50,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })
})

// ================================================================
//  11. 自定义配置
// ================================================================

describe('自定义配置', () => {

  it('自定义容器高度', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      height: 600,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })

  it('自定义缓冲区大小', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      bufferSize: 10,
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })

  it('自定义容器 CSS 类名', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      itemHeight: 40,
      containerClass: 'my-virtual-list',
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })

  it('使用 estimateHeight 动态高度模式', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(100),
      estimateHeight: 60,
      renderItem: (item) => `<div style="height:${20 + (item.id % 5) * 10}px">${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })

  it('自定义 keyField', () => {
    const container = createMockContainer()
    const list = createVirtualList(container, {
      items: generateItems(10).map((item, i) => ({ ...item, key: `key-${i}` })),
      itemHeight: 40,
      keyField: 'key',
      renderItem: (item) => `<div>${item.text}</div>`,
    })
    expect(list).toBeDefined()
    list.destroy()
  })
})
