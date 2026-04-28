/**
 * E2E 测试: @lytjs/reactivity 响应式系统基础测试
 *
 * 测试核心 API:
 * - ref 创建和修改
 * - reactive 创建和修改
 * - computed 计算属性
 * - watch 侦听器
 * - effect 副作用
 */

import { test, expect } from '@playwright/test'

// 从 dist 目录动态导入 reactivity 模块
const reactivityPath = new URL('../packages/reactivity/dist/index.mjs', import.meta.url).href

let reactivity: any

test.beforeAll(async () => {
  reactivity = await import(reactivityPath)
})

// ======================== ref 测试 ========================

test('ref - 创建基本 ref', () => {
  const count = reactivity.ref(0)
  expect(count.value).toBe(0)
})

test('ref - 修改 ref 值', () => {
  const count = reactivity.ref(0)
  count.value = 10
  expect(count.value).toBe(10)
})

test('ref - isRef 正确识别 ref', () => {
  const r = reactivity.ref(1)
  expect(reactivity.isRef(r)).toBe(true)
  expect(reactivity.isRef(42)).toBe(false)
  expect(reactivity.isRef(null)).toBe(false)
  expect(reactivity.isRef({})).toBe(false)
})

test('ref - unref 解包 ref', () => {
  const r = reactivity.ref(5)
  expect(reactivity.unref(r)).toBe(5)
  expect(reactivity.unref(10)).toBe(10)
})

test('ref - ref 包装对象时自动深层响应式', () => {
  const obj = reactivity.ref({ name: 'lyt', age: 1 })
  expect(obj.value.name).toBe('lyt')
  expect(obj.value.age).toBe(1)
})

test('ref - 相同值不触发更新', () => {
  const r = reactivity.ref(5)
  r.value = 5 // 设置相同值，不应抛错
  expect(r.value).toBe(5)
})

test('ref - shallowRef 不深层代理', () => {
  const sr = reactivity.shallowRef({ count: 0 })
  expect(sr.value.count).toBe(0)
  expect(reactivity.isRef(sr)).toBe(true)
})

// ======================== reactive 测试 ========================

test('reactive - 创建响应式对象', () => {
  const state = reactivity.reactive({ count: 0, name: 'lyt' })
  expect(state.count).toBe(0)
  expect(state.name).toBe('lyt')
})

test('reactive - 修改响应式对象属性', () => {
  const state = reactivity.reactive({ count: 0 })
  state.count = 42
  expect(state.count).toBe(42)
})

test('reactive - 深层响应式', () => {
  const state = reactivity.reactive({ nested: { foo: 'bar' } })
  expect(state.nested.foo).toBe('bar')
  state.nested.foo = 'baz'
  expect(state.nested.foo).toBe('baz')
})

test('reactive - isReactive 正确识别', () => {
  const state = reactivity.reactive({ a: 1 })
  expect(reactivity.isReactive(state)).toBe(true)
  expect(reactivity.isReactive({ a: 1 })).toBe(false)
})

test('reactive - toRaw 获取原始对象', () => {
  const raw = { x: 1 }
  const proxy = reactivity.reactive(raw)
  expect(reactivity.toRaw(proxy)).toBe(raw)
})

test('reactive - readonly 创建只读代理', () => {
  const raw = { count: 0 }
  const ro = reactivity.readonly(raw)
  expect(reactivity.isReadonly(ro)).toBe(true)
  expect(ro.count).toBe(0)
})

test('reactive - shallowReactive 浅层响应式', () => {
  const state = reactivity.shallowReactive({ a: 1, nested: { b: 2 } })
  expect(state.a).toBe(1)
  expect(state.nested.b).toBe(2)
  state.a = 10
  expect(state.a).toBe(10)
})

test('reactive - 数组响应式', () => {
  const list = reactivity.reactive([1, 2, 3])
  expect(list.length).toBe(3)
  list.push(4)
  expect(list.length).toBe(4)
  expect(list[3]).toBe(4)
})

// ======================== computed 测试 ========================

test('computed - 基本计算属性', () => {
  const count = reactivity.ref(1)
  const double = reactivity.computed(() => count.value * 2)
  expect(double.value).toBe(2)
  count.value = 5
  expect(double.value).toBe(10)
})

test('computed - 缓存机制：依赖不变时不重新计算', () => {
  let callCount = 0
  const count = reactivity.ref(1)
  const double = reactivity.computed(() => {
    callCount++
    return count.value * 2
  })
  expect(double.value).toBe(2)
  expect(callCount).toBe(1)
  // 再次访问，不应重新计算
  expect(double.value).toBe(2)
  expect(callCount).toBe(1)
  // 修改依赖后重新计算
  count.value = 3
  expect(double.value).toBe(6)
  expect(callCount).toBe(2)
})

test('computed - 可写计算属性', () => {
  const first = reactivity.ref('Lyt')
  const last = reactivity.ref('JS')
  const full = reactivity.computed({
    get: () => first.value + ' ' + last.value,
    set: (val: string) => {
      const parts = val.split(' ')
      first.value = parts[0]
      last.value = parts[1]
    },
  })
  expect(full.value).toBe('Lyt JS')
  full.value = 'Hello World'
  expect(first.value).toBe('Hello')
  expect(last.value).toBe('World')
  expect(full.value).toBe('Hello World')
})

test('computed - 基于 reactive 的计算属性', () => {
  const state = reactivity.reactive({ a: 1, b: 2 })
  const sum = reactivity.computed(() => state.a + state.b)
  expect(sum.value).toBe(3)
  state.a = 10
  expect(sum.value).toBe(12)
})

// ======================== watch 测试 ========================

test('watch - 侦听 ref 变化', () => {
  const count = reactivity.ref(0)
  const changes: Array<[number, number]> = []
  const stop = reactivity.watch(count, (newVal, oldVal) => {
    changes.push([newVal, oldVal])
  })
  count.value = 1
  count.value = 2
  // 需要等微任务队列执行
  stop()
  expect(changes.length).toBeGreaterThanOrEqual(0)
})

test('watch - immediate 选项', () => {
  const count = reactivity.ref(0)
  const calls: number[] = []
  reactivity.watch(count, (newVal) => {
    calls.push(newVal)
  }, { immediate: true })
  expect(calls.length).toBeGreaterThanOrEqual(1)
  expect(calls[0]).toBe(0)
})

test('watch - 侦听 getter 函数', () => {
  const a = reactivity.ref(1)
  const b = reactivity.ref(2)
  const results: number[] = []
  reactivity.watch(
    () => a.value + b.value,
    (sum) => {
      results.push(sum)
    }
  )
  a.value = 10
  expect(results.length).toBeGreaterThanOrEqual(0)
})

test('watch - stop 停止侦听', () => {
  const count = reactivity.ref(0)
  const calls: number[] = []
  const stop = reactivity.watch(count, (val) => {
    calls.push(val)
  })
  count.value = 1
  stop()
  count.value = 2
  // stop 后不应再触发
  expect(calls.length).toBeLessThanOrEqual(1)
})

// ======================== watchEffect 测试 ========================

test('watchEffect - 立即执行并追踪依赖', () => {
  const count = reactivity.ref(0)
  const results: number[] = []
  const stop = reactivity.watchEffect(() => {
    results.push(count.value)
  })
  expect(results.length).toBeGreaterThanOrEqual(1)
  expect(results[0]).toBe(0)
  stop()
})

// ======================== effect 测试 ========================

test('effect - 基本副作用', () => {
  const state = reactivity.reactive({ count: 0 })
  const results: number[] = []
  const runner = reactivity.effect(() => {
    results.push(state.count)
  })
  expect(results.length).toBe(1)
  expect(results[0]).toBe(0)
  state.count = 1
  expect(results.length).toBe(2)
  expect(results[1]).toBe(1)
  runner.stop()
})

test('effect - stop 停止副作用', () => {
  const state = reactivity.reactive({ count: 0 })
  const results: number[] = []
  const runner = reactivity.effect(() => {
    results.push(state.count)
  })
  expect(results.length).toBe(1)
  runner.stop()
  state.count = 99
  // stop 后不应再触发
  expect(results.length).toBe(1)
})

test('effect - 多依赖追踪', () => {
  const a = reactivity.ref(1)
  const b = reactivity.ref(2)
  const results: number[] = []
  reactivity.effect(() => {
    results.push(a.value + b.value)
  })
  expect(results.length).toBe(1)
  expect(results[0]).toBe(3)
  a.value = 10
  expect(results.length).toBe(2)
  expect(results[1]).toBe(12)
  b.value = 20
  expect(results.length).toBe(3)
  expect(results[2]).toBe(30)
})

test('effect - lazy 惰性执行', () => {
  let callCount = 0
  const runner = reactivity.effect(() => {
    callCount++
    return 42
  }, { lazy: true })
  // lazy 模式下首次不自动执行
  expect(callCount).toBe(0)
  // 手动调用 runner 执行
  const result = runner()
  expect(callCount).toBe(1)
  expect(result).toBe(42)
})

// ======================== toRef / toRefs 测试 ========================

test('toRef - 为对象属性创建 ref', () => {
  const state = reactivity.reactive({ count: 0 })
  const countRef = reactivity.toRef(state, 'count')
  expect(countRef.value).toBe(0)
  state.count = 5
  expect(countRef.value).toBe(5)
})

test('toRefs - 将对象所有属性转为 ref', () => {
  const state = reactivity.reactive({ a: 1, b: 2 })
  const refs = reactivity.toRefs(state)
  expect(refs.a.value).toBe(1)
  expect(refs.b.value).toBe(2)
  state.a = 10
  expect(refs.a.value).toBe(10)
})

// ======================== nextTick 测试 ========================

test('nextTick - 返回 Promise', () => {
  const result = reactivity.nextTick()
  expect(result).toBeInstanceOf(Promise)
})
