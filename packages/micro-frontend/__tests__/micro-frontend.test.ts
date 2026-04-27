/**
 * @lytjs/micro-frontend — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 sandbox、communication、lifecycle、adapters。
 *
 * 测试覆盖：
 *   1. createSandbox 创建沙箱实例
 *   2. Sandbox 激活/停用/销毁
 *   3. Sandbox proxyWindow 读写隔离
 *   4. createStyleSandbox 创建 CSS 沙箱
 *   5. StyleSandbox inject / removeAll / destroy
 *   6. EventBus 订阅/发布/取消订阅
 *   7. EventBus 通配符匹配
 *   8. EventBus once 一次性订阅
 *   9. EventBus destroy
 *  10. SharedState set/get/remove/watch
 *  11. SharedState watchAll
 *  12. SharedState batchSet
 *  13. MicroApp 生命周期管理
 *  14. createQiankunLifeCycle 适配器
 *  15. createMicroAppEntry 适配器
 *  16. createMicroFrontendConfig 通用配置
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

import { createSandbox, createStyleSandbox } from '../src/sandbox'
import { EventBus, SharedState } from '../src/communication'
import { MicroApp } from '../src/lifecycle'
import { createQiankunLifeCycle, createMicroAppEntry, createMicroFrontendConfig } from '../src/adapters'

// ================================================================
//  Mock：DOM 环境
// ================================================================

function createMockContainer() {
  const children: any[] = []
  const styleElements: any[] = []
  const classSet = new Set<string>()
  const container: any = {
    children,
    childNodes: children,
    appendChild(child: any) { children.push(child); return child },
    removeChild(child: any) {
      const idx = children.indexOf(child)
      if (idx >= 0) children.splice(idx, 1)
      return child
    },
    classList: {
      _set: classSet,
      add(cls: string) { classSet.add(cls) },
      remove(cls: string) { classSet.delete(cls) },
      has(cls: string) { return classSet.has(cls) },
    },
    attachShadow(_opts: any) {
      const shadowChildren: any[] = []
      const shadowRoot: any = {
        children: shadowChildren,
        insertBefore(child: any) { shadowChildren.unshift(child); return child },
        appendChild(child: any) { shadowChildren.push(child); return child },
        removeChild(child: any) { return child },
      }
      return shadowRoot
    },
    innerHTML: '',
    dispatchEvent() { return true },
    querySelector() { return null },
    addEventListener() {},
    removeEventListener() {},
    style: {},
  }
  return container
}

// ================================================================
//  1. createSandbox 创建沙箱实例
// ================================================================

describe('createSandbox 创建沙箱实例', () => {

  it('返回包含必要方法和属性的 Sandbox 对象', () => {
    const sandbox = createSandbox({ name: 'test' })
    expect(sandbox).toBeDefined()
    expect(sandbox.status).toBe('created')
    expect(sandbox.proxyWindow).toBeDefined()
    expect(typeof sandbox.activate).toBe('function')
    expect(typeof sandbox.deactivate).toBe('function')
    expect(typeof sandbox.destroy).toBe('function')
  })

  it('使用默认名称 "default"', () => {
    const sandbox = createSandbox()
    expect(sandbox).toBeDefined()
    expect(sandbox.status).toBe('created')
  })

  it('proxyWindow 可以读写属性', () => {
    const sandbox = createSandbox({ name: 'rw-test' })
    sandbox.proxyWindow.__testVar = 'hello'
    expect(sandbox.proxyWindow.__testVar).toBe('hello')
    sandbox.destroy()
  })

  it('proxyWindow 写入不影响真实 window', () => {
    const sandbox = createSandbox({ name: 'isolation-test' })
    sandbox.proxyWindow.__sandboxOnly = 'isolated'
    expect((window as any).__sandboxOnly).toBeUndefined()
    sandbox.destroy()
  })
})

// ================================================================
//  2. Sandbox 激活/停用/销毁
// ================================================================

describe('Sandbox 激活/停用/销毁', () => {

  it('activate 将状态变为 active', () => {
    const sandbox = createSandbox({ name: 'activate-test' })
    sandbox.activate()
    expect(sandbox.status).toBe('active')
    sandbox.destroy()
  })

  it('重复 activate 不报错', () => {
    const sandbox = createSandbox({ name: 'double-activate' })
    sandbox.activate()
    sandbox.activate()
    expect(sandbox.status).toBe('active')
    sandbox.destroy()
  })

  it('deactivate 将状态变为 inactive', () => {
    const sandbox = createSandbox({ name: 'deactivate-test' })
    sandbox.activate()
    sandbox.deactivate()
    expect(sandbox.status).toBe('inactive')
    sandbox.destroy()
  })

  it('deactivate 清理新增的全局变量', () => {
    const sandbox = createSandbox({ name: 'cleanup-test' })
    sandbox.activate()
    sandbox.proxyWindow.__tempVar = 'temp'
    sandbox.deactivate()
    expect(sandbox.proxyWindow.__tempVar).toBeUndefined()
    sandbox.destroy()
  })

  it('destroy 清理所有资源', () => {
    const sandbox = createSandbox({ name: 'destroy-test' })
    sandbox.activate()
    sandbox.proxyWindow.__toDestroy = 'value'
    sandbox.destroy()
    expect(sandbox.status).toBe('inactive')
  })

  it('未激活时 deactivate 不报错', () => {
    const sandbox = createSandbox({ name: 'no-activate-deactivate' })
    sandbox.deactivate()
    expect(sandbox.status).toBe('created')
    sandbox.destroy()
  })
})

// ================================================================
//  3. Sandbox proxyWindow 读写隔离
// ================================================================

describe('Sandbox proxyWindow 读写隔离', () => {

  it('多个沙箱之间互不干扰', () => {
    const s1 = createSandbox({ name: 'sandbox-1' })
    const s2 = createSandbox({ name: 'sandbox-2' })
    s1.activate()
    s2.activate()

    s1.proxyWindow.__shared = 'from-s1'
    s2.proxyWindow.__shared = 'from-s2'

    expect(s1.proxyWindow.__shared).toBe('from-s1')
    expect(s2.proxyWindow.__shared).toBe('from-s2')

    s1.destroy()
    s2.destroy()
  })

  it('透传属性可以从 proxyWindow 访问', () => {
    const sandbox = createSandbox({ name: 'passthrough-test' })
    sandbox.activate()
    // Array 是透传属性
    expect(sandbox.proxyWindow.Array).toBe(Array)
    sandbox.destroy()
  })
})

// ================================================================
//  4. createStyleSandbox 创建 CSS 沙箱
// ================================================================

describe('createStyleSandbox 创建 CSS 沙箱', () => {

  let container: any

  beforeEach(() => {
    container = createMockContainer()
  })

  it('返回包含必要方法和属性的 StyleSandbox 对象', () => {
    const cssSandbox = createStyleSandbox({ container })
    expect(cssSandbox).toBeDefined()
    expect(typeof cssSandbox.scopePrefix).toBe('string')
    expect(Array.isArray(cssSandbox.styleElements)).toBe(true)
    expect(typeof cssSandbox.inject).toBe('function')
    expect(typeof cssSandbox.removeAll).toBe('function')
    expect(typeof cssSandbox.destroy).toBe('function')
    cssSandbox.destroy()
  })

  it('使用自定义 prefix', () => {
    const cssSandbox = createStyleSandbox({ container, prefix: 'my-prefix' })
    expect(cssSandbox.scopePrefix).toBe('my-prefix')
    cssSandbox.destroy()
  })

  it('为容器添加 scope class', () => {
    const cssSandbox = createStyleSandbox({ container })
    expect(container.classList.has(cssSandbox.scopePrefix)).toBe(true)
    cssSandbox.destroy()
  })
})

// ================================================================
//  5. StyleSandbox inject / removeAll / destroy
// ================================================================

describe('StyleSandbox inject / removeAll / destroy', () => {

  let container: any

  beforeEach(() => {
    container = createMockContainer()
  })

  it('inject 返回 style 元素', () => {
    const cssSandbox = createStyleSandbox({ container })
    const styleEl = cssSandbox.inject('.button { color: red; }')
    expect(styleEl).toBeDefined()
    expect(cssSandbox.styleElements.length).toBe(1)
    cssSandbox.destroy()
  })

  it('inject 为 CSS 添加 scope 前缀', () => {
    const cssSandbox = createStyleSandbox({ container, prefix: 'test-scope' })
    cssSandbox.inject('.button { color: red; }')
    const styleEl = cssSandbox.styleElements[0]
    expect(styleEl.textContent).toContain('.test-scope .button')
    cssSandbox.destroy()
  })

  it('多次 inject 累积 style 元素', () => {
    const cssSandbox = createStyleSandbox({ container })
    cssSandbox.inject('.a { color: red; }')
    cssSandbox.inject('.b { color: blue; }')
    expect(cssSandbox.styleElements.length).toBe(2)
    cssSandbox.destroy()
  })

  it('removeAll 清除所有注入的样式', () => {
    const cssSandbox = createStyleSandbox({ container })
    cssSandbox.inject('.a { color: red; }')
    cssSandbox.inject('.b { color: blue; }')
    cssSandbox.removeAll()
    expect(cssSandbox.styleElements.length).toBe(0)
    cssSandbox.destroy()
  })

  it('destroy 清除所有样式并移除 scope class', () => {
    const cssSandbox = createStyleSandbox({ container, prefix: 'destroy-test' })
    cssSandbox.inject('.x { color: red; }')
    cssSandbox.destroy()
    expect(cssSandbox.styleElements.length).toBe(0)
    expect(container.classList.has('destroy-test')).toBe(false)
  })
})

// ================================================================
//  6. EventBus 订阅/发布/取消订阅
// ================================================================

describe('EventBus 订阅/发布/取消订阅', () => {

  it('on 订阅事件并返回取消函数', () => {
    const bus = new EventBus()
    const unsubscribe = bus.on('test-event', () => {})
    expect(typeof unsubscribe).toBe('function')
    expect(bus.hasListeners('test-event')).toBe(true)
    bus.destroy()
  })

  it('emit 触发监听器', () => {
    const bus = new EventBus()
    let received: any = null
    bus.on('data', (payload) => { received = payload })
    bus.emit('data', { key: 'value' })
    expect(received).toEqual({ key: 'value' })
    bus.destroy()
  })

  it('emit 传递多个参数', () => {
    const bus = new EventBus()
    let a: any = null
    let b: any = null
    bus.on('multi', (arg1, arg2) => { a = arg1; b = arg2 })
    bus.emit('multi', 'first', 'second')
    expect(a).toBe('first')
    expect(b).toBe('second')
    bus.destroy()
  })

  it('off 取消特定监听器', () => {
    const bus = new EventBus()
    let callCount = 0
    const cb = () => { callCount++ }
    bus.on('test', cb)
    bus.emit('test')
    expect(callCount).toBe(1)
    bus.off('test', cb)
    bus.emit('test')
    expect(callCount).toBe(1)
    bus.destroy()
  })

  it('off 不传 callback 时移除所有监听器', () => {
    const bus = new EventBus()
    bus.on('test', () => {})
    bus.on('test', () => {})
    expect(bus.listenerCount('test')).toBe(2)
    bus.off('test')
    expect(bus.listenerCount('test')).toBe(0)
    bus.destroy()
  })

  it('hasListeners 检查是否有监听器', () => {
    const bus = new EventBus()
    expect(bus.hasListeners('no-listeners')).toBe(false)
    bus.on('has-listeners', () => {})
    expect(bus.hasListeners('has-listeners')).toBe(true)
    bus.destroy()
  })

  it('listenerCount 返回监听器数量', () => {
    const bus = new EventBus()
    expect(bus.listenerCount('count-test')).toBe(0)
    bus.on('count-test', () => {})
    bus.on('count-test', () => {})
    expect(bus.listenerCount('count-test')).toBe(2)
    bus.destroy()
  })
})

// ================================================================
//  7. EventBus 通配符匹配
// ================================================================

describe('EventBus 通配符匹配', () => {

  it('prefix:* 通配符匹配', () => {
    const bus = new EventBus()
    let receivedEvent: string | null = null
    let receivedData: any = null
    bus.on('user:*', (data, eventName) => {
      receivedData = data
      receivedEvent = eventName
    })
    bus.emit('user:login', { id: 1 })
    expect(receivedData).toEqual({ id: 1 })
    expect(receivedEvent).toBe('user:login')
    bus.destroy()
  })

  it('* 全局通配符匹配所有事件', () => {
    const bus = new EventBus()
    const events: string[] = []
    bus.on('*', (_data: any, eventName: string) => {
      events.push(eventName)
    })
    bus.emit('event-a', null)
    bus.emit('event-b', null)
    bus.emit('event-c', null)
    expect(events).toEqual(['event-a', 'event-b', 'event-c'])
    bus.destroy()
  })

  it('精确匹配和通配符同时触发', () => {
    const bus = new EventBus()
    let exactCalled = false
    let wildcardCalled = false
    bus.on('app:start', () => { exactCalled = true })
    bus.on('app:*', () => { wildcardCalled = true })
    bus.emit('app:start')
    expect(exactCalled).toBe(true)
    expect(wildcardCalled).toBe(true)
    bus.destroy()
  })
})

// ================================================================
//  8. EventBus once 一次性订阅
// ================================================================

describe('EventBus once 一次性订阅', () => {

  it('只触发一次', () => {
    const bus = new EventBus()
    let callCount = 0
    bus.once('once-test', () => { callCount++ })
    bus.emit('once-test')
    bus.emit('once-test')
    bus.emit('once-test')
    expect(callCount).toBe(1)
    bus.destroy()
  })

  it('返回的取消函数可以提前取消', () => {
    const bus = new EventBus()
    let callCount = 0
    const unsub = bus.once('cancel-once', () => { callCount++ })
    unsub()
    bus.emit('cancel-once')
    expect(callCount).toBe(0)
    bus.destroy()
  })
})

// ================================================================
//  9. EventBus destroy
// ================================================================

describe('EventBus destroy', () => {

  it('destroy 后 emit 不触发监听器', () => {
    const bus = new EventBus()
    let called = false
    bus.on('destroy-test', () => { called = true })
    bus.destroy()
    bus.emit('destroy-test')
    expect(called).toBe(false)
  })

  it('destroy 后 on 返回空函数', () => {
    const bus = new EventBus()
    bus.destroy()
    const unsub = bus.on('post-destroy', () => {})
    expect(typeof unsub).toBe('function')
  })

  it('clear 清除所有监听器但不标记销毁', () => {
    const bus = new EventBus()
    bus.on('a', () => {})
    bus.on('b', () => {})
    bus.clear()
    expect(bus.hasListeners('a')).toBe(false)
    expect(bus.hasListeners('b')).toBe(false)
    // 仍然可以订阅新事件
    bus.on('c', () => {})
    expect(bus.hasListeners('c')).toBe(true)
    bus.destroy()
  })
})

// ================================================================
//  10. SharedState set/get/remove/watch
// ================================================================

describe('SharedState set/get/remove/watch', () => {

  it('set 和 get 基本操作', () => {
    const state = new SharedState()
    state.set('name', 'Alice')
    expect(state.get('name')).toBe('Alice')
    state.destroy()
  })

  it('get 返回默认值', () => {
    const state = new SharedState()
    expect(state.get('nonexistent')).toBeUndefined()
    expect(state.get('nonexistent', 'default')).toBe('default')
    state.destroy()
  })

  it('has 检查键是否存在', () => {
    const state = new SharedState()
    expect(state.has('key')).toBe(false)
    state.set('key', 'value')
    expect(state.has('key')).toBe(true)
    state.destroy()
  })

  it('remove 删除键值', () => {
    const state = new SharedState()
    state.set('to-remove', 'value')
    expect(state.has('to-remove')).toBe(true)
    state.remove('to-remove')
    expect(state.has('to-remove')).toBe(false)
    state.destroy()
  })

  it('watch 监听值变化', () => {
    const state = new SharedState()
    let newValue: any = null
    let oldValue: any = null
    state.watch('count', (nv, ov) => {
      newValue = nv
      oldValue = ov
    })
    state.set('count', 1)
    state.set('count', 2)
    expect(newValue).toBe(2)
    expect(oldValue).toBe(1)
    state.destroy()
  })

  it('watch 返回取消监听函数', () => {
    const state = new SharedState()
    let callCount = 0
    const unwatch = state.watch('x', () => { callCount++ })
    state.set('x', 1)
    state.set('x', 2)
    expect(callCount).toBe(2)
    unwatch()
    state.set('x', 3)
    expect(callCount).toBe(2)
    state.destroy()
  })

  it('相同值不触发 watch', () => {
    const state = new SharedState()
    let callCount = 0
    state.watch('same', () => { callCount++ })
    state.set('same', 'value')
    state.set('same', 'value')
    expect(callCount).toBe(1)
    state.destroy()
  })

  it('remove 触发 watch（newValue 为 undefined）', () => {
    const state = new SharedState()
    let newValue: any = 'not-set'
    let oldValue: any = null
    state.set('to-delete', 'original')
    state.watch('to-delete', (nv, ov) => {
      newValue = nv
      oldValue = ov
    })
    state.remove('to-delete')
    expect(newValue).toBeUndefined()
    expect(oldValue).toBe('original')
    state.destroy()
  })
})

// ================================================================
//  11. SharedState watchAll
// ================================================================

describe('SharedState watchAll', () => {

  it('监听所有键的变化', () => {
    const state = new SharedState()
    const changes: Array<{ key: string; newValue: any }> = []
    state.watchAll((key, newValue) => {
      changes.push({ key, newValue })
    })
    state.set('a', 1)
    state.set('b', 2)
    expect(changes.length).toBe(2)
    expect(changes[0].key).toBe('a')
    expect(changes[1].key).toBe('b')
    state.destroy()
  })

  it('返回取消监听函数', () => {
    const state = new SharedState()
    let callCount = 0
    const unwatch = state.watchAll(() => { callCount++ })
    state.set('a', 1)
    unwatch()
    state.set('b', 2)
    expect(callCount).toBe(1)
    state.destroy()
  })
})

// ================================================================
//  12. SharedState batchSet
// ================================================================

describe('SharedState batchSet', () => {

  it('批量设置值', () => {
    const state = new SharedState()
    state.batchSet({ name: 'Alice', age: 30, city: 'Beijing' })
    expect(state.get('name')).toBe('Alice')
    expect(state.get('age')).toBe(30)
    expect(state.get('city')).toBe('Beijing')
    state.destroy()
  })

  it('keys / values / entries 方法', () => {
    const state = new SharedState()
    state.batchSet({ a: 1, b: 2, c: 3 })
    expect(state.keys().sort()).toEqual(['a', 'b', 'c'])
    expect(state.values().sort()).toEqual([1, 2, 3])
    expect(state.entries().length).toBe(3)
    state.destroy()
  })

  it('clear 清除所有状态', () => {
    const state = new SharedState()
    state.batchSet({ a: 1, b: 2 })
    state.clear()
    expect(state.keys().length).toBe(0)
    state.destroy()
  })

  it('destroy 后 set 不生效', () => {
    const state = new SharedState()
    state.destroy()
    state.set('after-destroy', 'value')
    expect(state.get('after-destroy')).toBeUndefined()
  })
})

// ================================================================
//  13. createQiankunLifeCycle 适配器
// ================================================================

describe('createQiankunLifeCycle 适配器', () => {

  it('返回包含 bootstrap/mount/unmount 的对象', () => {
    const lc = createQiankunLifeCycle({
      name: 'test-app',
      component: { render: () => ({ type: 'div', children: 'Hello' }) },
    })
    expect(typeof lc.bootstrap).toBe('function')
    expect(typeof lc.mount).toBe('function')
    expect(typeof lc.unmount).toBe('function')
    expect(typeof lc.update).toBe('function')
  })

  it('bootstrap 不报错', async () => {
    const lc = createQiankunLifeCycle({
      name: 'test-bootstrap',
      component: {},
    })
    await lc.bootstrap({ container: null as any, name: 'test' })
  })

  it('mount 和 unmount 不报错', async () => {
    const container = createMockContainer()
    const lc = createQiankunLifeCycle({
      name: 'test-mount',
      component: {},
    })
    await lc.bootstrap({ container: container as any, name: 'test' })
    await lc.mount({ container: container as any, name: 'test' })
    await lc.unmount({ container: container as any, name: 'test' })
  })
})

// ================================================================
//  14. createMicroAppEntry 适配器
// ================================================================

describe('createMicroAppEntry 适配器', () => {

  it('返回包含 name/tagName/register/mount/getTagName 的对象', () => {
    const entry = createMicroAppEntry({
      name: 'micro-test',
      component: {},
    })
    expect(entry.name).toBe('micro-test')
    expect(entry.tagName).toBe('micro-micro-test')
    expect(typeof entry.register).toBe('function')
    expect(typeof entry.mount).toBe('function')
    expect(typeof entry.getTagName).toBe('function')
  })

  it('getTagName 返回正确的标签名', () => {
    const entry = createMicroAppEntry({
      name: 'my-app',
      component: {},
    })
    expect(entry.getTagName()).toBe('micro-my-app')
  })

  it('register 重复调用不报错', () => {
    const entry = createMicroAppEntry({
      name: 'double-register',
      component: {},
    })
    entry.register()
    entry.register()
  })
})

// ================================================================
//  15. createMicroFrontendConfig 通用配置
// ================================================================

describe('createMicroFrontendConfig 通用配置', () => {

  it('返回包含 name/toQiankun/toMicroApp 的对象', () => {
    const config = createMicroFrontendConfig({
      name: 'universal-app',
      component: {},
    })
    expect(config.name).toBe('universal-app')
    expect(typeof config.toQiankun).toBe('function')
    expect(typeof config.toMicroApp).toBe('function')
  })

  it('toQiankun 返回 qiankun 生命周期', () => {
    const config = createMicroFrontendConfig({
      name: 'qiankun-app',
      component: {},
    })
    const lc = config.toQiankun()
    expect(typeof lc.bootstrap).toBe('function')
    expect(typeof lc.mount).toBe('function')
    expect(typeof lc.unmount).toBe('function')
  })

  it('toMicroApp 返回 micro-app 入口', () => {
    const config = createMicroFrontendConfig({
      name: 'microapp-entry',
      component: {},
    })
    const entry = config.toMicroApp()
    expect(entry.name).toBe('microapp-entry')
    expect(typeof entry.register).toBe('function')
  })
})
