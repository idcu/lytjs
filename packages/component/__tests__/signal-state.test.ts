/**
 * Lyt.js Signal State Adapter — 单元测试
 *
 * 测试 Signal 状态创建、代理读写、computed/watch 集成、
 * 组件生命周期、Proxy vs Signal 等价性、性能对比等。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import {
  createSignalState,
  createSignalStateProxy,
  getSignalStateSnapshot,
  patchSignalState,
  disposeSignalState,
} from '../src/signal-state'

import {
  defineComponent,
  createComponentInstance,
  setupComponent,
  mountComponent,
  updateComponent,
  unmountComponent,
} from '../src/index'

import type {
  ComponentInternalInstance,
} from '../src/index'

import {
  shallowReactive,
} from '../../reactivity/src/index.ts'

import {
  signal,
  computed,
  effect,
} from '../../reactivity/src/signal.ts'

// ================================================================
//  测试用例
// ================================================================

describe('Signal State Adapter', () => {

  // ---- 1. Signal state creation ----
  it('createSignalState 基本创建', () => {
    const state = createSignalState({ count: 0, name: 'hello' })
    expect(typeof state.count).toBe('function')
    expect(typeof state.name).toBe('function')
    expect(state.count()).toBe(0)
    expect(state.name()).toBe('hello')
  })

  // ---- 2. Signal state creation with various types ----
  it('createSignalState 支持多种类型', () => {
    const state = createSignalState({
      num: 42,
      str: 'text',
      bool: true,
      arr: [1, 2, 3],
      obj: { a: 1 },
      nil: null,
      undef: undefined,
    })
    expect(state.num()).toBe(42)
    expect(state.str()).toBe('text')
    expect(state.bool()).toBe(true)
    expect(state.arr()).toEqual([1, 2, 3])
    expect(state.obj()).toEqual({ a: 1 })
    expect(state.nil()).toBe(null)
    expect(state.undef()).toBe(undefined)
  })

  // ---- 3. Signal state creation with empty object ----
  it('createSignalState 空对象', () => {
    const state = createSignalState({})
    expect(Object.keys(state).length).toBe(0)
  })

  // ---- 4. Signal state proxy read (auto-unwrap) ----
  it('createSignalStateProxy 读取自动解包', () => {
    const raw = createSignalState({ count: 5, name: 'world' })
    const proxy = createSignalStateProxy(raw)
    expect(proxy.count).toBe(5)
    expect(proxy.name).toBe('world')
  })

  // ---- 5. Signal state proxy write (auto-set) ----
  it('createSignalStateProxy 写入自动设置', () => {
    const raw = createSignalState({ count: 0 })
    const proxy = createSignalStateProxy(raw)
    proxy.count = 10
    expect(raw.count()).toBe(10)
    expect(proxy.count).toBe(10)
  })

  // ---- 6. Signal state proxy write triggers effect ----
  it('Signal state proxy 写入触发 effect', () => {
    const raw = createSignalState({ count: 0 })
    const proxy = createSignalStateProxy(raw)
    let effectCount = 0
    effect(() => {
      effectCount = proxy.count
    })
    expect(effectCount).toBe(0)
    proxy.count = 5
    expect(effectCount).toBe(5)
  })

  // ---- 7. Signal state with computed ----
  it('Signal state + computed 集成', () => {
    const raw = createSignalState({ count: 3 })
    const proxy = createSignalStateProxy(raw)
    const double = computed(() => proxy.count * 2)
    expect(double()).toBe(6)
    proxy.count = 7
    expect(double()).toBe(14)
  })

  // ---- 8. Signal state with watch (via effect) ----
  it('Signal state + watch (effect) 集成', () => {
    const raw = createSignalState({ value: 'a' })
    const proxy = createSignalStateProxy(raw)
    const changes: string[] = []
    effect(() => {
      changes.push(proxy.value)
    })
    expect(changes.length).toBe(1)
    expect(changes[0]).toBe('a')
    proxy.value = 'b'
    expect(changes.length).toBe(2)
    expect(changes[1]).toBe('b')
  })

  // ---- 9. getSignalStateSnapshot ----
  it('getSignalStateSnapshot 获取快照', () => {
    const raw = createSignalState({ x: 1, y: 2 })
    const snapshot = getSignalStateSnapshot(raw)
    expect(snapshot).toEqual({ x: 1, y: 2 })
    raw.x.set(10)
    const snapshot2 = getSignalStateSnapshot(raw)
    expect(snapshot2).toEqual({ x: 10, y: 2 })
  })

  // ---- 10. patchSignalState ----
  it('patchSignalState 批量更新', () => {
    const raw = createSignalState({ a: 1, b: 2, c: 3 })
    patchSignalState(raw, { a: 10, c: 30 })
    expect(raw.a()).toBe(10)
    expect(raw.b()).toBe(2)  // 未修改
    expect(raw.c()).toBe(30)
  })

  // ---- 11. disposeSignalState ----
  it('disposeSignalState 不抛错', () => {
    const raw = createSignalState({ x: 1 })
    // disposeSignalState 当前是空操作，但不应抛错
    disposeSignalState(raw)
    expect(raw.x()).toBe(1)
  })

  // ---- 12. Signal state with nested objects (shallow) ----
  it('Signal state 嵌套对象（浅层）', () => {
    const nested = { inner: { deep: true } }
    const raw = createSignalState({ data: nested })
    const proxy = createSignalStateProxy(raw)
    // Signal 是浅层的，嵌套对象引用不变
    expect(proxy.data.inner.deep).toBe(true)
    // 直接修改嵌套属性不会触发 Signal 更新
    proxy.data.inner.deep = false
    expect(proxy.data.inner.deep).toBe(false)
    // 替换整个嵌套对象会触发更新
    proxy.data = { inner: { deep: true, new: 1 } }
    expect(proxy.data.inner.new).toBe(1)
  })

  // ---- 13. Signal state with arrays ----
  it('Signal state 数组', () => {
    const raw = createSignalState({ items: [1, 2, 3] })
    const proxy = createSignalStateProxy(raw)
    expect(proxy.items).toEqual([1, 2, 3])
    // 替换数组
    proxy.items = [4, 5, 6]
    expect(proxy.items).toEqual([4, 5, 6])
  })

  // ---- 14. Edge case: undefined values ----
  it('Signal state undefined 值', () => {
    const raw = createSignalState({ a: undefined, b: 1 })
    const proxy = createSignalStateProxy(raw)
    expect(proxy.a).toBe(undefined)
    expect(proxy.b).toBe(1)
    proxy.a = 'now defined'
    expect(proxy.a).toBe('now defined')
  })

  // ---- 15. Edge case: null values ----
  it('Signal state null 值', () => {
    const raw = createSignalState({ val: null })
    const proxy = createSignalStateProxy(raw)
    expect(proxy.val).toBe(null)
    proxy.val = 'not null'
    expect(proxy.val).toBe('not null')
  })

  // ---- 16. Edge case: symbol keys ----
  it('createSignalState 忽略 Symbol 键', () => {
    const sym = Symbol('test')
    const input: any = { a: 1 }
    input[sym] = 'symbol-value'
    const raw = createSignalState(input)
    // Object.keys 不包含 Symbol 键
    expect(Object.keys(raw)).toEqual(['a'])
    expect(raw.a()).toBe(1)
  })

  // ---- 17. Proxy vs Signal state equivalence ----
  it('Proxy vs Signal 状态等价性', () => {
    // Proxy 模式
    const proxyState = shallowReactive({ count: 0, name: 'test' })
    // Signal 模式
    const signalRaw = createSignalState({ count: 0, name: 'test' })
    const signalProxy = createSignalStateProxy(signalRaw)

    // 初始值相同
    expect(proxyState.count).toBe(signalProxy.count)
    expect(proxyState.name).toBe(signalProxy.name)

    // 更新后值相同
    proxyState.count = 5
    signalProxy.count = 5
    expect(proxyState.count).toBe(signalProxy.count)

    proxyState.name = 'updated'
    signalProxy.name = 'updated'
    expect(proxyState.name).toBe(signalProxy.name)
  })

  // ---- 18. defineComponent with reactivityMode: 'signal' ----
  it('defineComponent reactivityMode: signal 基本功能', () => {
    const comp = defineComponent({
      name: 'SignalComponent',
      reactivityMode: 'signal',
      state() {
        return { count: 0, text: 'hello' }
      },
      methods: {
        increment() {
          this.count++
        },
      },
    })

    expect(comp._isComponentDefine).toBe(true)
    expect(comp.options.reactivityMode).toBe('signal')

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // Signal 模式下 state 通过 proxy 访问
    expect(instance.state.count).toBe(0)
    expect(instance.state.text).toBe('hello')

    // _signalState 应该存在
    expect(instance._signalState).toBeDefined()
    expect(typeof instance._signalState!.count).toBe('function')
  })

  // ---- 19. defineComponent with reactivityMode: 'signal' + computed ----
  it('defineComponent signal 模式 + computed', () => {
    const comp = defineComponent({
      name: 'SignalComputed',
      reactivityMode: 'signal',
      state() {
        return { count: 3 }
      },
      computed: {
        double() {
          return this.count * 2
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // computed 通过 renderProxy 访问
    expect((instance.renderProxy as any).double).toBe(6)
  })

  // ---- 20. defineComponent with reactivityMode: 'signal' + $setState ----
  it('defineComponent signal 模式 + $setState', () => {
    const comp = defineComponent({
      name: 'SignalSetState',
      reactivityMode: 'signal',
      state() {
        return { x: 1, y: 2 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    instance.renderProxy.$setState({ x: 10, y: 20 })
    expect(instance.state.x).toBe(10)
    expect(instance.state.y).toBe(20)
  })

  // ---- 21. defineComponent with reactivityMode: 'signal' + methods ----
  it('defineComponent signal 模式 + methods', () => {
    const comp = defineComponent({
      name: 'SignalMethods',
      reactivityMode: 'signal',
      state() {
        return { count: 0 }
      },
      methods: {
        increment() {
          this.count++
        },
        add(n: number) {
          this.count += n
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    ;(instance.renderProxy as any).increment()
    expect(instance.state.count).toBe(1)

    ;(instance.renderProxy as any).add(5)
    expect(instance.state.count).toBe(6)
  })

  // ---- 22. defineComponent with reactivityMode: 'proxy' (backward compat) ----
  it('defineComponent reactivityMode: proxy 向后兼容', () => {
    const comp = defineComponent({
      name: 'ProxyComponent',
      reactivityMode: 'proxy',
      state() {
        return { count: 0 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(instance.state.count).toBe(0)
    expect(instance._signalState).toBeUndefined()

    instance.state.count = 5
    expect(instance.state.count).toBe(5)
  })

  // ---- 23. defineComponent default mode (no reactivityMode) ----
  it('defineComponent 默认模式为 proxy', () => {
    const comp = defineComponent({
      name: 'DefaultComponent',
      state() {
        return { val: 'default' }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(instance.state.val).toBe('default')
    expect(instance._signalState).toBeUndefined()
  })

  // ---- 24. Mixed mode: some components signal, some proxy ----
  it('混合模式：部分组件 signal，部分 proxy', () => {
    const signalComp = defineComponent({
      name: 'SignalComp',
      reactivityMode: 'signal',
      state() { return { x: 1 } },
    })

    const proxyComp = defineComponent({
      name: 'ProxyComp',
      reactivityMode: 'proxy',
      state() { return { x: 1 } },
    })

    const defaultComp = defineComponent({
      name: 'DefaultComp',
      state() { return { x: 1 } },
    })

    const signalInst = createComponentInstance(signalComp)
    const proxyInst = createComponentInstance(proxyComp)
    const defaultInst = createComponentInstance(defaultComp)

    setupComponent(signalInst)
    setupComponent(proxyInst)
    setupComponent(defaultInst)

    // Signal 模式有 _signalState
    expect(signalInst._signalState).toBeDefined()
    // Proxy 模式没有
    expect(proxyInst._signalState).toBeUndefined()
    // 默认模式也没有
    expect(defaultInst._signalState).toBeUndefined()

    // 都能正常读写
    signalInst.state.x = 10
    proxyInst.state.x = 10
    defaultInst.state.x = 10

    expect(signalInst.state.x).toBe(10)
    expect(proxyInst.state.x).toBe(10)
    expect(defaultInst.state.x).toBe(10)
  })

  // ---- 25. Signal state component lifecycle ----
  it('Signal 模式组件生命周期', () => {
    const lifecycle: string[] = []

    const comp = defineComponent({
      name: 'LifecycleSignal',
      reactivityMode: 'signal',
      state() {
        return { mounted: false }
      },
      init() {
        lifecycle.push('init')
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(lifecycle).toEqual(['init'])

    mountComponent(instance)
    expect(instance.isMounted).toBe(true)

    unmountComponent(instance)
    expect(instance.isUnmounted).toBe(true)
  })

  // ---- 26. Performance: Signal state 10,000 updates ----
  it('性能: Signal state 10,000 次更新', () => {
    const raw = createSignalState({ count: 0 })
    const proxy = createSignalStateProxy(raw)

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      proxy.count = i
    }
    const elapsed = performance.now() - start

    expect(proxy.count).toBe(9999)
    // 性能断言：10,000 次更新应在 500ms 内完成
    expect(elapsed).toBeLessThan(500)
  })

  // ---- 27. Performance: Proxy state 10,000 updates ----
  it('性能: Proxy state 10,000 次更新', () => {
    const proxyState = shallowReactive({ count: 0 })

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      proxyState.count = i
    }
    const elapsed = performance.now() - start

    expect(proxyState.count).toBe(9999)
    // 性能断言：10,000 次更新应在 500ms 内完成
    expect(elapsed).toBeLessThan(500)
  })

  // ---- 28. Performance comparison: Signal vs Proxy ----
  it('性能对比: Signal vs Proxy 创建 + 更新', () => {
    const iterations = 5000

    // Signal 模式
    const signalStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      const raw = createSignalState({ a: 0, b: 0 })
      const proxy = createSignalStateProxy(raw)
      proxy.a = i
      proxy.b = i * 2
    }
    const signalElapsed = performance.now() - signalStart

    // Proxy 模式
    const proxyStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      const state = shallowReactive({ a: 0, b: 0 })
      state.a = i
      state.b = i * 2
    }
    const proxyElapsed = performance.now() - proxyStart

    // 两种模式都应在合理时间内完成
    expect(signalElapsed).toBeLessThan(2000)
    expect(proxyElapsed).toBeLessThan(2000)

    // 记录对比（不要求某种模式更快，仅确保两者都可用）
    const ratio = signalElapsed / proxyElapsed
    // Signal 和 Proxy 的性能差异不应超过 50 倍
    expect(ratio).toBeLessThan(50)
  })

  // ---- 29. Memory: Signal state cleanup ----
  it('内存: Signal state 清理后 effect 不再触发', () => {
    const raw = createSignalState({ val: 0 })
    const proxy = createSignalStateProxy(raw)
    let effectRuns = 0

    const dispose = effect(() => {
      effectRuns++
      proxy.val  // 读取以建立依赖
    })

    expect(effectRuns).toBe(1)

    proxy.val = 1
    expect(effectRuns).toBe(2)

    // 清理 effect
    dispose()

    // 更新不应再触发 effect
    proxy.val = 2
    expect(effectRuns).toBe(2)  // 仍然是 2
  })

  // ---- 30. Signal state proxy has correct keys ----
  it('Signal state proxy 的 keys 正确', () => {
    const raw = createSignalState({ a: 1, b: 2, c: 3 })
    const proxy = createSignalStateProxy(raw)
    const keys = Object.keys(proxy)
    expect(keys).toEqual(['a', 'b', 'c'])
  })

  // ---- 31. Signal state proxy in operator ----
  it('Signal state proxy in 操作符', () => {
    const raw = createSignalState({ x: 1 })
    const proxy = createSignalStateProxy(raw)
    expect('x' in proxy).toBe(true)
    expect('y' in proxy).toBe(false)
  })

  // ---- 32. defineComponent signal mode + watch ----
  it('defineComponent signal 模式 + watch', () => {
    const watchValues: number[] = []

    const comp = defineComponent({
      name: 'SignalWatch',
      reactivityMode: 'signal',
      state() {
        return { count: 0 }
      },
      watch: {
        count: {
          handler(newVal: number) {
            watchValues.push(newVal)
          },
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // signal effect 会在初始化时执行一次
    // 更新 state
    instance.state.count = 1
    instance.state.count = 2
    instance.state.count = 3

    // watch 应该追踪到变化（至少有初始执行）
    expect(watchValues.length).toBeGreaterThan(0)
  })

  // ---- 33. Signal state with $forceUpdate ----
  it('Signal 模式 $forceUpdate 不抛错', () => {
    const comp = defineComponent({
      name: 'SignalForceUpdate',
      reactivityMode: 'signal',
      state() {
        return { val: 1 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // $forceUpdate 不应抛错（即使没有 update 回调）
    instance.renderProxy.$forceUpdate()
    expect(instance.state.val).toBe(1)
  })

  // ---- 34. Signal state + Vapor Mode integration ----
  it('Signal 模式 + Vapor Mode 集成（基础）', () => {
    const comp = defineComponent({
      name: 'SignalVapor',
      reactivityMode: 'signal',
      state() {
        return { items: [1, 2, 3] }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // 验证 state 可正常读写
    expect(instance.state.items).toEqual([1, 2, 3])
    instance.state.items = [4, 5, 6]
    expect(instance.state.items).toEqual([4, 5, 6])

    // 验证 _signalState 存在
    expect(instance._signalState).toBeDefined()
  })

  // ---- 35. Signal state multiple rapid updates ----
  it('Signal state 多次快速更新', () => {
    const raw = createSignalState({ count: 0 })
    const proxy = createSignalStateProxy(raw)
    let lastSeen = 0

    effect(() => {
      lastSeen = proxy.count
    })

    // 快速多次更新
    for (let i = 1; i <= 100; i++) {
      proxy.count = i
    }

    // 最终值应正确
    expect(proxy.count).toBe(100)
    expect(lastSeen).toBe(100)
  })

  // ---- 36. Signal state with same value (no-op) ----
  it('Signal state 相同值不触发更新', () => {
    const raw = createSignalState({ val: 5 })
    const proxy = createSignalStateProxy(raw)
    let effectRuns = 0

    effect(() => {
      effectRuns++
      proxy.val
    })

    expect(effectRuns).toBe(1)

    // 设置相同值（Object.is 比较）
    proxy.val = 5
    expect(effectRuns).toBe(1)  // 不应增加
  })

  // ---- 37. Signal state with 0 and false values ----
  it('Signal state 正确处理 0 和 false', () => {
    const raw = createSignalState({ zero: 0, falsy: false, empty: '' })
    const proxy = createSignalStateProxy(raw)

    expect(proxy.zero).toBe(0)
    expect(proxy.falsy).toBe(false)
    expect(proxy.empty).toBe('')

    // 更新为真值
    proxy.zero = 1
    proxy.falsy = true
    proxy.empty = 'not empty'

    expect(proxy.zero).toBe(1)
    expect(proxy.falsy).toBe(true)
    expect(proxy.empty).toBe('not empty')
  })

  // ---- 38. defineComponent signal mode + init returning state ----
  it('defineComponent signal 模式 + init 返回状态', () => {
    const comp = defineComponent({
      name: 'SignalInitReturn',
      reactivityMode: 'signal',
      state() {
        return { base: 10 }
      },
      init() {
        return { extra: 20 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(instance.state.base).toBe(10)
    expect((instance.renderProxy as any).extra).toBe(20)
  })

  // ---- 39. Signal state proxy set non-existent key ----
  it('Signal state proxy 设置不存在的 key', () => {
    const raw = createSignalState({ a: 1 })
    const proxy = createSignalStateProxy(raw)

    // 设置不存在的 key（直接写入 target，不是 Signal）
    proxy.newKey = 'new value'
    expect(proxy.newKey).toBe('new value')
    expect(raw.newKey).toBe('new value')
  })

  // ---- 40. Signal state with large number of keys ----
  it('Signal state 大量 key', () => {
    const large: Record<string, number> = {}
    for (let i = 0; i < 100; i++) {
      large[`key_${i}`] = i
    }

    const raw = createSignalState(large)
    const proxy = createSignalStateProxy(raw)

    expect(Object.keys(proxy).length).toBe(100)
    expect(proxy.key_0).toBe(0)
    expect(proxy.key_50).toBe(50)
    expect(proxy.key_99).toBe(99)

    proxy.key_50 = 999
    expect(proxy.key_50).toBe(999)
  })
})
