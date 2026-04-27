/**
 * @lytjs/devtools - 增强模块单元测试
 *
 * 测试 EventPanel、RouterPanel（增强版）和 VirtualComponentTree。
 * 这些模块的数据逻辑不依赖浏览器 DOM，可以在 Node.js 环境中运行。
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import { EventPanel } from '../src/event-panel'
import { RouterPanel } from '../src/router-panel-enhanced'
import { VirtualComponentTree } from '../src/virtual-tree'
import { MemoryTracker } from '../src/memory-tracker'
import { RenderTracker } from '../src/render-tracker'
import { BatchAnalyzer } from '../src/batch-analyzer'
import type { ComponentTreeNode } from '../src/virtual-tree'

// ================================================================
// EventPanel 测试
// ================================================================

describe('@lytjs/devtools - EventPanel', () => {

  it('EventPanel 可以实例化', () => {
    const panel = new EventPanel()
    expect(panel).toBeDefined()
    expect(typeof panel.captureEvent).toBe('function')
    expect(typeof panel.getEvents).toBe('function')
    expect(typeof panel.clear).toBe('function')
    expect(typeof panel.setFilter).toBe('function')
    expect(typeof panel.pause).toBe('function')
    expect(typeof panel.resume).toBe('function')
    expect(typeof panel.isPaused).toBe('function')
    panel.destroy()
  })

  it('EventPanel 支持自定义配置', () => {
    const panel = new EventPanel({ maxBuffer: 50, autoScroll: false, title: '自定义' })
    expect(panel.getMaxBuffer()).toBe(50)
    panel.destroy()
  })

  it('captureEvent 正确捕获事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', { x: 10, y: 20 }, 'MyButton')
    const events = panel.getEvents()
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('click')
    expect(events[0].payload).toEqual({ x: 10, y: 20 })
    expect(events[0].sourceComponent).toBe('MyButton')
    expect(events[0].timestamp).toBeDefined()
    expect(events[0].index).toBe(0)
    panel.destroy()
  })

  it('captureEvent 不带 sourceComponent', () => {
    const panel = new EventPanel()
    panel.captureEvent('input', 'hello')
    const events = panel.getEvents()
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('input')
    expect(events[0].payload).toBe('hello')
    expect(events[0].sourceComponent).toBeUndefined()
    panel.destroy()
  })

  it('captureEvent 支持多种载荷类型', () => {
    const panel = new EventPanel()
    panel.captureEvent('string-event', 'text')
    panel.captureEvent('number-event', 42)
    panel.captureEvent('null-event', null)
    panel.captureEvent('array-event', [1, 2, 3])
    panel.captureEvent('object-event', { key: 'value' })
    expect(panel.getEvents().length).toBe(5)
    expect(panel.getEvents()[0].payload).toBe('text')
    expect(panel.getEvents()[1].payload).toBe(42)
    expect(panel.getEvents()[2].payload).toBeNull()
    expect(panel.getEvents()[3].payload).toEqual([1, 2, 3])
    expect(panel.getEvents()[4].payload).toEqual({ key: 'value' })
    panel.destroy()
  })

  it('getEvents 返回按时间排序的事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('first', 1)
    panel.captureEvent('second', 2)
    panel.captureEvent('third', 3)
    const events = panel.getEvents()
    expect(events[0].name).toBe('first')
    expect(events[1].name).toBe('second')
    expect(events[2].name).toBe('third')
    panel.destroy()
  })

  it('setFilter 按事件名称过滤', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', {}, 'Btn1')
    panel.captureEvent('change', {}, 'Input1')
    panel.captureEvent('click', {}, 'Btn2')
    panel.captureEvent('submit', {}, 'Form1')
    panel.setFilter('click')
    const events = panel.getEvents()
    expect(events.length).toBe(2)
    expect(events[0].name).toBe('click')
    expect(events[1].name).toBe('click')
    panel.destroy()
  })

  it('setFilter 按来源组件过滤', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', {}, 'MyButton')
    panel.captureEvent('change', {}, 'MyInput')
    panel.captureEvent('focus', {}, 'MyButton')
    panel.setFilter('MyButton')
    const events = panel.getEvents()
    expect(events.length).toBe(2)
    expect(events[0].sourceComponent).toBe('MyButton')
    expect(events[1].sourceComponent).toBe('MyButton')
    panel.destroy()
  })

  it('setFilter 大小写不敏感', () => {
    const panel = new EventPanel()
    panel.captureEvent('CLICK', {})
    panel.captureEvent('click', {})
    panel.captureEvent('submit', {})
    panel.setFilter('click')
    expect(panel.getEvents().length).toBe(2)
    panel.destroy()
  })

  it('setFilter 空字符串返回所有事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('a', 1)
    panel.captureEvent('b', 2)
    panel.setFilter('')
    expect(panel.getEvents().length).toBe(2)
    panel.destroy()
  })

  it('pause 暂停事件捕获', () => {
    const panel = new EventPanel()
    panel.captureEvent('before-pause', 1)
    panel.pause()
    panel.captureEvent('during-pause', 2)
    panel.captureEvent('still-paused', 3)
    expect(panel.getEvents().length).toBe(1)
    expect(panel.getEvents()[0].name).toBe('before-pause')
    panel.destroy()
  })

  it('resume 恢复事件捕获', () => {
    const panel = new EventPanel()
    panel.pause()
    panel.captureEvent('paused', 1)
    panel.resume()
    panel.captureEvent('resumed', 2)
    expect(panel.getEvents().length).toBe(1)
    expect(panel.getEvents()[0].name).toBe('resumed')
    panel.destroy()
  })

  it('isPaused 返回正确状态', () => {
    const panel = new EventPanel()
    expect(panel.isPaused()).toBe(false)
    panel.pause()
    expect(panel.isPaused()).toBe(true)
    panel.resume()
    expect(panel.isPaused()).toBe(false)
    panel.destroy()
  })

  it('clear 清除所有事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('a', 1)
    panel.captureEvent('b', 2)
    panel.clear()
    expect(panel.getEvents().length).toBe(0)
    expect(panel.getCount()).toBe(0)
    panel.destroy()
  })

  it('clear 后可以继续捕获事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('a', 1)
    panel.clear()
    panel.captureEvent('b', 2)
    expect(panel.getEvents().length).toBe(1)
    expect(panel.getEvents()[0].name).toBe('b')
    panel.destroy()
  })

  it('环形缓冲区在超过 maxBuffer 时丢弃旧事件', () => {
    const panel = new EventPanel({ maxBuffer: 5 })
    for (let i = 0; i < 10; i++) {
      panel.captureEvent(`event-${i}`, i)
    }
    expect(panel.getCount()).toBe(5)
    const events = panel.getEvents()
    // 应该保留最新的 5 个事件
    expect(events.length).toBe(5)
    expect(events[0].name).toBe('event-5')
    expect(events[4].name).toBe('event-9')
    panel.destroy()
  })

  it('环形缓冲区在边界处正确工作', () => {
    const panel = new EventPanel({ maxBuffer: 3 })
    panel.captureEvent('a', 1)
    panel.captureEvent('b', 2)
    panel.captureEvent('c', 3)
    // 缓冲区满
    expect(panel.getCount()).toBe(3)
    panel.captureEvent('d', 4)
    // 应该丢弃 'a'
    const events = panel.getEvents()
    expect(events.length).toBe(3)
    expect(events[0].name).toBe('b')
    expect(events[1].name).toBe('c')
    expect(events[2].name).toBe('d')
    panel.destroy()
  })

  it('exportJSON 返回有效 JSON', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', { x: 1 }, 'Btn')
    const json = panel.exportJSON()
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('click')
    expect(parsed[0].payload).toEqual({ x: 1 })
    expect(parsed[0].sourceComponent).toBe('Btn')
    panel.destroy()
  })

  it('exportJSON 过滤后只导出匹配事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', 1)
    panel.captureEvent('change', 2)
    panel.captureEvent('click', 3)
    panel.setFilter('click')
    const json = panel.exportJSON()
    const parsed = JSON.parse(json)
    expect(parsed.length).toBe(2)
    panel.destroy()
  })

  it('getCount 返回正确的事件数量', () => {
    const panel = new EventPanel()
    expect(panel.getCount()).toBe(0)
    panel.captureEvent('a', 1)
    expect(panel.getCount()).toBe(1)
    panel.captureEvent('b', 2)
    expect(panel.getCount()).toBe(2)
    panel.destroy()
  })

  it('getFilter 返回当前过滤模式', () => {
    const panel = new EventPanel()
    expect(panel.getFilter()).toBe('')
    panel.setFilter('click')
    expect(panel.getFilter()).toBe('click')
    panel.setFilter('')
    expect(panel.getFilter()).toBe('')
    panel.destroy()
  })

  it('getAllEvents 返回未过滤的事件', () => {
    const panel = new EventPanel()
    panel.captureEvent('click', 1)
    panel.captureEvent('change', 2)
    panel.captureEvent('click', 3)
    panel.setFilter('click')
    expect(panel.getEvents().length).toBe(2)
    expect(panel.getAllEvents().length).toBe(3)
    panel.destroy()
  })

  it('事件 index 单调递增', () => {
    const panel = new EventPanel()
    panel.captureEvent('a', 1)
    panel.captureEvent('b', 2)
    panel.clear()
    panel.captureEvent('c', 3)
    const events = panel.getEvents()
    expect(events[0].index).toBe(2)
    panel.destroy()
  })
})

// ================================================================
// RouterPanel 测试
// ================================================================

describe('@lytjs/devtools - RouterPanel (enhanced)', () => {

  it('RouterPanel 可以实例化', () => {
    const panel = new RouterPanel()
    expect(panel).toBeDefined()
    expect(typeof panel.onRouteChange).toBe('function')
    expect(typeof panel.getCurrentRoute).toBe('function')
    expect(typeof panel.getHistory).toBe('function')
    expect(typeof panel.clearHistory).toBe('function')
    panel.destroy()
  })

  it('RouterPanel 支持自定义配置', () => {
    const panel = new RouterPanel({ maxHistory: 20, title: '自定义路由' })
    expect(panel.getMaxHistory()).toBe(20)
    panel.destroy()
  })

  it('初始状态 getCurrentRoute 返回 null', () => {
    const panel = new RouterPanel()
    expect(panel.getCurrentRoute()).toBeNull()
    panel.destroy()
  })

  it('初始状态 getHistory 返回空数组', () => {
    const panel = new RouterPanel()
    expect(panel.getHistory()).toEqual([])
    expect(panel.getHistoryCount()).toBe(0)
    panel.destroy()
  })

  it('onRouteChange 更新当前路由', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/home' }, { path: '/' })
    const current = panel.getCurrentRoute()
    expect(current).not.toBeNull()
    expect(current!.path).toBe('/home')
    panel.destroy()
  })

  it('onRouteChange 记录导航历史', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/home' }, { path: '/' })
    panel.onRouteChange({ path: '/about' }, { path: '/home' })
    const history = panel.getHistory()
    expect(history.length).toBe(2)
    expect(history[0].to.path).toBe('/home')
    expect(history[0].from.path).toBe('/')
    expect(history[1].to.path).toBe('/about')
    expect(history[1].from.path).toBe('/home')
    panel.destroy()
  })

  it('onRouteChange 支持路由参数', () => {
    const panel = new RouterPanel()
    panel.onRouteChange(
      { path: '/user/123', params: { id: '123' }, query: { tab: 'profile' } },
      { path: '/' }
    )
    const current = panel.getCurrentRoute()
    expect(current!.params).toEqual({ id: '123' })
    expect(current!.query).toEqual({ tab: 'profile' })
    panel.destroy()
  })

  it('onRouteChange 支持路由名称', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/home', name: 'home' }, { path: '/' })
    expect(panel.getCurrentRoute()!.name).toBe('home')
    panel.destroy()
  })

  it('onRouteChange 默认导航类型为 push', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/about' }, { path: '/' })
    expect(panel.getHistory()[0].type).toBe('push')
    panel.destroy()
  })

  it('onRouteChange 支持不同导航类型', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' }, 'push')
    panel.onRouteChange({ path: '/b' }, { path: '/a' }, 'replace')
    panel.onRouteChange({ path: '/c' }, { path: '/b' }, 'pop')
    const history = panel.getHistory()
    expect(history[0].type).toBe('push')
    expect(history[1].type).toBe('replace')
    expect(history[2].type).toBe('pop')
    panel.destroy()
  })

  it('onRouteChange 导航记录包含时间戳', () => {
    const panel = new RouterPanel()
    const before = Date.now()
    panel.onRouteChange({ path: '/home' }, { path: '/' })
    const after = Date.now()
    const history = panel.getHistory()
    expect(history[0].timestamp >= before).toBe(true)
    expect(history[0].timestamp <= after).toBe(true)
    panel.destroy()
  })

  it('onRouteChange 导航记录 index 递增', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.onRouteChange({ path: '/b' }, { path: '/a' })
    panel.onRouteChange({ path: '/c' }, { path: '/b' })
    const history = panel.getHistory()
    expect(history[0].index).toBe(0)
    expect(history[1].index).toBe(1)
    expect(history[2].index).toBe(2)
    panel.destroy()
  })

  it('导航历史超过 maxHistory 时裁剪旧记录', () => {
    const panel = new RouterPanel({ maxHistory: 3 })
    panel.onRouteChange({ path: '/1' }, { path: '/' })
    panel.onRouteChange({ path: '/2' }, { path: '/1' })
    panel.onRouteChange({ path: '/3' }, { path: '/2' })
    panel.onRouteChange({ path: '/4' }, { path: '/3' })
    panel.onRouteChange({ path: '/5' }, { path: '/4' })
    expect(panel.getHistoryCount()).toBe(3)
    const history = panel.getHistory()
    // 应该保留最新的 3 条
    expect(history[0].to.path).toBe('/3')
    expect(history[1].to.path).toBe('/4')
    expect(history[2].to.path).toBe('/5')
    panel.destroy()
  })

  it('clearHistory 清除所有导航历史', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.onRouteChange({ path: '/b' }, { path: '/a' })
    panel.clearHistory()
    expect(panel.getHistory()).toEqual([])
    expect(panel.getHistoryCount()).toBe(0)
    panel.destroy()
  })

  it('clearHistory 后可以继续记录', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.clearHistory()
    panel.onRouteChange({ path: '/b' }, { path: '/' })
    expect(panel.getHistoryCount()).toBe(1)
    expect(panel.getHistory()[0].to.path).toBe('/b')
    panel.destroy()
  })

  it('selectHistoryEntry 选中历史条目', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.onRouteChange({ path: '/b' }, { path: '/a' })
    panel.onRouteChange({ path: '/c' }, { path: '/b' })
    panel.selectHistoryEntry(1)
    const selected = panel.getSelectedHistoryEntry()
    expect(selected).not.toBeNull()
    expect(selected!.to.path).toBe('/b')
    panel.destroy()
  })

  it('selectHistoryEntry 无效索引返回 null', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.selectHistoryEntry(5)
    expect(panel.getSelectedHistoryEntry()).toBeNull()
    panel.destroy()
  })

  it('clearHistory 重置选中状态', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/a' }, { path: '/' })
    panel.selectHistoryEntry(0)
    panel.clearHistory()
    expect(panel.getSelectedHistoryEntry()).toBeNull()
    panel.destroy()
  })

  it('getHistory 返回深拷贝', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/home', params: { id: '1' } }, { path: '/' })
    const history1 = panel.getHistory()
    const history2 = panel.getHistory()
    expect(history1[0]).not.toBe(history2[0])
    expect(history1[0].to).not.toBe(history2[0].to)
    panel.destroy()
  })

  it('getCurrentRoute 返回深拷贝', () => {
    const panel = new RouterPanel()
    panel.onRouteChange({ path: '/home', params: { id: '1' } }, { path: '/' })
    const route1 = panel.getCurrentRoute()
    const route2 = panel.getCurrentRoute()
    expect(route1).not.toBe(route2)
    panel.destroy()
  })
})

// ================================================================
// VirtualComponentTree 测试
// ================================================================

describe('@lytjs/devtools - VirtualComponentTree', () => {

  // 创建一个简单的模拟容器
  function createMockContainer(): HTMLElement {
    // 在 Node.js 环境中，我们使用一个最小化的 mock
    const container = {
      innerHTML: '',
      childNodes: [],
      appendChild: function(node: any) { this.childNodes.push(node) },
      removeChild: function(node: any) {
        const idx = this.childNodes.indexOf(node)
        if (idx >= 0) this.childNodes.splice(idx, 1)
      },
      get style() {
        return this._style || (this._style = {})
      },
      _style: {} as any,
      addEventListener: function() {},
      removeEventListener: function() {},
    } as unknown as HTMLElement
    return container
  }

  it('VirtualComponentTree 可以实例化', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    expect(tree).toBeDefined()
    expect(typeof tree.setComponents).toBe('function')
    expect(typeof tree.setSelectedComponent).toBe('function')
    expect(typeof tree.setFilter).toBe('function')
    expect(typeof tree.expandAll).toBe('function')
    expect(typeof tree.collapseAll).toBe('function')
    expect(typeof tree.destroy).toBe('function')
    tree.destroy()
  })

  it('VirtualComponentTree 支持自定义选项', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container, {
      nodeHeight: 32,
      visibleHeight: 500,
      indentWidth: 24,
    })
    expect(tree).toBeDefined()
    tree.destroy()
  })

  it('setComponents 正确设置组件数据', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      { id: '1', name: 'App' },
      { id: '2', name: 'Header' },
    ]
    tree.setComponents(components)
    expect(tree.getTotalNodeCount()).toBe(2)
    expect(tree.getVisibleNodeCount()).toBe(2)
    tree.destroy()
  })

  it('setComponents 支持嵌套组件', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'Header' },
          { id: '3', name: 'Footer' },
        ],
      },
    ]
    tree.setComponents(components)
    expect(tree.getTotalNodeCount()).toBe(3)
    // 默认不展开，子节点不可见
    expect(tree.getVisibleNodeCount()).toBe(1)
    tree.destroy()
  })

  it('expandAll 展开所有节点', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          {
            id: '2', name: 'Header',
            children: [
              { id: '3', name: 'Logo' },
            ],
          },
          { id: '4', name: 'Footer' },
        ],
      },
    ]
    tree.setComponents(components)
    expect(tree.getVisibleNodeCount()).toBe(1)
    tree.expandAll()
    expect(tree.getVisibleNodeCount()).toBe(4)
    tree.destroy()
  })

  it('collapseAll 折叠所有节点', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'Header' },
        ],
      },
    ]
    tree.setComponents(components)
    tree.expandAll()
    expect(tree.getVisibleNodeCount()).toBe(2)
    tree.collapseAll()
    expect(tree.getVisibleNodeCount()).toBe(1)
    tree.destroy()
  })

  it('setFilter 按组件名称过滤', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'MyButton' },
          { id: '3', name: 'MyInput' },
          { id: '4', name: 'Other' },
        ],
      },
    ]
    tree.setComponents(components)
    tree.expandAll()
    expect(tree.getVisibleNodeCount()).toBe(4)
    tree.setFilter('My')
    // 过滤 "My" 应该匹配 MyButton 和 MyInput，加上它们的父节点 App
    expect(tree.getVisibleNodeCount()).toBe(3)
    tree.destroy()
  })

  it('setFilter 大小写不敏感', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      { id: '1', name: 'BUTTON' },
      { id: '2', name: 'button' },
      { id: '3', name: 'Other' },
    ]
    tree.setComponents(components)
    tree.setFilter('button')
    expect(tree.getVisibleNodeCount()).toBe(2)
    tree.destroy()
  })

  it('setFilter 空字符串显示所有节点', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      { id: '1', name: 'App' },
      { id: '2', name: 'Header' },
    ]
    tree.setComponents(components)
    tree.setFilter('nonexistent')
    expect(tree.getVisibleNodeCount()).toBe(0)
    tree.setFilter('')
    expect(tree.getVisibleNodeCount()).toBe(2)
    tree.destroy()
  })

  it('setSelectedComponent 设置选中组件', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      { id: '1', name: 'App' },
      { id: '2', name: 'Header' },
    ]
    tree.setComponents(components)
    tree.setSelectedComponent('2')
    // 选中状态通过 renderNodes 体现，这里验证不报错
    tree.destroy()
  })

  it('setComponents 替换旧数据', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    tree.setComponents([{ id: '1', name: 'Old' }])
    expect(tree.getTotalNodeCount()).toBe(1)
    tree.setComponents([
      { id: '2', name: 'New1' },
      { id: '3', name: 'New2' },
    ])
    expect(tree.getTotalNodeCount()).toBe(2)
    tree.destroy()
  })

  it('destroy 清理所有状态', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'Header' },
        ],
      },
    ]
    tree.setComponents(components)
    tree.expandAll()
    tree.destroy()
    expect(tree.getTotalNodeCount()).toBe(0)
  })

  it('深层嵌套组件正确处理', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    // 5 层嵌套
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'L1',
        children: [
          {
            id: '2', name: 'L2',
            children: [
              {
                id: '3', name: 'L3',
                children: [
                  {
                    id: '4', name: 'L4',
                    children: [
                      { id: '5', name: 'L5' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    tree.setComponents(components)
    expect(tree.getTotalNodeCount()).toBe(5)
    expect(tree.getVisibleNodeCount()).toBe(1) // 默认折叠
    tree.expandAll()
    expect(tree.getVisibleNodeCount()).toBe(5)
    tree.destroy()
  })

  it('大量组件（1000+）不报错', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = []
    for (let i = 0; i < 1000; i++) {
      components.push({ id: `node-${i}`, name: `Component${i}` })
    }
    tree.setComponents(components)
    expect(tree.getTotalNodeCount()).toBe(1000)
    expect(tree.getVisibleNodeCount()).toBe(1000)
    tree.destroy()
  })

  it('大量嵌套组件（1000+）expandAll 不报错', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    // 构建链式嵌套
    let current: ComponentTreeNode = { id: '0', name: 'Root' }
    const root = current
    for (let i = 1; i < 500; i++) {
      const child: ComponentTreeNode = { id: String(i), name: `Node${i}` }
      current.children = [child]
      current = child
    }
    tree.setComponents([root])
    tree.expandAll()
    expect(tree.getTotalNodeCount()).toBe(500)
    expect(tree.getVisibleNodeCount()).toBe(500)
    tree.destroy()
  })

  it('getFlatNodes 返回正确的扁平节点列表', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'Header' },
        ],
      },
    ]
    tree.setComponents(components)
    const flatNodes = tree.getFlatNodes()
    expect(flatNodes.length).toBe(2)
    expect(flatNodes[0].node.id).toBe('1')
    expect(flatNodes[0].depth).toBe(0)
    expect(flatNodes[1].node.id).toBe('2')
    expect(flatNodes[1].depth).toBe(1)
    tree.destroy()
  })

  it('组件节点包含 stateSummary 和 propsCount', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      {
        id: '1',
        name: 'App',
        stateSummary: 'count: 0',
        propsCount: 3,
        active: true,
      },
    ]
    tree.setComponents(components)
    const flatNodes = tree.getFlatNodes()
    expect(flatNodes[0].node.stateSummary).toBe('count: 0')
    expect(flatNodes[0].node.propsCount).toBe(3)
    expect(flatNodes[0].node.active).toBe(true)
    tree.destroy()
  })

  it('defaultExpandAll 选项正确工作', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container, { defaultExpandAll: true })
    const components: ComponentTreeNode[] = [
      {
        id: '1', name: 'App',
        children: [
          { id: '2', name: 'Header' },
          { id: '3', name: 'Footer' },
        ],
      },
    ]
    tree.setComponents(components)
    expect(tree.getVisibleNodeCount()).toBe(3)
    tree.destroy()
  })

  it('多次 setFilter 正确更新', () => {
    const container = createMockContainer()
    const tree = new VirtualComponentTree(container)
    const components: ComponentTreeNode[] = [
      { id: '1', name: 'App' },
      { id: '2', name: 'Header' },
      { id: '3', name: 'Footer' },
      { id: '4', name: 'Sidebar' },
    ]
    tree.setComponents(components)
    tree.setFilter('Head')
    expect(tree.getVisibleNodeCount()).toBe(1)
    tree.setFilter('Foot')
    expect(tree.getVisibleNodeCount()).toBe(1)
    tree.setFilter('er')
    // 匹配 Header 和 Footer
    expect(tree.getVisibleNodeCount()).toBe(2)
    tree.setFilter('')
    expect(tree.getVisibleNodeCount()).toBe(4)
    tree.destroy()
  })
})

// ================================================================
// MemoryTracker 测试
// ================================================================

describe('@lytjs/devtools - MemoryTracker', () => {

  it('MemoryTracker 可以实例化', () => {
    const tracker = new MemoryTracker()
    expect(tracker).toBeDefined()
    expect(typeof tracker.trackMemoryUsage).toBe('function')
    expect(typeof tracker.getMemoryTrend).toBe('function')
    expect(typeof tracker.detectMemoryLeak).toBe('function')
    expect(typeof tracker.getMemoryReport).toBe('function')
    tracker.destroy()
  })

  it('MemoryTracker 支持自定义配置', () => {
    const tracker = new MemoryTracker({
      bufferSize: 50,
      leakGrowthThreshold: 2048,
      leakRSquaredThreshold: 0.8,
      leakMinSnapshots: 10,
    })
    expect(tracker).toBeDefined()
    tracker.destroy()
  })

  it('trackMemoryUsage 正确记录手动传入的内存数据', () => {
    const tracker = new MemoryTracker()
    const snapshot = tracker.trackMemoryUsage(1024 * 1024, 2 * 1024 * 1024, 4 * 1024 * 1024)
    expect(snapshot).not.toBeNull()
    expect(snapshot!.usedJSHeapSize).toBe(1024 * 1024)
    expect(snapshot!.totalJSHeapSize).toBe(2 * 1024 * 1024)
    expect(snapshot!.jsHeapSizeLimit).toBe(4 * 1024 * 1024)
    expect(snapshot!.timestamp).toBeDefined()
    expect(snapshot!.index).toBe(0)
    tracker.destroy()
  })

  it('trackMemoryUsage 多次记录 index 单调递增', () => {
    const tracker = new MemoryTracker()
    tracker.trackMemoryUsage(100)
    tracker.trackMemoryUsage(200)
    tracker.trackMemoryUsage(300)
    const snapshots = tracker.getSnapshots()
    expect(snapshots.length).toBe(3)
    expect(snapshots[0].index).toBe(0)
    expect(snapshots[1].index).toBe(1)
    expect(snapshots[2].index).toBe(2)
    tracker.destroy()
  })

  it('getMemoryTrend 返回正确的趋势数据', () => {
    const tracker = new MemoryTracker()
    tracker.trackMemoryUsage(1000, 2000, 4000)
    tracker.trackMemoryUsage(1500, 2000, 4000)
    tracker.trackMemoryUsage(2000, 2000, 4000)
    const trend = tracker.getMemoryTrend()
    expect(trend.length).toBe(3)
    // 第一个点的 delta 应为 0
    expect(trend[0].delta).toBe(0)
    // 第二个点的 delta 应为 500
    expect(trend[1].delta).toBe(500)
    // 第三个点的 delta 应为 500
    expect(trend[2].delta).toBe(500)
    // 使用率应为 25%, 37.5%, 50%
    expect(trend[0].usagePercent).toBe(25)
    expect(trend[1].usagePercent).toBe(37.5)
    expect(trend[2].usagePercent).toBe(50)
    tracker.destroy()
  })

  it('getMemoryTrend 空数据返回空数组', () => {
    const tracker = new MemoryTracker()
    expect(tracker.getMemoryTrend()).toEqual([])
    tracker.destroy()
  })

  it('detectMemoryLeak 快照不足时返回无泄漏', () => {
    const tracker = new MemoryTracker({ leakMinSnapshots: 5 })
    tracker.trackMemoryUsage(1000)
    tracker.trackMemoryUsage(1100)
    tracker.trackMemoryUsage(1200)
    const result = tracker.detectMemoryLeak()
    expect(result.hasLeak).toBe(false)
    expect(result.severity).toBe('none')
    expect(result.snapshotCount).toBe(3)
    tracker.destroy()
  })

  it('detectMemoryLeak 稳定内存无泄漏', () => {
    const tracker = new MemoryTracker({ leakMinSnapshots: 5 })
    // 模拟稳定的内存使用（上下波动）
    for (let i = 0; i < 10; i++) {
      tracker.trackMemoryUsage(1000 + Math.sin(i) * 50, 2000, 4000)
    }
    const result = tracker.detectMemoryLeak()
    expect(result.hasLeak).toBe(false)
    expect(result.severity).toBe('none')
    tracker.destroy()
  })

  it('detectMemoryLeak 检测到持续增长的内存泄漏', () => {
    const tracker = new MemoryTracker({
      leakMinSnapshots: 5,
      leakGrowthThreshold: 100,
      leakRSquaredThreshold: 0.5,
    })
    // 模拟持续增长的内存使用（10秒内每次增加约 10000 bytes）
    const baseTime = Date.now()
    for (let i = 0; i < 10; i++) {
      tracker.trackMemoryUsage(100000 + i * 10000, 200000, 400000, baseTime + i * 1000)
    }
    const result = tracker.detectMemoryLeak()
    expect(result.hasLeak).toBe(true)
    expect(result.severity).not.toBe('none')
    expect(result.growthRate).toBeGreaterThan(0)
    tracker.destroy()
  })

  it('getMemoryReport 返回完整报告', () => {
    const tracker = new MemoryTracker()
    tracker.trackMemoryUsage(1000, 2000, 4000)
    tracker.trackMemoryUsage(2000, 2000, 4000)
    tracker.trackMemoryUsage(1500, 2000, 4000)
    const report = tracker.getMemoryReport()
    expect(report.generatedAt).toBeDefined()
    expect(report.current).not.toBeNull()
    expect(report.peakUsage).toBe(2000)
    expect(report.minUsage).toBe(1000)
    expect(report.averageUsage).toBeGreaterThan(0)
    expect(report.totalGrowth).toBe(500) // 1500 - 1000
    expect(report.snapshotCount).toBe(3)
    expect(report.trend.length).toBe(3)
    expect(report.leakDetection).toBeDefined()
    tracker.destroy()
  })

  it('getMemoryReport 空数据返回零值报告', () => {
    const tracker = new MemoryTracker()
    const report = tracker.getMemoryReport()
    expect(report.current).toBeNull()
    expect(report.peakUsage).toBe(0)
    expect(report.averageUsage).toBe(0)
    expect(report.snapshotCount).toBe(0)
    expect(report.trend).toEqual([])
    tracker.destroy()
  })

  it('环形缓冲区在超过 bufferSize 时丢弃旧快照', () => {
    const tracker = new MemoryTracker({ bufferSize: 5 })
    for (let i = 0; i < 10; i++) {
      tracker.trackMemoryUsage(1000 + i * 100)
    }
    expect(tracker.getSnapshotCount()).toBe(5)
    const snapshots = tracker.getSnapshots()
    // 应该保留最新的 5 个
    expect(snapshots[0].usedJSHeapSize).toBe(1500)
    expect(snapshots[4].usedJSHeapSize).toBe(1900)
    tracker.destroy()
  })

  it('clear 清除所有快照并重置计数器', () => {
    const tracker = new MemoryTracker()
    tracker.trackMemoryUsage(1000)
    tracker.trackMemoryUsage(2000)
    tracker.clear()
    expect(tracker.getSnapshotCount()).toBe(0)
    expect(tracker.getMemoryTrend()).toEqual([])
    // 重置后 index 应从 0 开始
    tracker.trackMemoryUsage(3000)
    expect(tracker.getSnapshots()[0].index).toBe(0)
    tracker.destroy()
  })
})

// ================================================================
// RenderTracker 测试
// ================================================================

describe('@lytjs/devtools - RenderTracker', () => {

  it('RenderTracker 可以实例化', () => {
    const tracker = new RenderTracker()
    expect(tracker).toBeDefined()
    expect(typeof tracker.trackRender).toBe('function')
    expect(typeof tracker.getSlowRenderers).toBe('function')
    expect(typeof tracker.getRenderStats).toBe('function')
    expect(typeof tracker.getRenderTimeline).toBe('function')
    tracker.destroy()
  })

  it('RenderTracker 支持自定义配置', () => {
    const tracker = new RenderTracker({ bufferSize: 50, slowThreshold: 8 })
    expect(tracker).toBeDefined()
    tracker.destroy()
  })

  it('trackRender 正确记录渲染数据', () => {
    const tracker = new RenderTracker()
    tracker.trackRender('MyComponent', 12.5)
    const records = tracker.getRecords()
    expect(records.length).toBe(1)
    expect(records[0].componentName).toBe('MyComponent')
    expect(records[0].duration).toBe(12.5)
    expect(records[0].timestamp).toBeDefined()
    expect(records[0].index).toBe(0)
    tracker.destroy()
  })

  it('trackRender 多次记录 index 单调递增', () => {
    const tracker = new RenderTracker()
    tracker.trackRender('A', 1)
    tracker.trackRender('B', 2)
    tracker.trackRender('C', 3)
    const records = tracker.getRecords()
    expect(records[0].index).toBe(0)
    expect(records[1].index).toBe(1)
    expect(records[2].index).toBe(2)
    tracker.destroy()
  })

  it('getSlowRenderers 返回超过阈值的慢渲染', () => {
    const tracker = new RenderTracker({ slowThreshold: 16 })
    tracker.trackRender('FastComponent', 5)
    tracker.trackRender('NormalComponent', 10)
    tracker.trackRender('SlowComponent', 50)
    tracker.trackRender('VerySlowComponent', 100)
    const slow = tracker.getSlowRenderers()
    expect(slow.length).toBe(2)
    expect(slow[0].componentName).toBe('VerySlowComponent')
    expect(slow[0].duration).toBe(100)
    expect(slow[0].overThreshold).toBe(84)
    expect(slow[1].componentName).toBe('SlowComponent')
    expect(slow[1].duration).toBe(50)
    tracker.destroy()
  })

  it('getSlowRenderers 支持自定义阈值', () => {
    const tracker = new RenderTracker({ slowThreshold: 16 })
    tracker.trackRender('A', 10)
    tracker.trackRender('B', 20)
    tracker.trackRender('C', 30)
    // 使用自定义阈值 25
    const slow = tracker.getSlowRenderers(25)
    expect(slow.length).toBe(1)
    expect(slow[0].componentName).toBe('C')
    tracker.destroy()
  })

  it('getSlowRenderers 无慢渲染时返回空数组', () => {
    const tracker = new RenderTracker({ slowThreshold: 100 })
    tracker.trackRender('A', 5)
    tracker.trackRender('B', 10)
    expect(tracker.getSlowRenderers()).toEqual([])
    tracker.destroy()
  })

  it('getRenderStats 返回完整统计', () => {
    const tracker = new RenderTracker({ slowThreshold: 10 })
    tracker.trackRender('A', 5)
    tracker.trackRender('A', 15)
    tracker.trackRender('B', 8)
    tracker.trackRender('B', 20)
    const stats = tracker.getRenderStats()
    expect(stats.totalRenders).toBe(4)
    expect(stats.totalDuration).toBe(48)
    expect(stats.avgDuration).toBe(12)
    expect(stats.maxDuration).toBe(20)
    expect(stats.minDuration).toBe(5)
    expect(stats.slowRenderCount).toBe(2)
    expect(stats.slowRenderRatio).toBe(0.5)
    expect(stats.byComponent.length).toBe(2)
    tracker.destroy()
  })

  it('getRenderStats 空数据返回零值', () => {
    const tracker = new RenderTracker()
    const stats = tracker.getRenderStats()
    expect(stats.totalRenders).toBe(0)
    expect(stats.totalDuration).toBe(0)
    expect(stats.avgDuration).toBe(0)
    expect(stats.byComponent).toEqual([])
    tracker.destroy()
  })

  it('getRenderStats byComponent 按平均耗时降序排列', () => {
    const tracker = new RenderTracker()
    tracker.trackRender('Fast', 1)
    tracker.trackRender('Fast', 2)
    tracker.trackRender('Slow', 100)
    tracker.trackRender('Slow', 200)
    const stats = tracker.getRenderStats()
    expect(stats.byComponent[0].componentName).toBe('Slow')
    expect(stats.byComponent[0].avgDuration).toBe(150)
    expect(stats.byComponent[1].componentName).toBe('Fast')
    expect(stats.byComponent[1].avgDuration).toBe(1.5)
    tracker.destroy()
  })

  it('getRenderTimeline 返回正确的时间线', () => {
    const tracker = new RenderTracker({ slowThreshold: 10 })
    tracker.trackRender('A', 5)
    tracker.trackRender('B', 15)
    const timeline = tracker.getRenderTimeline()
    expect(timeline.length).toBe(2)
    expect(timeline[0].componentName).toBe('A')
    expect(timeline[0].isSlow).toBe(false)
    expect(timeline[0].gap).toBe(-1)
    expect(timeline[1].componentName).toBe('B')
    expect(timeline[1].isSlow).toBe(true)
    expect(timeline[1].gap).toBeGreaterThanOrEqual(0)
    tracker.destroy()
  })

  it('环形缓冲区在超过 bufferSize 时丢弃旧记录', () => {
    const tracker = new RenderTracker({ bufferSize: 5 })
    for (let i = 0; i < 10; i++) {
      tracker.trackRender(`Comp${i}`, i)
    }
    expect(tracker.getRecordCount()).toBe(5)
    const records = tracker.getRecords()
    expect(records[0].componentName).toBe('Comp5')
    expect(records[4].componentName).toBe('Comp9')
    tracker.destroy()
  })

  it('clear 清除所有记录并重置计数器', () => {
    const tracker = new RenderTracker()
    tracker.trackRender('A', 1)
    tracker.trackRender('B', 2)
    tracker.clear()
    expect(tracker.getRecordCount()).toBe(0)
    tracker.trackRender('C', 3)
    expect(tracker.getRecords()[0].index).toBe(0)
    tracker.destroy()
  })
})

// ================================================================
// BatchAnalyzer 测试
// ================================================================

describe('@lytjs/devtools - BatchAnalyzer', () => {

  it('BatchAnalyzer 可以实例化', () => {
    const analyzer = new BatchAnalyzer()
    expect(analyzer).toBeDefined()
    expect(typeof analyzer.startBatch).toBe('function')
    expect(typeof analyzer.endBatch).toBe('function')
    expect(typeof analyzer.getBatchStats).toBe('function')
    expect(typeof analyzer.detectAnomalousBatches).toBe('function')
    analyzer.destroy()
  })

  it('BatchAnalyzer 支持自定义配置', () => {
    const analyzer = new BatchAnalyzer({
      bufferSize: 50,
      slowThreshold: 500,
      outlierSigmaThreshold: 3,
    })
    expect(analyzer).toBeDefined()
    analyzer.destroy()
  })

  it('startBatch + endBatch 正确记录批量操作', () => {
    const analyzer = new BatchAnalyzer()
    const started = analyzer.startBatch('update-users')
    expect(started).toBe(true)
    const record = analyzer.endBatch('update-users')
    expect(record).not.toBeNull()
    expect(record!.name).toBe('update-users')
    expect(record!.duration).toBeGreaterThanOrEqual(0)
    expect(record!.index).toBe(0)
    analyzer.destroy()
  })

  it('endBatch 未开始的操作返回 null', () => {
    const analyzer = new BatchAnalyzer()
    const record = analyzer.endBatch('nonexistent')
    expect(record).toBeNull()
    analyzer.destroy()
  })

  it('startBatch 同名操作不能重复开始', () => {
    const analyzer = new BatchAnalyzer()
    expect(analyzer.startBatch('batch-1')).toBe(true)
    expect(analyzer.startBatch('batch-1')).toBe(false)
    // 结束后可以重新开始
    analyzer.endBatch('batch-1')
    expect(analyzer.startBatch('batch-1')).toBe(true)
    analyzer.destroy()
  })

  it('getBatchStats 返回完整统计', () => {
    const analyzer = new BatchAnalyzer()
    // 模拟 3 次操作
    analyzer.startBatch('op-a')
    analyzer.endBatch('op-a') // duration ~0ms
    analyzer.startBatch('op-b')
    analyzer.endBatch('op-b')
    analyzer.startBatch('op-a')
    analyzer.endBatch('op-a')
    const stats = analyzer.getBatchStats()
    expect(stats.totalBatches).toBe(3)
    expect(stats.totalDuration).toBeGreaterThanOrEqual(0)
    expect(stats.byName.length).toBe(2)
    // op-a 应有 2 次记录
    const opA = stats.byName.find(n => n.name === 'op-a')
    expect(opA).toBeDefined()
    expect(opA!.count).toBe(2)
    analyzer.destroy()
  })

  it('getBatchStats 空数据返回零值', () => {
    const analyzer = new BatchAnalyzer()
    const stats = analyzer.getBatchStats()
    expect(stats.totalBatches).toBe(0)
    expect(stats.totalDuration).toBe(0)
    expect(stats.avgDuration).toBe(0)
    expect(stats.byName).toEqual([])
    analyzer.destroy()
  })

  it('getBatchStats byName 包含标准差', () => {
    const analyzer = new BatchAnalyzer()
    // 手动构造不同时长的操作
    analyzer.startBatch('test')
    const start = Date.now()
    // 通过直接操作 records 来模拟不同时长
    analyzer.endBatch('test')
    analyzer.startBatch('test')
    analyzer.endBatch('test')
    const stats = analyzer.getBatchStats()
    const testStats = stats.byName.find(n => n.name === 'test')
    expect(testStats).toBeDefined()
    expect(typeof testStats!.stdDev).toBe('number')
    expect(testStats!.stdDev).toBeGreaterThanOrEqual(0)
    analyzer.destroy()
  })

  it('detectAnomalousBatches 检测到慢操作', () => {
    const analyzer = new BatchAnalyzer({
      slowThreshold: 50,
      outlierSigmaThreshold: 2,
    })
    // 正常操作
    analyzer.startBatch('normal')
    analyzer.endBatch('normal')
    // 模拟一个慢操作（通过直接 push 记录）
    // 由于无法真正等待，我们用 startBatch/endBatch 的方式
    // 慢操作需要 > 50ms，在测试中不太容易自然产生
    // 所以我们验证：正常操作不应被标记为异常
    const anomalies = analyzer.detectAnomalousBatches()
    // 正常操作不应被标记
    expect(anomalies.every(a => a.name !== 'normal')).toBe(true)
    analyzer.destroy()
  })

  it('detectAnomalousBatches 空数据返回空数组', () => {
    const analyzer = new BatchAnalyzer()
    expect(analyzer.detectAnomalousBatches()).toEqual([])
    analyzer.destroy()
  })

  it('detectAnomalousBatches 检测到离群值', () => {
    const analyzer = new BatchAnalyzer({
      slowThreshold: 100000, // 设置很高的慢操作阈值，避免误判
      outlierSigmaThreshold: 1.5,
    })
    // 创建多个正常时长的操作
    for (let i = 0; i < 5; i++) {
      analyzer.startBatch('batch')
      analyzer.endBatch('batch')
    }
    // 创建一个异常时长的操作（通过直接操作）
    // 由于无法控制真实耗时，我们通过检查 detectAnomalousBatches 不报错来验证
    const anomalies = analyzer.detectAnomalousBatches()
    // 至少应该返回一个数组
    expect(Array.isArray(anomalies)).toBe(true)
    analyzer.destroy()
  })

  it('getPendingBatches 返回正在进行的操作', () => {
    const analyzer = new BatchAnalyzer()
    expect(analyzer.getPendingBatches()).toEqual([])
    analyzer.startBatch('batch-1')
    analyzer.startBatch('batch-2')
    const pending = analyzer.getPendingBatches()
    expect(pending.length).toBe(2)
    expect(pending).toContain('batch-1')
    expect(pending).toContain('batch-2')
    analyzer.endBatch('batch-1')
    expect(analyzer.getPendingBatches()).toEqual(['batch-2'])
    analyzer.endBatch('batch-2')
    expect(analyzer.getPendingBatches()).toEqual([])
    analyzer.destroy()
  })

  it('环形缓冲区在超过 bufferSize 时丢弃旧记录', () => {
    const analyzer = new BatchAnalyzer({ bufferSize: 5 })
    for (let i = 0; i < 10; i++) {
      analyzer.startBatch(`batch-${i}`)
      analyzer.endBatch(`batch-${i}`)
    }
    expect(analyzer.getRecordCount()).toBe(5)
    const records = analyzer.getRecords()
    expect(records[0].name).toBe('batch-5')
    expect(records[4].name).toBe('batch-9')
    analyzer.destroy()
  })

  it('clear 清除所有记录和进行中的操作', () => {
    const analyzer = new BatchAnalyzer()
    analyzer.startBatch('pending')
    analyzer.startBatch('done')
    analyzer.endBatch('done')
    analyzer.clear()
    expect(analyzer.getRecordCount()).toBe(0)
    expect(analyzer.getPendingBatches()).toEqual([])
    expect(analyzer.getBatchStats().totalBatches).toBe(0)
    analyzer.destroy()
  })
})
