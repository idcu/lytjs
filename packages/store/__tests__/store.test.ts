/**
 * Lyt.js 状态管理 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 Store 的创建、状态管理、计算属性、操作方法、订阅和重置。
 *
 * 测试覆盖：
 *   - createStore 基本创建
 *   - state 响应式
 *   - getters 计算
 *   - actions 执行
 *   - $reset 重置
 *   - $subscribe 订阅
 *   - $patch 批量更新
 *   - getStore 获取已注册 store
 */

import {
  describe,
  it,
  expect,
  waitFor,
  afterEach,
} from '../../test-utils/src/index'

import {
  createStore,
  getStore,
  getStoreIds,
  clearAllStores,
} from '../src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Store 状态管理', () => {

  // 每个测试后清理 Store 注册表，避免状态污染
  afterEach(() => {
    clearAllStores()
  })

  // ---- 1. createStore 基本创建 ----
  it('createStore 基本创建', () => {
    const useCounterStore = createStore('counter', {
      state: () => ({
        count: 0,
        name: 'lyt',
      }),
    })

    const store = useCounterStore()

    expect(store.$id).toBe('counter')
    expect(store.state).toBeDefined()
    expect(store.state.count).toBe(0)
    expect(store.state.name).toBe('lyt')
  })

  // ---- 2. state 响应式 ----
  it('state 响应式', () => {
    const useStore = createStore('reactive', {
      state: () => ({
        count: 0,
        items: [] as string[],
      }),
    })

    const store = useStore()

    // 读取初始值
    expect(store.state.count).toBe(0)
    expect(store.state.items.length).toBe(0)

    // 修改状态
    store.state.count = 10
    store.state.items.push('a', 'b')

    expect(store.state.count).toBe(10)
    expect(store.state.items.length).toBe(2)
    expect(store.state.items).toContain('a')
    expect(store.state.items).toContain('b')
  })

  // ---- 3. getters 计算 ----
  it('getters 计算', () => {
    const useStore = createStore('computed', {
      state: () => ({
        count: 3,
        name: 'lyt',
      }),
      getters: {
        doubleCount: (state) => state.count * 2,
        greeting: (state) => `Hello, ${state.name}!`,
      },
    })

    const store = useStore()

    expect(store.getters.doubleCount).toBe(6)
    expect(store.getters.greeting).toBe('Hello, lyt!')

    // 修改依赖后，getter 应该更新
    store.state.count = 5
    expect(store.getters.doubleCount).toBe(10)

    store.state.name = 'world'
    expect(store.getters.greeting).toBe('Hello, world!')
  })

  // ---- 4. actions 执行 ----
  it('actions 执行', () => {
    const useStore = createStore('actions', {
      state: () => ({
        count: 0,
      }),
      actions: {
        increment() {
          this.state.count++
        },
        add(n: number) {
          this.state.count += n
        },
      },
    })

    const store = useStore()

    expect(store.state.count).toBe(0)

    store.actions.increment()
    expect(store.state.count).toBe(1)

    store.actions.increment()
    expect(store.state.count).toBe(2)

    store.actions.add(10)
    expect(store.state.count).toBe(12)
  })

  // ---- 5. $reset 重置 ----
  it('$reset 重置', () => {
    const useStore = createStore('reset', {
      state: () => ({
        count: 0,
        name: 'original',
      }),
    })

    const store = useStore()

    // 修改状态
    store.state.count = 100
    store.state.name = 'modified'

    expect(store.state.count).toBe(100)
    expect(store.state.name).toBe('modified')

    // 重置
    store.$reset()

    expect(store.state.count).toBe(0)
    expect(store.state.name).toBe('original')
  })

  // ---- 6. $subscribe 订阅 ----
  it('$subscribe 订阅', async () => {
    const useStore = createStore('subscribe', {
      state: () => ({
        value: 'initial',
      }),
    })

    const store = useStore()
    const mutations: string[] = []

    // 订阅状态变化
    const unsubscribe = store.$subscribe((mutation, state) => {
      mutations.push(`${mutation.type}:${mutation.key}`)
    })

    // 修改状态
    store.state.value = 'updated'

    // 等待响应式系统触发
    await waitFor(50)

    // 取消订阅
    unsubscribe()

    // 再次修改
    store.state.value = 'after-unsubscribe'

    await waitFor(50)

    // 订阅期间应该有记录
    expect(mutations.length).toBeGreaterThan(0)
  })

  // ---- 7. $patch 批量更新 ----
  it('$patch 批量更新', () => {
    const useStore = createStore('patch', {
      state: () => ({
        count: 0,
        name: 'lyt',
        active: false,
      }),
    })

    const store = useStore()

    // 批量更新
    store.$patch({
      count: 10,
      name: 'patched',
      active: true,
    })

    expect(store.state.count).toBe(10)
    expect(store.state.name).toBe('patched')
    expect(store.state.active).toBe(true)
  })

  // ---- 8. getStore 获取已注册 store ----
  it('getStore 获取已注册 store', () => {
    const useStore = createStore('registered', {
      state: () => ({ value: 42 }),
    })

    // 调用工厂函数以注册
    useStore()

    // 通过 getStore 获取
    const store = getStore('registered')
    expect(store).toBeDefined()
    expect(store!.$id).toBe('registered')
    expect(store!.state.value).toBe(42)
  })

  // ---- 9. getStoreIds 获取所有 store ID ----
  it('getStoreIds 获取所有 store ID', () => {
    // 先创建一个 store
    const useStore = createStore('ids-test', {
      state: () => ({ value: 1 }),
    })
    useStore()

    const ids = getStoreIds()
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain('ids-test')
  })

  // ---- 10. $dispose 销毁 store ----
  it('$dispose 销毁 store', () => {
    const useStore = createStore('disposable', {
      state: () => ({ data: 'important' }),
    })

    const store = useStore()
    expect(store.$id).toBe('disposable')

    // 销毁
    store.$dispose()

    // 销毁后应该从注册表中移除
    const retrieved = getStore('disposable')
    expect(retrieved).toBeUndefined()
  })

  // ---- 11. use() 方法 ----
  it('use() 方法返回 state 和 getters', () => {
    const useStore = createStore('use-method', {
      state: () => ({ count: 5 }),
      getters: {
        double: (state) => state.count * 2,
      },
    })

    const store = useStore()
    const { state, getters } = store.$expose()

    expect(state.count).toBe(5)
    expect(getters.double).toBe(10)
  })

  // ---- 12. state 为对象形式（非工厂函数） ----
  it('state 为对象形式（非工厂函数）', () => {
    const useStore = createStore('object-state', {
      state: {
        value: 'static',
      },
    })

    const store = useStore()
    expect(store.state.value).toBe('static')
  })

  // ---- 13. 重复创建同名 store 返回已有实例 ----
  it('重复创建同名 store 返回已有实例', () => {
    const useStore1 = createStore('duplicate', {
      state: () => ({ v: 1 }),
    })
    const store1 = useStore1()
    store1.state.v = 999

    // 再次创建同名 store
    const useStore2 = createStore('duplicate', {
      state: () => ({ v: 2 }),
    })
    const store2 = useStore2()

    // 应该返回同一个实例
    expect(store2.state.v).toBe(999)
  })
})
