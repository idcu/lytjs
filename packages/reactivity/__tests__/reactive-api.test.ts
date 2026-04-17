/**
 * Lyt.js 响应式系统 — reactive API 补全测试
 *
 * 测试覆盖：
 *   - 数组变异方法（push/pop/shift/unshift/splice）触发更新
 *   - 数组搜索方法（includes/indexOf/lastIndexOf）追踪依赖
 *   - shallowReactive 仅第一层响应式
 *   - toRaw 获取原始对象
 *   - isReactive 判断
 *   - triggerRef 手动触发
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  reactive,
  effect,
  stop,
  shallowReactive,
  toRaw,
  isReactive,
  shallowRef,
  triggerRef,
} from '../src/index'

// ================================================================
//  数组变异方法触发更新
// ================================================================

describe('数组变异方法', () => {
  it('push 触发更新', () => {
    const arr = reactive<number[]>([1, 2, 3])
    let count = 0
    const runner = effect(() => {
      count = arr.length
    })
    expect(count).toBe(3)

    arr.push(4)
    expect(count).toBe(4)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('pop 触发更新', () => {
    const arr = reactive<number[]>([1, 2, 3])
    let count = 0
    const runner = effect(() => {
      count = arr.length
    })
    expect(count).toBe(3)

    arr.pop()
    expect(count).toBe(2)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('shift 触发更新', () => {
    const arr = reactive<number[]>([1, 2, 3])
    let first = 0
    const runner = effect(() => {
      first = arr[0]
    })
    expect(first).toBe(1)

    arr.shift()
    expect(first).toBe(2)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('unshift 触发更新', () => {
    const arr = reactive<number[]>([2, 3])
    let first = 0
    const runner = effect(() => {
      first = arr[0]
    })
    expect(first).toBe(2)

    arr.unshift(1)
    expect(first).toBe(1)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('splice 触发更新', () => {
    const arr = reactive<number[]>([1, 2, 3, 4, 5])
    let length = 0
    const runner = effect(() => {
      length = arr.length
    })
    expect(length).toBe(5)

    arr.splice(1, 2)
    expect(length).toBe(3)
    expect(arr[0]).toBe(1)
    expect(arr[1]).toBe(4)
    expect(arr[2]).toBe(5)

    if ((runner as any).stop) (runner as any).stop()
  })
})

// ================================================================
//  数组搜索方法追踪依赖
// ================================================================

describe('数组搜索方法', () => {
  it('includes 追踪依赖', () => {
    const obj = { value: 'a' }
    const arr = reactive([1, 2, obj])
    let found = false

    const runner = effect(() => {
      found = arr.includes(obj)
    })
    expect(found).toBe(true)

    // 替换元素后，includes 应该重新计算
    arr[2] = { value: 'b' }
    expect(found).toBe(false)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('indexOf 追踪依赖', () => {
    const obj = { value: 'a' }
    const arr = reactive([1, obj, 3])
    let idx = -1

    const runner = effect(() => {
      idx = arr.indexOf(obj)
    })
    expect(idx).toBe(1)

    // 替换元素后，indexOf 应该重新计算
    arr[1] = 99
    expect(idx).toBe(-1)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('lastIndexOf 追踪依赖', () => {
    const obj = { value: 'a' }
    const arr = reactive([obj, 2, obj])
    let idx = -1

    const runner = effect(() => {
      idx = arr.lastIndexOf(obj)
    })
    expect(idx).toBe(2)

    // 替换最后一个元素后，lastIndexOf 应该重新计算
    arr[2] = 99
    expect(idx).toBe(0)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('includes 对基本类型追踪依赖', () => {
    const arr = reactive([1, 2, 3])
    let found = false

    const runner = effect(() => {
      found = arr.includes(2)
    })
    expect(found).toBe(true)

    // 修改元素值后，includes 应该重新计算
    arr[1] = 99
    expect(found).toBe(false)

    if ((runner as any).stop) (runner as any).stop()
  })
})

// ================================================================
//  shallowReactive
// ================================================================

describe('shallowReactive', () => {
  it('仅第一层响应式', () => {
    const state = shallowReactive({
      count: 0,
      nested: { value: 'hello' },
    })

    // 第一层是响应式的
    expect(isReactive(state)).toBe(true)

    // 嵌套对象不是响应式的
    expect(isReactive(state.nested)).toBe(false)

    // 第一层属性修改触发更新
    let effectCount = 0
    const runner = effect(() => {
      effectCount++
      void state.count
    })
    expect(effectCount).toBe(1)

    state.count = 1
    expect(effectCount).toBe(2)

    // 修改嵌套对象属性不会触发更新（浅层）
    effectCount = 0
    state.nested.value = 'world'
    expect(effectCount).toBe(0)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('替换嵌套对象触发更新', () => {
    const state = shallowReactive({
      nested: { value: 'hello' },
    })

    let nestedValue = ''
    const runner = effect(() => {
      nestedValue = state.nested.value
    })
    expect(nestedValue).toBe('hello')

    // 替换整个嵌套对象会触发更新（因为 effect 读取了 state.nested）
    state.nested = { value: 'new' }
    expect(nestedValue).toBe('new')

    if ((runner as any).stop) (runner as any).stop()
  })
})

// ================================================================
//  toRaw
// ================================================================

describe('toRaw', () => {
  it('获取原始对象', () => {
    const original = { count: 0, nested: { foo: 'bar' } }
    const state = reactive(original)

    const raw = toRaw(state)
    expect(raw).toBe(original)
    expect(raw).not.toBe(state)
  })

  it('多层代理也能获取原始对象', () => {
    const original = { a: { b: 1 } }
    const state = reactive(original)

    // state.a 也是一个代理
    expect(isReactive(state.a)).toBe(true)

    // toRaw 可以获取到原始的嵌套对象
    const rawA = toRaw(state.a)
    expect(rawA).toBe(original.a)
    expect(isReactive(rawA)).toBe(false)
  })

  it('非代理对象原样返回', () => {
    const plain = { count: 1 }
    expect(toRaw(plain)).toBe(plain)
    expect(toRaw(42)).toBe(42)
    expect(toRaw('hello')).toBe('hello')
    expect(toRaw(null)).toBe(null)
  })
})

// ================================================================
//  isReactive
// ================================================================

describe('isReactive', () => {
  it('判断响应式对象', () => {
    const state = reactive({ count: 0 })
    expect(isReactive(state)).toBe(true)
  })

  it('判断非响应式对象', () => {
    const plain = { count: 0 }
    expect(isReactive(plain)).toBe(false)
  })

  it('判断基本类型', () => {
    expect(isReactive(42)).toBe(false)
    expect(isReactive('hello')).toBe(false)
    expect(isReactive(null)).toBe(false)
    expect(isReactive(undefined)).toBe(false)
  })

  it('判断嵌套响应式对象', () => {
    const state = reactive({ nested: { count: 0 } })
    expect(isReactive(state.nested)).toBe(true)
  })
})

// ================================================================
//  triggerRef
// ================================================================

describe('triggerRef', () => {
  it('手动触发 shallowRef 更新', () => {
    const state = shallowRef({ count: 0 })
    let effectCount = 0

    const runner = effect(() => {
      effectCount++
      void state.value
    })
    expect(effectCount).toBe(1)

    // 修改内部属性不会触发更新
    state.value.count = 1
    expect(effectCount).toBe(1)

    // 手动触发
    triggerRef(state)
    expect(effectCount).toBe(2)

    if ((runner as any).stop) (runner as any).stop()
  })

  it('triggerRef 后 effect 能读取最新值', () => {
    const state = shallowRef({ count: 0 })
    let latestCount = -1

    const runner = effect(() => {
      latestCount = state.value.count
    })
    expect(latestCount).toBe(0)

    // 修改内部属性
    state.value.count = 42
    // effect 还没重新执行
    expect(latestCount).toBe(0)

    // 手动触发
    triggerRef(state)
    // effect 重新执行，读取到最新值
    expect(latestCount).toBe(42)

    if ((runner as any).stop) (runner as any).stop()
  })
})
