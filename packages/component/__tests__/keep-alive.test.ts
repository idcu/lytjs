/**
 * Lyt.js KeepAlive 组件 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 *
 * 测试覆盖：
 *   - 基本缓存功能
 *   - 切换组件后状态保持
 *   - include 配置
 *   - exclude 配置
 *   - max 配置（LRU 淘汰）
 *   - activated/deactivated 生命周期
 *   - 嵌套组件状态保持
 *   - 多个缓存组件
 *   - pruneCache / pruneCacheEntry 工具函数
 *   - registerKeepAliveInstance / attachCacheRef
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import {
  defineComponent,
  createComponentInstance,
  setupComponent,
  mountComponent,
  unmountComponent,
  LifecycleHook,
  callLifecycleHook,
} from '../src/index'

import {
  KeepAlive,
  pruneCacheEntry,
  pruneCache,
  registerKeepAliveInstance,
  attachCacheRef,
} from '../src/builtins/keep-alive'

import type {
  ComponentInternalInstance,
  KeepAliveProps,
} from '../src/index'

// ================================================================
//  辅助函数
// ================================================================

/**
 * 创建一个模拟的 KeepAlive 实例
 */
function createKeepAliveInstance(props?: Partial<KeepAliveProps>) {
  const kaComp = KeepAlive
  const instance = createComponentInstance(kaComp)
  setupComponent(instance, {
    include: props?.include,
    exclude: props?.exclude,
    max: props?.max,
  })
  return instance
}

/**
 * 创建一个模拟的子组件 VNode
 */
function createChildVNode(name: string, key?: string, extraData?: Record<string, any>) {
  const vnode: any = {
    type: {
      name,
      options: { name },
    },
    name,
    key: key || null,
    props: {},
    children: [],
    ...extraData,
  }
  return vnode
}

/**
 * 创建一个模拟的组件内部实例
 */
function createMockComponentInstance(name: string, state?: Record<string, any>): ComponentInternalInstance {
  const comp = defineComponent({
    name,
    state() {
      return state || { count: 0 }
    },
  })
  const instance = createComponentInstance(comp)
  setupComponent(instance)
  mountComponent(instance)
  return instance
}

/**
 * 模拟 KeepAlive 的 render 调用
 */
function renderKeepAlive(
  kaInstance: ComponentInternalInstance,
  childVNode: any
): any {
  const kaOptions = kaInstance.type as any
  if (typeof kaOptions.render === 'function') {
    return kaOptions.render(null, kaInstance)
  }
  return null
}

/**
 * 模拟 KeepAlive 的 render 调用（带插槽）
 */
function renderKeepAliveWithSlot(
  kaInstance: ComponentInternalInstance,
  childVNode: any
): any {
  // 设置插槽，使 render 能获取子组件
  kaInstance.slots = {
    default: () => [childVNode],
  }
  const kaOptions = kaInstance.type as any
  if (typeof kaOptions.render === 'function') {
    return kaOptions.render(null, kaInstance)
  }
  return null
}

// ================================================================
//  测试用例
// ================================================================

describe('KeepAlive 基本缓存功能', () => {
  it('应该正确创建 KeepAlive 组件定义', () => {
    expect(KeepAlive._isComponentDefine).toBe(true)
    expect(KeepAlive.name).toBe('KeepAlive')
    expect(KeepAlive.options).toBeDefined()
    expect(KeepAlive.options.props).toBeDefined()
  })

  it('应该正确初始化 KeepAlive 实例', () => {
    const instance = createKeepAliveInstance()
    expect(instance.state.cache).toBeDefined()
    expect(instance.state.cache instanceof Map).toBe(true)
    expect(instance.state.cache.size).toBe(0)
    expect(instance.state.activeKey).toBe(null)
  })

  it('首次渲染子组件时应将其加入缓存', () => {
    const kaInstance = createKeepAliveInstance()
    const childVNode = createChildVNode('TestComp')

    const result = renderKeepAliveWithSlot(kaInstance, childVNode)

    expect(result).toBeDefined()
    expect(result.__keepalive).toBeDefined()
    expect(result.__keepalive.cacheKey).toBe('TestComp')
    expect(result.__keepalive.shouldCache).toBe(true)
    expect(kaInstance.state.cache.size).toBe(1)
    expect(kaInstance.state.cache.has('TestComp')).toBe(true)
    expect(kaInstance.state.activeKey).toBe('TestComp')
  })

  it('缓存命中时应返回缓存的 VNode（同一引用）', () => {
    const kaInstance = createKeepAliveInstance()
    const childVNode = createChildVNode('TestComp')

    // 首次渲染
    const firstResult = renderKeepAliveWithSlot(kaInstance, childVNode)

    // 再次渲染同一组件
    const secondResult = renderKeepAliveWithSlot(kaInstance, childVNode)

    // 应返回同一个 VNode 引用（非拷贝）
    expect(firstResult).toBe(secondResult)
    expect(kaInstance.state.cache.size).toBe(1)
  })
})

describe('KeepAlive 切换组件后状态保持', () => {
  it('切换组件时应触发 deactivated', () => {
    const kaInstance = createKeepAliveInstance()
    const compA = createMockComponentInstance('CompA')
    const compB = createMockComponentInstance('CompB')

    // 注册 deactivated 钩子
    let deactivatedCalled = false
    compA['deactivated'] = [() => { deactivatedCalled = true }]

    // 渲染 CompA 并注册实例
    const vnodeA = createChildVNode('CompA')
    renderKeepAliveWithSlot(kaInstance, vnodeA)
    const entryA = kaInstance.state.cache.get('CompA')
    if (entryA) entryA.component = compA

    // 切换到 CompB
    const vnodeB = createChildVNode('CompB')
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    expect(deactivatedCalled).toBe(true)
    expect(kaInstance.state.activeKey).toBe('CompB')
  })

  it('切回组件时应触发 activated', () => {
    const kaInstance = createKeepAliveInstance()
    const compA = createMockComponentInstance('CompA')

    // 注册 activated 钩子
    let activatedCalled = false
    compA['activated'] = [() => { activatedCalled = true }]

    // 渲染 CompA
    const vnodeA = createChildVNode('CompA')
    renderKeepAliveWithSlot(kaInstance, vnodeA)
    const entryA = kaInstance.state.cache.get('CompA')
    if (entryA) entryA.component = compA

    // 切换到 CompB
    const vnodeB = createChildVNode('CompB')
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    // 切回 CompA
    activatedCalled = false
    renderKeepAliveWithSlot(kaInstance, vnodeA)

    expect(activatedCalled).toBe(true)
    expect(kaInstance.state.activeKey).toBe('CompA')
  })

  it('组件状态在切换后应保持', () => {
    const kaInstance = createKeepAliveInstance()
    const compA = createMockComponentInstance('CompA', { count: 5 })

    // 渲染 CompA 并注册实例
    const vnodeA = createChildVNode('CompA')
    renderKeepAliveWithSlot(kaInstance, vnodeA)
    const entryA = kaInstance.state.cache.get('CompA')
    if (entryA) entryA.component = compA

    // 修改状态
    compA.state.count = 42

    // 切换到 CompB（触发 deactivate，保存状态）
    const vnodeB = createChildVNode('CompB')
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    // 切回 CompA（触发 activate，恢复状态）
    renderKeepAliveWithSlot(kaInstance, vnodeA)

    // 状态应该被恢复
    expect(compA.state.count).toBe(42)
  })
})

describe('KeepAlive include 配置', () => {
  it('include 为字符串时应只缓存匹配的组件', () => {
    const kaInstance = createKeepAliveInstance({ include: 'CompA' })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    expect(kaInstance.state.cache.has('CompB')).toBe(false)
  })

  it('include 为正则时应匹配正则规则', () => {
    const kaInstance = createKeepAliveInstance({ include: /^Comp/ })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('Other')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    expect(kaInstance.state.cache.has('Other')).toBe(false)
  })

  it('include 为数组时应匹配任意一项', () => {
    const kaInstance = createKeepAliveInstance({ include: ['CompA', 'CompB'] })

    const vnodeA = createChildVNode('CompA')
    const vnodeC = createChildVNode('CompC')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeC)

    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    expect(kaInstance.state.cache.has('CompC')).toBe(false)
  })
})

describe('KeepAlive exclude 配置', () => {
  it('exclude 为字符串时应排除匹配的组件', () => {
    const kaInstance = createKeepAliveInstance({ exclude: 'Login' })

    const vnodeHome = createChildVNode('Home')
    const vnodeLogin = createChildVNode('Login')

    renderKeepAliveWithSlot(kaInstance, vnodeHome)
    renderKeepAliveWithSlot(kaInstance, vnodeLogin)

    expect(kaInstance.state.cache.has('Home')).toBe(true)
    expect(kaInstance.state.cache.has('Login')).toBe(false)
  })

  it('exclude 优先于 include', () => {
    const kaInstance = createKeepAliveInstance({
      include: ['CompA', 'CompB'],
      exclude: 'CompB',
    })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    // exclude 优先，CompB 即使在 include 中也不缓存
    expect(kaInstance.state.cache.has('CompB')).toBe(false)
  })
})

describe('KeepAlive max 配置（LRU 淘汰）', () => {
  it('超过 max 时应淘汰最旧的缓存', () => {
    const kaInstance = createKeepAliveInstance({ max: 2 })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')
    const vnodeC = createChildVNode('CompC')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)
    expect(kaInstance.state.cache.size).toBe(2)

    // 添加第三个组件，应淘汰 CompA（最久未访问）
    renderKeepAliveWithSlot(kaInstance, vnodeC)
    expect(kaInstance.state.cache.size).toBe(2)
    expect(kaInstance.state.cache.has('CompA')).toBe(false)
    expect(kaInstance.state.cache.has('CompB')).toBe(true)
    expect(kaInstance.state.cache.has('CompC')).toBe(true)
  })

  it('访问缓存组件应更新 LRU 顺序', () => {
    const kaInstance = createKeepAliveInstance({ max: 2 })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')
    const vnodeC = createChildVNode('CompC')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    // 重新访问 CompA，使其成为最近访问
    renderKeepAliveWithSlot(kaInstance, vnodeA)

    // 添加 CompC，应淘汰 CompB（现在是最久未访问的）
    renderKeepAliveWithSlot(kaInstance, vnodeC)
    expect(kaInstance.state.cache.size).toBe(2)
    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    expect(kaInstance.state.cache.has('CompB')).toBe(false)
    expect(kaInstance.state.cache.has('CompC')).toBe(true)
  })
})

describe('KeepAlive activated/deactivated 生命周期', () => {
  it('activated 应按注册顺序调用', () => {
    const kaInstance = createKeepAliveInstance()
    const comp = createMockComponentInstance('TestComp')

    const order: number[] = []
    comp['activated'] = [
      () => { order.push(1) },
      () => { order.push(2) },
      () => { order.push(3) },
    ]

    const vnode = createChildVNode('TestComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('TestComp')
    if (entry) entry.component = comp

    // 切走再切回
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))
    renderKeepAliveWithSlot(kaInstance, vnode)

    expect(order).toEqual([1, 2, 3])
  })

  it('deactivated 应在组件被缓存时调用', () => {
    const kaInstance = createKeepAliveInstance()
    const comp = createMockComponentInstance('TestComp')

    let deactivatedCount = 0
    comp['deactivated'] = [
      () => { deactivatedCount++ },
    ]

    const vnode = createChildVNode('TestComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('TestComp')
    if (entry) entry.component = comp

    // 切走
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))
    expect(deactivatedCount).toBe(1)

    // 再切走一次（到另一个组件）
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Another'))
    // deactivated 不应再被调用（因为已经不在活跃状态）
    expect(deactivatedCount).toBe(1)
  })

  it('onActivated / onDeactivated 方法应被调用', () => {
    const kaInstance = createKeepAliveInstance()
    const comp = createMockComponentInstance('TestComp')

    let onActivatedCalled = false
    let onDeactivatedCalled = false
    ;(comp.renderProxy as any).onActivated = () => { onActivatedCalled = true }
    ;(comp.renderProxy as any).onDeactivated = () => { onDeactivatedCalled = true }

    const vnode = createChildVNode('TestComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('TestComp')
    if (entry) entry.component = comp

    // 切走
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))
    expect(onDeactivatedCalled).toBe(true)

    // 切回
    renderKeepAliveWithSlot(kaInstance, vnode)
    expect(onActivatedCalled).toBe(true)
  })
})

describe('KeepAlive 嵌套组件状态保持', () => {
  it('嵌套组件的内部状态在缓存恢复后应保持', () => {
    const kaInstance = createKeepAliveInstance()

    // 创建一个有嵌套状态的组件
    const comp = createMockComponentInstance('ParentComp', {
      user: { name: 'Alice', age: 30 },
      items: [1, 2, 3],
    })

    // 渲染并注册
    const vnode = createChildVNode('ParentComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('ParentComp')
    if (entry) entry.component = comp

    // 修改嵌套状态
    comp.state.user.name = 'Bob'
    comp.state.user.age = 25
    comp.state.items.push(4)

    // 切走
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))

    // 切回
    renderKeepAliveWithSlot(kaInstance, vnode)

    // 嵌套状态应保持
    expect(comp.state.user.name).toBe('Bob')
    expect(comp.state.user.age).toBe(25)
    expect(comp.state.items).toEqual([1, 2, 3, 4])
  })

  it('计算属性状态在缓存恢复后应保持', () => {
    const kaInstance = createKeepAliveInstance()

    const comp = defineComponent({
      name: 'ComputedComp',
      state() {
        return { count: 3 }
      },
      computed: {
        double() {
          return this.$state.count * 2
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    // 渲染并注册
    const vnode = createChildVNode('ComputedComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('ComputedComp')
    if (entry) entry.component = instance

    // 修改状态并重新计算（@lytjs/reactivity 的 computed 自动追踪依赖）
    instance.state.count = 7
    const doubleValue = (instance.renderProxy as any).double
    expect(doubleValue).toBe(14)

    // 切走
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))

    // 切回
    renderKeepAliveWithSlot(kaInstance, vnode)

    // 计算属性缓存应保持（@lytjs/reactivity 的 computed 自动缓存）
    expect((instance.renderProxy as any).double).toBe(14)
    expect(instance.state.count).toBe(7)
  })
})

describe('KeepAlive 多个缓存组件', () => {
  it('应能同时缓存多个组件', () => {
    const kaInstance = createKeepAliveInstance()

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')
    const vnodeC = createChildVNode('CompC')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)
    renderKeepAliveWithSlot(kaInstance, vnodeC)

    expect(kaInstance.state.cache.size).toBe(3)
    expect(kaInstance.state.cache.has('CompA')).toBe(true)
    expect(kaInstance.state.cache.has('CompB')).toBe(true)
    expect(kaInstance.state.cache.has('CompC')).toBe(true)
  })

  it('多个组件间切换时各自状态独立保持', () => {
    const kaInstance = createKeepAliveInstance()

    const compA = createMockComponentInstance('CompA', { value: 'A' })
    const compB = createMockComponentInstance('CompB', { value: 'B' })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')

    // 渲染 A
    renderKeepAliveWithSlot(kaInstance, vnodeA)
    const entryA = kaInstance.state.cache.get('CompA')
    if (entryA) entryA.component = compA

    // 修改 A 的状态
    compA.state.value = 'A-modified'

    // 切换到 B（A 的状态在此时被保存）
    renderKeepAliveWithSlot(kaInstance, vnodeB)
    const entryB = kaInstance.state.cache.get('CompB')
    if (entryB) entryB.component = compB

    // 修改 B 的状态
    compB.state.value = 'B-modified'

    // 切回 A（B 的状态在此时被保存，A 的状态被恢复）
    renderKeepAliveWithSlot(kaInstance, vnodeA)

    // A 的状态应恢复为修改后的值
    expect(compA.state.value).toBe('A-modified')

    // 切回 B（A 的状态被保存，B 的状态被恢复）
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    // B 的状态应恢复为修改后的值
    expect(compB.state.value).toBe('B-modified')
  })
})

describe('KeepAlive 工具函数', () => {
  it('pruneCacheEntry 应正确移除缓存条目', () => {
    const kaInstance = createKeepAliveInstance()
    const vnode = createChildVNode('TestComp')
    renderKeepAliveWithSlot(kaInstance, vnode)

    expect(kaInstance.state.cache.size).toBe(1)

    pruneCacheEntry(kaInstance.state.cache, 'TestComp')

    expect(kaInstance.state.cache.size).toBe(0)
  })

  it('pruneCacheEntry 对不存在的 key 应安全处理', () => {
    const kaInstance = createKeepAliveInstance()
    expect(() => {
      pruneCacheEntry(kaInstance.state.cache, 'nonexistent')
    }).not.toThrow()
    expect(kaInstance.state.cache.size).toBe(0)
  })

  it('pruneCache 应根据 include/exclude 清理缓存', () => {
    const kaInstance = createKeepAliveInstance()

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')
    const vnodeC = createChildVNode('CompC')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)
    renderKeepAliveWithSlot(kaInstance, vnodeC)

    expect(kaInstance.state.cache.size).toBe(3)

    // 只保留 CompA
    pruneCache(kaInstance.state.cache, { include: 'CompA' })

    expect(kaInstance.state.cache.size).toBe(1)
    expect(kaInstance.state.cache.has('CompA')).toBe(true)
  })

  it('registerKeepAliveInstance 应正确注册组件实例', () => {
    const kaInstance = createKeepAliveInstance()
    const vnode = createChildVNode('TestComp')
    renderKeepAliveWithSlot(kaInstance, vnode)

    // 关联缓存引用
    attachCacheRef(vnode, kaInstance.state.cache)

    const comp = createMockComponentInstance('TestComp')
    registerKeepAliveInstance(vnode, comp)

    const entry = kaInstance.state.cache.get('TestComp')
    expect(entry).toBeDefined()
    expect(entry!.component).toBe(comp)
  })

  it('registerKeepAliveInstance 对无 __keepalive 标记的 vnode 应安全处理', () => {
    const comp = createMockComponentInstance('TestComp')
    const vnode = { type: {} }

    expect(() => {
      registerKeepAliveInstance(vnode, comp)
    }).not.toThrow()
  })
})

describe('KeepAlive 边界情况', () => {
  it('无子组件时应返回 null', () => {
    const kaInstance = createKeepAliveInstance()
    kaInstance.slots = { default: () => null }

    const result = (kaInstance.type as any).render(null, kaInstance)
    expect(result).toBe(null)
  })

  it('子组件为非对象时应返回 null', () => {
    const kaInstance = createKeepAliveInstance()
    kaInstance.slots = { default: () => 'text' }

    const result = (kaInstance.type as any).render(null, kaInstance)
    expect(result).toBe(null)
  })

  it('使用组件 key 作为缓存 key', () => {
    const kaInstance = createKeepAliveInstance()
    const vnode = createChildVNode('CompA', 'my-custom-key')

    renderKeepAliveWithSlot(kaInstance, vnode)

    expect(kaInstance.state.cache.has('my-custom-key')).toBe(true)
    expect(kaInstance.state.activeKey).toBe('my-custom-key')
  })

  it('max 为 1 时只保留最近一个组件', () => {
    const kaInstance = createKeepAliveInstance({ max: 1 })

    const vnodeA = createChildVNode('CompA')
    const vnodeB = createChildVNode('CompB')

    renderKeepAliveWithSlot(kaInstance, vnodeA)
    renderKeepAliveWithSlot(kaInstance, vnodeB)

    expect(kaInstance.state.cache.size).toBe(1)
    expect(kaInstance.state.cache.has('CompB')).toBe(true)
    expect(kaInstance.state.cache.has('CompA')).toBe(false)
  })

  it('侦听器状态在缓存恢复后应保持', () => {
    const kaInstance = createKeepAliveInstance()

    const comp = defineComponent({
      name: 'WatchComp',
      state() {
        return { data: 'initial' }
      },
      watch: {
        data: {
          handler() { /* watcher */ },
          immediate: false,
          deep: false,
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    // 渲染并注册
    const vnode = createChildVNode('WatchComp')
    renderKeepAliveWithSlot(kaInstance, vnode)
    const entry = kaInstance.state.cache.get('WatchComp')
    if (entry) entry.component = instance

    expect(instance.watchStopHandles.length).toBe(1)

    // 切走
    renderKeepAliveWithSlot(kaInstance, createChildVNode('Other'))

    // 切回
    renderKeepAliveWithSlot(kaInstance, vnode)

    // 侦听器应保持
    expect(instance.watchStopHandles.length).toBe(1)
  })
})
