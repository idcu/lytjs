/**
 * Lyt.js 状态管理 — 增强功能单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 Store 的模块化、插件系统、action 拦截和增强的 $patch。
 *
 * 测试覆盖：
 *   - modules 基本注册和访问
 *   - modules 命名空间隔离
 *   - modules getters
 *   - modules actions
 *   - use() 安装插件
 *   - use() 卸载插件
 *   - $onAction 拦截
 *   - $patch 对象合并
 *   - $patch 函数式
 */

import {
  describe,
  it,
  expect,
  afterEach,
} from '../../test-utils/src/index'

import {
  createStore,
  getStore,
  clearAllStores,
} from '../src/index'

import type { StorePlugin } from '../src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Store 增强功能', () => {

  // 每个测试后清理 Store 注册表，避免状态污染
  afterEach(() => {
    clearAllStores()
  })

  // ---- 1. modules 基本注册和访问 ----
  it('modules 基本注册和访问', () => {
    const useStore = createStore('mod-basic', {
      state: () => ({
        rootValue: 'root',
      }),
      modules: {
        cart: {
          state: () => ({
            items: [] as string[],
            count: 0,
          }),
        },
        user: {
          state: () => ({
            name: 'guest',
            age: 0,
          }),
        },
      },
    })

    const store = useStore()

    // 根状态正常
    expect(store.state.rootValue).toBe('root')

    // 模块状态作为命名空间下的对象存在
    expect(store.state.cart).toBeDefined()
    expect(store.state.cart.items).toEqual([])
    expect(store.state.cart.count).toBe(0)

    expect(store.state.user).toBeDefined()
    expect(store.state.user.name).toBe('guest')
    expect(store.state.user.age).toBe(0)

    // 修改模块状态
    store.state.cart.items.push('apple', 'banana')
    store.state.cart.count = 2
    store.state.user.name = 'admin'
    store.state.user.age = 25

    expect(store.state.cart.items.length).toBe(2)
    expect(store.state.cart.count).toBe(2)
    expect(store.state.user.name).toBe('admin')
    expect(store.state.user.age).toBe(25)
  })

  // ---- 2. modules 命名空间隔离 ----
  it('modules 命名空间隔离', () => {
    const useStore = createStore('mod-iso', {
      state: () => ({
        count: 100,
      }),
      modules: {
        a: {
          state: () => ({ count: 1 }),
        },
        b: {
          state: () => ({ count: 2 }),
        },
      },
    })

    const store = useStore()

    // 根状态
    expect(store.state.count).toBe(100)

    // 模块 a 的 count
    expect(store.state.a.count).toBe(1)

    // 模块 b 的 count
    expect(store.state.b.count).toBe(2)

    // 修改模块 a 不影响模块 b 和根
    store.state.a.count = 10
    expect(store.state.a.count).toBe(10)
    expect(store.state.b.count).toBe(2)
    expect(store.state.count).toBe(100)

    // 修改根不影响模块
    store.state.count = 200
    expect(store.state.count).toBe(200)
    expect(store.state.a.count).toBe(10)
    expect(store.state.b.count).toBe(2)
  })

  // ---- 3. modules getters ----
  it('modules getters', () => {
    const useStore = createStore('mod-getters', {
      state: () => ({
        rootCount: 5,
      }),
      getters: {
        rootDouble: (state) => state.rootCount * 2,
      },
      modules: {
        cart: {
          state: () => ({
            items: ['x', 'y', 'z'],
            price: 100,
          }),
          getters: {
            itemCount: (state) => state.items.length,
            totalPrice: (state) => state.price,
          },
        },
      },
    })

    const store = useStore()

    // 根 getter
    expect(store.getters.rootDouble).toBe(10)

    // 模块 getter（带命名空间前缀）
    expect(store.getters['cart/itemCount']).toBe(3)
    expect(store.getters['cart/totalPrice']).toBe(100)

    // 修改模块状态后 getter 应更新
    store.state.cart.items.push('w')
    expect(store.getters['cart/itemCount']).toBe(4)
  })

  // ---- 4. modules actions ----
  it('modules actions', () => {
    const useStore = createStore('mod-actions', {
      state: () => ({
        log: [] as string[],
      }),
      actions: {
        rootAction() {
          (this.state as any).log.push('root')
        },
      },
      modules: {
        counter: {
          state: () => ({
            count: 0,
          }),
          actions: {
            increment() {
              (this.state as any).counter.count++
              ;(this.state as any).log.push('counter/increment')
            },
            add(n: number) {
              (this.state as any).counter.count += n
              ;(this.state as any).log.push('counter/add')
            },
          },
        },
      },
    })

    const store = useStore()

    // 根 action
    store.actions.rootAction()
    expect(store.state.log).toContain('root')

    // 模块 action（带命名空间前缀）
    store.actions['counter/increment']()
    expect(store.state.counter.count).toBe(1)
    expect(store.state.log).toContain('counter/increment')

    store.actions['counter/add'](5)
    expect(store.state.counter.count).toBe(6)
    expect(store.state.log).toContain('counter/add')
  })

  // ---- 5. use() 安装插件 ----
  it('use() 安装插件', () => {
    let installed = false
    let receivedStore: any = null

    const plugin: StorePlugin = {
      install(store) {
        installed = true
        receivedStore = store
      },
    }

    const useStore = createStore('plugin-install', {
      state: () => ({ value: 42 }),
    })

    const store = useStore()
    store.use(plugin)

    expect(installed).toBe(true)
    expect(receivedStore).toBe(store)
  })

  // ---- 6. use() 卸载插件 ----
  it('use() 卸载插件', () => {
    let installed = false
    let uninstalled = false

    const plugin: StorePlugin = {
      install(store) {
        installed = true
        // 返回卸载函数
        return () => {
          uninstalled = true
        }
      },
    }

    const useStore = createStore('plugin-uninstall', {
      state: () => ({ value: 1 }),
    })

    const store = useStore()
    const uninstall = store.use(plugin)

    expect(installed).toBe(true)
    expect(uninstalled).toBe(false)

    // 调用卸载函数
    uninstall()

    expect(uninstalled).toBe(true)
  })

  // ---- 7. $onAction 拦截 ----
  it('$onAction 拦截 action 调用', () => {
    const useStore = createStore('onaction', {
      state: () => ({
        count: 0,
      }),
      actions: {
        increment() {
          (this.state as any).count++
        },
        add(n: number) {
          (this.state as any).count += n
        },
      },
    })

    const store = useStore()
    const interceptedActions: Array<{ name: string, args: any[] }> = []

    // 注册拦截器
    store.$onAction((action) => {
      interceptedActions.push({ ...action })
    })

    // 调用 action
    store.actions.increment()
    store.actions.add(10)

    // 验证拦截记录
    expect(interceptedActions.length).toBe(2)
    expect(interceptedActions[0].name).toBe('increment')
    expect(interceptedActions[0].args).toEqual([])
    expect(interceptedActions[1].name).toBe('add')
    expect(interceptedActions[1].args).toEqual([10])

    // action 本身仍然正常执行
    expect(store.state.count).toBe(11)
  })

  it('$onAction 取消订阅后不再拦截', () => {
    const useStore = createStore('onaction-unsub', {
      state: () => ({
        count: 0,
      }),
      actions: {
        increment() {
          (this.state as any).count++
        },
      },
    })

    const store = useStore()
    const interceptedActions: Array<{ name: string, args: any[] }> = []

    // 注册并立即取消
    const unsubscribe = store.$onAction((action) => {
      interceptedActions.push({ ...action })
    })

    store.actions.increment()
    expect(interceptedActions.length).toBe(1)

    // 取消订阅
    unsubscribe()

    store.actions.increment()
    expect(interceptedActions.length).toBe(1) // 不再增加
  })

  // ---- 8. $patch 对象合并 ----
  it('$patch 对象合并', () => {
    const useStore = createStore('patch-obj', {
      state: () => ({
        count: 0,
        name: 'original',
        active: false,
      }),
    })

    const store = useStore()

    store.$patch({ count: 10, name: 'patched', active: true })

    expect(store.state.count).toBe(10)
    expect(store.state.name).toBe('patched')
    expect(store.state.active).toBe(true)
  })

  it('$patch 对象合并只更新指定字段', () => {
    const useStore = createStore('patch-partial', {
      state: () => ({
        a: 1,
        b: 2,
        c: 3,
      }),
    })

    const store = useStore()

    store.$patch({ b: 20 })

    expect(store.state.a).toBe(1)
    expect(store.state.b).toBe(20)
    expect(store.state.c).toBe(3)
  })

  // ---- 9. $patch 函数式 ----
  it('$patch 函数式更新', () => {
    const useStore = createStore('patch-fn', {
      state: () => ({
        count: 0,
        items: [] as number[],
      }),
    })

    const store = useStore()

    store.$patch((state) => {
      state.count++
      state.items.push(1, 2, 3)
    })

    expect(store.state.count).toBe(1)
    expect(store.state.items).toEqual([1, 2, 3])
  })

  it('$patch 函数式支持复杂逻辑', () => {
    const useStore = createStore('patch-fn-complex', {
      state: () => ({
        value: 10,
        history: [] as string[],
      }),
    })

    const store = useStore()

    store.$patch((state) => {
      if (state.value > 5) {
        state.history.push(`was ${state.value}`)
      }
      state.value *= 2
    })

    expect(store.state.value).toBe(20)
    expect(store.state.history).toEqual(['was 10'])
  })

  // ---- 10. $onAction 拦截模块 action ----
  it('$onAction 拦截模块 action', () => {
    const useStore = createStore('onaction-module', {
      state: () => ({}),
      modules: {
        todo: {
          state: () => ({
            items: [] as string[],
          }),
          actions: {
            add(item: string) {
              (this.state as any).todo.items.push(item)
            },
          },
        },
      },
    })

    const store = useStore()
    const intercepted: Array<{ name: string, args: any[] }> = []

    store.$onAction((action) => {
      intercepted.push({ ...action })
    })

    store.actions['todo/add']('learn SSR')

    expect(intercepted.length).toBe(1)
    expect(intercepted[0].name).toBe('todo/add')
    expect(intercepted[0].args).toEqual(['learn SSR'])
    expect(store.state.todo.items).toEqual(['learn SSR'])
  })

  // ---- 11. 多个插件安装 ----
  it('多个插件安装', () => {
    const order: string[] = []

    const plugin1: StorePlugin = {
      install() {
        order.push('plugin1')
        return () => { order.push('uninstall-plugin1') }
      },
    }

    const plugin2: StorePlugin = {
      install() {
        order.push('plugin2')
        return () => { order.push('uninstall-plugin2') }
      },
    }

    const useStore = createStore('multi-plugin', {
      state: () => ({ v: 1 }),
    })

    const store = useStore()
    const un1 = store.use(plugin1)
    const un2 = store.use(plugin2)

    expect(order).toEqual(['plugin1', 'plugin2'])

    // 卸载顺序
    un2()
    un1()
    expect(order).toEqual(['plugin1', 'plugin2', 'uninstall-plugin2', 'uninstall-plugin1'])
  })

  // ---- 12. 插件不返回卸载函数 ----
  it('插件不返回卸载函数时 use() 仍正常工作', () => {
    let installed = false

    const plugin: StorePlugin = {
      install() {
        installed = true
        // 不返回卸载函数
      },
    }

    const useStore = createStore('plugin-no-uninstall', {
      state: () => ({ v: 1 }),
    })

    const store = useStore()
    const uninstall = store.use(plugin)

    expect(installed).toBe(true)

    // 调用卸载函数不应报错
    expect(() => uninstall()).not.toThrow()
  })
})
