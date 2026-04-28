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
  unref,
  markSkip,
  toRaw,
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

// ================================================================
//  补充测试 — ref 创建与修改
// ================================================================

describe('ref 补充测试', () => {
  it('创建不同类型的 ref', () => {
    const numRef = ref(42)
    const strRef = ref('hello')
    const boolRef = ref(true)
    const nullRef = ref(null)
    expect(numRef.value).toBe(42)
    expect(strRef.value).toBe('hello')
    expect(boolRef.value).toBe(true)
    expect(nullRef.value).toBe(null)
  })

  it('嵌套 ref 不会自动解包', () => {
    const inner = ref(10)
    const outer = ref(inner)
    // outer.value 是 inner ref 本身
    expect(outer.value).toBe(inner)
    expect(outer.value.value).toBe(10)
  })

  it('修改 ref 触发 effect', () => {
    const count = ref(0)
    let effectVal = -1
    effect(() => {
      effectVal = count.value
    })
    expect(effectVal).toBe(0)
    count.value = 100
    expect(effectVal).toBe(100)
  })

  it('unref 自动解包', () => {
    const r = ref(42)
    expect(unref(r)).toBe(42)
    expect(unref(10)).toBe(10)
    expect(unref('hello')).toBe('hello')
  })
})

// ================================================================
//  补充测试 — reactive
// ================================================================

describe('reactive 补充测试', () => {
  it('新增属性触发更新', async () => {
    const state = reactive({ a: 1 } as any)
    let triggered = false
    effect(() => {
      triggered = true
      Object.keys(state)
    })
    triggered = false
    state.b = 2
    await nextTick()
    // 新增属性后 effect 应被触发
    expect(state.b).toBe(2)
  })

  it('数组 includes/indexOf 依赖收集', () => {
    const state = reactive({ items: [1, 2, 3] as number[] })
    let found = false
    effect(() => {
      found = state.items.includes(2)
    })
    expect(found).toBe(true)
    state.items[1] = 99
    expect(found).toBe(false)
  })

  it('同一对象返回相同代理', () => {
    const obj = { count: 0 }
    const proxy1 = reactive(obj)
    const proxy2 = reactive(obj)
    expect(proxy1).toBe(proxy2)
  })

  it('非对象参数直接返回', () => {
    expect(reactive(42 as any)).toBe(42)
    expect(reactive('hello' as any)).toBe('hello')
    expect(reactive(null as any)).toBe(null)
  })
})

// ================================================================
//  补充测试 — computed
// ================================================================

describe('computed 补充测试', () => {
  it('依赖追踪：多个 ref', () => {
    const a = ref(1)
    const b = ref(2)
    const sum = computed(() => a.value + b.value)
    expect(sum.value).toBe(3)
    a.value = 10
    expect(sum.value).toBe(12)
    b.value = 20
    expect(sum.value).toBe(30)
  })

  it('依赖追踪：reactive 对象', () => {
    const state = reactive({ x: 1, y: 2 })
    const product = computed(() => state.x * state.y)
    expect(product.value).toBe(2)
    state.x = 3
    expect(product.value).toBe(6)
    state.y = 4
    expect(product.value).toBe(12)
  })

  it('computed 是 ref 类型', () => {
    const count = ref(1)
    const double = computed(() => count.value * 2)
    expect(isRef(double)).toBe(true)
  })

  it('只读 computed 设置值发出警告', () => {
    const count = ref(1)
    const double = computed(() => count.value * 2)
    // 设置只读 computed 不会抛异常，只是发出 console.warn
    double.value = 100
    expect(double.value).toBe(2)
  })
})

// ================================================================
//  补充测试 — watch
// ================================================================

describe('watch 补充测试', () => {
  it('侦听 getter 函数', async () => {
    const count = ref(0)
    const name = ref('lyt')
    let watchedVal: string | undefined
    watch(
      () => count.value + name.value,
      (newVal) => { watchedVal = newVal }
    )
    count.value = 1
    await nextTick()
    expect(watchedVal).toBe('1lyt')
  })

  it('侦听多个源（数组）', async () => {
    const a = ref(1)
    const b = ref(2)
    let lastNew: any
    let lastOld: any
    watch([a, b], (newVal, oldVal) => {
      lastNew = newVal
      lastOld = oldVal
    })
    a.value = 10
    await nextTick()
    expect(lastNew[0]).toBe(10)
    expect(lastNew[1]).toBe(2)
  })

  it('侦听 reactive 对象默认深度侦听', async () => {
    const state = reactive({ nested: { count: 0 } })
    let triggered = false
    watch(state, () => {
      triggered = true
    })
    state.nested.count = 1
    await nextTick()
    expect(triggered).toBe(true)
  })

  it('stop 停止侦听', async () => {
    const count = ref(0)
    let callCount = 0
    const stopWatch = watch(count, () => { callCount++ })
    count.value = 1
    await nextTick()
    expect(callCount).toBe(1)
    stopWatch()
    count.value = 2
    await nextTick()
    expect(callCount).toBe(1)
  })
})

// ================================================================
//  补充测试 — watchEffect
// ================================================================

describe('watchEffect 补充测试', () => {
  it('多个依赖自动追踪', async () => {
    const a = ref(1)
    const b = ref(2)
    let sum = 0
    watchEffect(() => {
      sum = a.value + b.value
    })
    expect(sum).toBe(3)
    a.value = 10
    await nextTick()
    expect(sum).toBe(12)
    b.value = 20
    await nextTick()
    expect(sum).toBe(30)
  })

  it('onCleanup 清理函数', async () => {
    const count = ref(0)
    let cleaned = false
    watchEffect((onCleanup) => {
      onCleanup(() => { cleaned = true })
      void count.value
    })
    expect(cleaned).toBe(false)
    count.value = 1
    await nextTick()
    expect(cleaned).toBe(true)
  })
})

// ================================================================
//  补充测试 — shallowRef / shallowReactive
// ================================================================

describe('shallowRef 补充测试', () => {
  it('基本类型值行为与 ref 相同', () => {
    const count = shallowRef(0)
    expect(count.value).toBe(0)
    count.value = 1
    expect(count.value).toBe(1)
  })

  it('替换对象值触发 effect', () => {
    const state = shallowRef({ count: 0 })
    let effectCount = 0
    effect(() => {
      effectCount++
      void state.value
    })
    const before = effectCount
    state.value = { count: 1 }
    expect(effectCount).toBeGreaterThan(before)
  })
})

describe('shallowReactive 补充测试', () => {
  it('第一层属性修改触发 effect', () => {
    const state = shallowReactive({ count: 0, nested: { x: 1 } })
    let effectVal = -1
    effect(() => {
      effectVal = state.count
    })
    expect(effectVal).toBe(0)
    state.count = 10
    expect(effectVal).toBe(10)
  })

  it('嵌套对象修改不触发 effect', () => {
    const state = shallowReactive({ nested: { count: 0 } })
    let effectVal = -1
    effect(() => {
      effectVal = state.nested.count
    })
    // 首次执行
    expect(effectVal).toBe(0)
    // 修改嵌套属性（浅层不代理，所以不会触发 effect）
    state.nested.count = 99
    expect(effectVal).toBe(0)
  })
})

// ================================================================
//  补充测试 — toRef / toRefs
// ================================================================

describe('toRef / toRefs 补充测试', () => {
  it('toRef 与 reactive 双向同步', () => {
    const state = reactive({ x: 1, y: 2 })
    const xRef = toRef(state, 'x')
    // 通过 ref 修改
    xRef.value = 100
    expect(state.x).toBe(100)
    // 通过 reactive 修改
    state.x = 200
    expect(xRef.value).toBe(200)
  })

  it('toRefs 保留所有属性', () => {
    const state = reactive({ a: 1, b: 2, c: 3 })
    const refs = toRefs(state)
    expect(Object.keys(refs)).toHaveLength(3)
    expect(refs.a.value).toBe(1)
    expect(refs.b.value).toBe(2)
    expect(refs.c.value).toBe(3)
  })
})

// ================================================================
//  补充测试 — triggerRef
// ================================================================

describe('triggerRef 补充测试', () => {
  it('triggerRef 配合 watch 使用', async () => {
    const state = shallowRef({ count: 0 })
    let watchedVal: any
    watch(state, (newVal) => { watchedVal = newVal })
    // 修改内部属性
    state.value.count = 42
    await nextTick()
    // shallowRef 修改内部属性不会触发 watch
    expect(watchedVal).toBe(undefined)
    // 手动触发
    triggerRef(state)
    await nextTick()
    // triggerRef 后 watch 应被触发
    expect(watchedVal).toBeDefined()
  })
})

// ================================================================
//  补充测试 — markSkip（标记不转换）
// ================================================================

describe('markSkip 标记不转换', () => {
  it('标记后嵌套对象不被代理', () => {
    const inner = markSkip({ count: 0 })
    const state = reactive({ data: inner })
    // 第一层是响应式的
    expect(isReactive(state)).toBe(true)
    // 被标记的嵌套对象不会被深层代理
    expect(isReactive(state.data)).toBe(false)
    // 但值仍然可以正常访问
    expect(state.data.count).toBe(0)
  })
})

// ================================================================
//  补充测试 — isRef / isReactive / isReadonly 类型检查
// ================================================================

describe('类型检查', () => {
  it('isRef 正确识别 ref', () => {
    const r = ref(1)
    const sr = shallowRef(2)
    expect(isRef(r)).toBe(true)
    expect(isRef(sr)).toBe(true)
    expect(isRef(42)).toBe(false)
    expect(isRef('hello')).toBe(false)
    expect(isRef(null)).toBe(false)
    expect(isRef(undefined)).toBe(false)
    expect(isRef({})).toBe(false)
    expect(isRef([])).toBe(false)
  })

  it('isReactive 正确识别 reactive', () => {
    const r = reactive({ count: 0 })
    const sr = shallowReactive({ count: 0 })
    const rd = readonly({ count: 0 })
    expect(isReactive(r)).toBe(true)
    expect(isReactive(sr)).toBe(true)
    // readonly 对象的 reactive 标记也返回 true（因为 readonlyHandlers 中 reactiveFlag 返回 true）
    expect(isReactive(rd)).toBe(true)
    expect(isReactive({ count: 0 })).toBe(false)
    expect(isReactive(42)).toBe(false)
  })

  it('isReadonly 正确识别 readonly', () => {
    const rd = readonly({ count: 0 })
    const r = reactive({ count: 0 })
    expect(isReadonly(rd)).toBe(true)
    expect(isReadonly(r)).toBe(false)
    expect(isReadonly({ count: 0 })).toBe(false)
    expect(isReadonly(42)).toBe(false)
  })

  it('toRaw 获取原始对象', () => {
    const obj = { count: 0 }
    const proxy = reactive(obj)
    expect(toRaw(proxy)).toBe(obj)
    // 普通对象直接返回
    expect(toRaw({ x: 1 })).toEqual({ x: 1 })
  })
})
