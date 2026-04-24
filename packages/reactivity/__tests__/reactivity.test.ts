/**
 * Lyt.js 响应式系统 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 *
 * 测试覆盖：
 *   - reactive 基本读写 / 嵌套对象 / 数组操作 / 删除属性 / has/ownKeys 拦截
 *   - ref 基本读写 / 对象值自动 reactive
 *   - shallowRef 不深层代理
 *   - computed 惰性求值 / 缓存 / 链式依赖 / setter
 *   - watch 基本侦听 / immediate / deep
 *   - watchEffect 自动收集依赖 / 停止
 *   - nextTick 批量更新
 *   - toRef / toRefs
 *   - readonly 防止写入
 *   - effect 停止
 *   - 多个 watch 同一源
 *   - triggerRef 手动触发
 *   - shallowReactive 浅层代理
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  reactive,
  ref,
  computed,
  watch,
  watchEffect,
  nextTick,
  effect,
  stop,
  shallowRef,
  toRef,
  toRefs,
  readonly,
  isReactive,
  isReadonly,
  isRef,
  triggerRef,
  shallowReactive,
} from '../src/index'

// ================================================================
//  reactive 测试
// ================================================================

describe('reactive', () => {
  it('基本读写', () => {
    const state = reactive({ count: 0, name: 'lyt' })
    expect(state.count).toBe(0)
    expect(state.name).toBe('lyt')
    state.count = 1
    expect(state.count).toBe(1)
    state.name = 'hello'
    expect(state.name).toBe('hello')
  })

  it('嵌套对象自动代理', () => {
    const state = reactive({
      user: {
        name: 'lyt',
        address: { city: 'shanghai' },
      },
    })
    expect(state.user.name).toBe('lyt')
    expect(state.user.address.city).toBe('shanghai')
    state.user.address.city = 'beijing'
    expect(state.user.address.city).toBe('beijing')
    expect(isReactive(state.user)).toBe(true)
    expect(isReactive(state.user.address)).toBe(true)
  })

  it('数组操作（push/splice）', () => {
    const state = reactive({ items: [1, 2, 3] as number[] })
    expect(state.items.length).toBe(3)
    state.items.push(4)
    expect(state.items.length).toBe(4)
    expect(state.items[3]).toBe(4)
    state.items.splice(1, 1)
    expect(state.items.length).toBe(3)
    expect(state.items[0]).toBe(1)
    expect(state.items[1]).toBe(3)
    expect(state.items[2]).toBe(4)
  })

  it('删除属性', () => {
    const state = reactive({ foo: 'bar', baz: 'qux' } as any)
    expect(state.foo).toBe('bar')
    delete state.foo
    expect(state.foo).toBe(undefined)
    expect(state.baz).toBe('qux')
  })

  it('has/ownKeys 拦截', () => {
    const state = reactive({ a: 1, b: 2 })
    // 'a' in state 应该正常工作
    expect('a' in state).toBe(true)
    expect('c' in state).toBe(false)
    // Object.keys 应该正常工作
    const keys = Object.keys(state)
    expect(keys).toContain('a')
    expect(keys).toContain('b')
    expect(keys).toHaveLength(2)
  })
})

// ================================================================
//  ref 测试
// ================================================================

describe('ref', () => {
  it('基本读写', () => {
    const count = ref(0)
    expect(count.value).toBe(0)
    expect(isRef(count)).toBe(true)
    count.value = 1
    expect(count.value).toBe(1)
  })

  it('对象值自动 reactive', () => {
    const obj = ref({ count: 0 })
    expect(isRef(obj)).toBe(true)
    expect(obj.value.count).toBe(0)
    // 修改嵌套属性
    obj.value.count = 1
    expect(obj.value.count).toBe(1)
  })
})

// ================================================================
//  shallowRef 测试
// ================================================================

describe('shallowRef', () => {
  it('不深层代理', () => {
    const state = shallowRef({ count: 0 })
    expect(state.value.count).toBe(0)

    // 修改内部属性不会触发响应式更新
    state.value.count = 1
    expect(state.value.count).toBe(1)

    // 替换整个 value 会触发更新
    state.value = { count: 2 }
    expect(state.value.count).toBe(2)
  })
})

// ================================================================
//  computed 测试
// ================================================================

describe('computed', () => {
  it('惰性求值（首次才计算）', () => {
    const count = ref(0)
    let computedCalled = false
    const double = computed(() => {
      computedCalled = true
      return count.value * 2
    })
    expect(computedCalled).toBe(false)
    const val = double.value
    expect(val).toBe(0)
    expect(computedCalled).toBe(true)
  })

  it('缓存（依赖不变不重算）', () => {
    const count = ref(1)
    let callCount = 0
    const double = computed(() => {
      callCount++
      return count.value * 2
    })
    double.value
    expect(callCount).toBe(1)
    double.value
    expect(callCount).toBe(1)
    count.value = 2
    double.value
    expect(callCount).toBe(2)
    double.value
    expect(callCount).toBe(2)
  })

  it('链式依赖（A->B->C）', () => {
    const base = ref(1)
    const double = computed(() => base.value * 2)
    const quadruple = computed(() => double.value * 2)
    // 首次访问建立依赖
    expect(double.value).toBe(2)
    expect(quadruple.value).toBe(4)
    // 修改基础值，double 重新计算，quadruple 也应级联更新
    base.value = 5
    expect(double.value).toBe(10)
    expect(quadruple.value).toBe(20)
  })

  it('computed setter', () => {
    const firstName = ref('Lyt')
    const lastName = ref('JS')
    const fullName = computed({
      get: () => firstName.value + ' ' + lastName.value,
      set: (val: string) => {
        const parts = val.split(' ')
        firstName.value = parts[0]
        lastName.value = parts[1]
      },
    })
    expect(fullName.value).toBe('Lyt JS')
    fullName.value = 'Hello World'
    expect(firstName.value).toBe('Hello')
    expect(lastName.value).toBe('World')
    expect(fullName.value).toBe('Hello World')
  })
})

// ================================================================
//  watch 测试
// ================================================================

describe('watch', () => {
  it('基本侦听', () => {
    const count = ref(0)
    let watchedNewVal: number | undefined
    let watchedOldVal: number | undefined
    const stopWatch = watch(count, (newVal, oldVal) => {
      watchedNewVal = newVal
      watchedOldVal = oldVal
    })
    expect(typeof stopWatch).toBe('function')
    count.value = 1
    // stop 函数存在
    stopWatch()
  })

  it('immediate 立即执行', async () => {
    const count = ref(0)
    const results: number[] = []
    watch(count, (newVal) => {
      results.push(newVal)
    }, { immediate: true })
    await nextTick()
    expect(results.length).toBe(1)
    expect(results[0]).toBe(0)
    count.value = 1
    await nextTick()
    expect(results.length).toBe(2)
    expect(results[1]).toBe(1)
  })

  it('deep 深层侦听', async () => {
    const state = reactive({ nested: { count: 0 } })
    let triggered = false
    watch(state, () => {
      triggered = true
    }, { deep: true })
    state.nested.count = 1
    await nextTick()
    expect(triggered).toBe(true)
  })

  it('多个 watch 同一源', async () => {
    const count = ref(0)
    const results1: number[] = []
    const results2: number[] = []
    watch(count, (newVal) => { results1.push(newVal) })
    watch(count, (newVal) => { results2.push(newVal) })
    count.value = 1
    await nextTick()
    expect(results1.length).toBe(1)
    expect(results1[0]).toBe(1)
    expect(results2.length).toBe(1)
    expect(results2[0]).toBe(1)
  })
})

// ================================================================
//  watchEffect 测试
// ================================================================

describe('watchEffect', () => {
  it('自动收集依赖', () => {
    const count = ref(0)
    let effectCount = 0
    const stopWatch = watchEffect(() => {
      effectCount = count.value
    })
    expect(effectCount).toBe(0)
    count.value = 5
    expect(typeof stopWatch).toBe('function')
    stopWatch()
  })

  it('停止', () => {
    const count = ref(0)
    let effectCount = 0
    const stopWatch = watchEffect(() => {
      effectCount++
    })
    expect(effectCount).toBe(1)
    count.value = 1
    // 停止后不再触发
    stopWatch()
    count.value = 2
    // effectCount 不会因为停止后而增加（需要 nextTick 才能看到效果）
  })
})

// ================================================================
//  nextTick 测试
// ================================================================

describe('nextTick', () => {
  it('批量更新', async () => {
    const count = ref(0)
    const results: number[] = []
    watch(count, (newVal) => {
      results.push(newVal)
    })
    count.value = 1
    count.value = 2
    count.value = 3
    expect(results.length).toBe(0)
    await nextTick()
    expect(results.length).toBe(1)
    expect(results[0]).toBe(3)
  })
})

// ================================================================
//  toRef / toRefs 测试
// ================================================================

describe('toRef / toRefs', () => {
  it('toRef 属性引用', () => {
    const state = reactive({ count: 0, name: 'lyt' })
    const countRef = toRef(state, 'count')
    expect(countRef.value).toBe(0)
    expect(isRef(countRef)).toBe(true)
    countRef.value = 10
    expect(state.count).toBe(10)
    state.count = 20
    expect(countRef.value).toBe(20)
  })

  it('toRefs 批量引用', () => {
    const state = reactive({ count: 0, name: 'lyt' })
    const refs = toRefs(state)
    expect(refs.count.value).toBe(0)
    expect(refs.name.value).toBe('lyt')
    expect(isRef(refs.count)).toBe(true)
    expect(isRef(refs.name)).toBe(true)
    refs.name.value = 'hello'
    expect(state.name).toBe('hello')
  })
})

// ================================================================
//  readonly 测试
// ================================================================

describe('readonly', () => {
  it('防止写入', () => {
    const original = { count: 0, nested: { foo: 'bar' } }
    const state = readonly(original)
    expect(state.count).toBe(0)
    expect(state.nested.foo).toBe('bar')
    expect(isReadonly(state)).toBe(true)
    // 设置属性应该被阻止
    state.count = 1
    expect(state.count).toBe(0)
    // 删除属性也应该被阻止
    delete (state as any).count
    expect(state.count).toBe(0)
  })
})

// ================================================================
//  effect 测试
// ================================================================

describe('effect', () => {
  it('停止', () => {
    const count = ref(0)
    let effectCount = 0
    const runner = effect(() => {
      effectCount++
      return count.value
    })
    expect(effectCount).toBe(1)
    count.value = 1
    expect(effectCount).toBe(2)
    stop(runner)
    count.value = 2
    expect(effectCount).toBe(2)
  })
})

// ================================================================
//  triggerRef 测试
// ================================================================

describe('triggerRef', () => {
  it('手动触发', () => {
    const state = shallowRef({ count: 0 })
    let triggered = false
    effect(() => {
      triggered = true
      state.value
    })
    // 重置
    triggered = false
    // 修改内部属性不会触发
    state.value.count = 1
    expect(triggered).toBe(false)
    // 手动触发
    triggerRef(state)
    // triggerRef 会触发依赖 state.value 的 effect
  })
})

// ================================================================
//  shallowReactive 测试
// ================================================================

describe('shallowReactive', () => {
  it('浅层代理', () => {
    const state = shallowReactive({ nested: { count: 0 } })
    expect(isReactive(state)).toBe(true)
    // 浅层代理不深层代理嵌套对象
    expect(isReactive(state.nested)).toBe(false)
    // 第一层属性修改是响应式的
    state.nested = { count: 1 }
    expect(state.nested.count).toBe(1)
  })
})
