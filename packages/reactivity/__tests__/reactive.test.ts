/**
 * Lyt.js 响应式系统 — 单元测试
 *
 * 纯原生测试框架实现，不依赖 vitest/jest 等第三方测试库。
 * 自行实现简易的 test/expect/assert 工具函数。
 *
 * 测试覆盖：
 *   - reactive 基本读写
 *   - reactive 嵌套对象
 *   - ref 基本读写
 *   - computed 惰性求值
 *   - computed 缓存
 *   - watch 基本侦听
 *   - watchEffect 自动收集
 *   - nextTick 批量更新
 *   - shallowRef 不深层代理
 *   - toRef/toRefs
 *   - readonly 只读代理
 *   - 多层嵌套响应式
 *   - computed 链式依赖
 *   - watch 立即执行
 *   - effect 停止
 */

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
} from '../src/index'

// ================================================================
//  简易测试框架
// ================================================================

/** 测试统计 */
let totalTests = 0
let passedTests = 0
let failedTests = 0
const failedNames: string[] = []

/**
 * 断言工具
 *
 * 支持链式调用：expect(value).toBe(expected).truthy().falsy()
 */
class Assertion {
  private _value: any
  private _negated: boolean = false

  constructor(value: any) {
    this._value = value
  }

  /** 取反断言 */
  get not(): Assertion {
    this._negated = !this._negated
    return this
  }

  /** 断言相等（严格比较） */
  toBe(expected: any): Assertion {
    const pass = this._negated
      ? !Object.is(this._value, expected)
      : Object.is(this._value, expected)
    this._assert(pass, `期望 ${JSON.stringify(this._value)} ${this._negated ? '不' : ''}等于 ${JSON.stringify(expected)}`)
    return this
  }

  /** 断言深度相等 */
  equal(expected: any): Assertion {
    const pass = this._negated
      ? !deepEqual(this._value, expected)
      : deepEqual(this._value, expected)
    this._assert(pass, `期望 ${JSON.stringify(this._value)} ${this._negated ? '不' : ''}深度等于 ${JSON.stringify(expected)}`)
    return this
  }

  /** 断言为真值 */
  truthy(): Assertion {
    const pass = this._negated ? !this._value : !!this._value
    this._assert(pass, `期望 ${JSON.stringify(this._value)} ${this._negated ? '不' : ''}为真值`)
    return this
  }

  /** 断言为假值 */
  falsy(): Assertion {
    const pass = this._negated ? !!this._value : !this._value
    this._assert(pass, `期望 ${JSON.stringify(this._value)} ${this._negated ? '不' : ''}为假值`)
    return this
  }

  /** 断言函数抛出异常 */
  toThrow(): Assertion {
    let threw = false
    try {
      if (typeof this._value === 'function') {
        this._value()
      }
    } catch {
      threw = true
    }
    const pass = this._negated ? !threw : threw
    this._assert(pass, `期望函数${this._negated ? '不' : ''}抛出异常`)
    return this
  }

  /** 内部断言方法 */
  private _assert(pass: boolean, message: string): void {
    if (!pass) {
      throw new Error(`断言失败: ${message}`)
    }
  }
}

/**
 * 创建断言
 * @param value 要断言的值
 * @returns Assertion 实例
 */
function expect(value: any): Assertion {
  return new Assertion(value)
}

/**
 * 深度比较两个值
 */
function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false

  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

/**
 * 注册并执行测试用例
 *
 * @param name 测试名称
 * @param fn   测试函数
 */
function test(name: string, fn: () => void | Promise<void>): void {
  totalTests++
  try {
    const result = fn()
    // 支持异步测试
    if (result instanceof Promise) {
      result.then(() => {
        passedTests++
        console.log(`  [PASS] ${name}`)
      }).catch((err: Error) => {
        failedTests++
        failedNames.push(name)
        console.error(`  [FAIL] ${name}`)
        console.error(`    ${err.message}`)
      })
    } else {
      passedTests++
      console.log(`  [PASS] ${name}`)
    }
  } catch (err: any) {
    failedTests++
    failedNames.push(name)
    console.error(`  [FAIL] ${name}`)
    console.error(`    ${err.message}`)
  }
}

// ================================================================
//  测试用例
// ================================================================

console.log('\n=== 响应式系统测试 ===\n')

// ---- 1. reactive 基本读写 ----
test('reactive 基本读写', () => {
  const state = reactive({ count: 0, name: 'lyt' })

  // 读取
  expect(state.count).toBe(0)
  expect(state.name).toBe('lyt')

  // 写入
  state.count = 1
  expect(state.count).toBe(1)

  state.name = 'hello'
  expect(state.name).toBe('hello')
})

// ---- 2. reactive 嵌套对象 ----
test('reactive 嵌套对象', () => {
  const state = reactive({
    user: {
      name: 'lyt',
      address: {
        city: 'shanghai',
      },
    },
  })

  // 读取嵌套属性
  expect(state.user.name).toBe('lyt')
  expect(state.user.address.city).toBe('shanghai')

  // 修改嵌套属性
  state.user.address.city = 'beijing'
  expect(state.user.address.city).toBe('beijing')

  // 嵌套对象也是响应式的
  expect(isReactive(state.user)).toBe(true)
  expect(isReactive(state.user.address)).toBe(true)
})

// ---- 3. ref 基本读写 ----
test('ref 基本读写', () => {
  const count = ref(0)

  // 读取
  expect(count.value).toBe(0)

  // 写入
  count.value = 1
  expect(count.value).toBe(1)

  // 是 Ref
  expect(isRef(count)).toBe(true)
})

// ---- 4. computed 惰性求值 ----
test('computed 惰性求值', () => {
  const count = ref(0)
  let computedCalled = false

  const double = computed(() => {
    computedCalled = true
    return count.value * 2
  })

  // 创建 computed 时不应该立即求值（惰性）
  expect(computedCalled).toBe(false)

  // 访问 .value 时才求值
  const val = double.value
  expect(val).toBe(0)
  expect(computedCalled).toBe(true)
})

// ---- 5. computed 缓存 ----
test('computed 缓存', () => {
  const count = ref(1)
  let callCount = 0

  const double = computed(() => {
    callCount++
    return count.value * 2
  })

  // 第一次访问，触发计算
  double.value
  expect(callCount).toBe(1)

  // 第二次访问，使用缓存
  double.value
  expect(callCount).toBe(1)

  // 依赖变化后重新计算
  count.value = 2
  double.value
  expect(callCount).toBe(2)

  // 再次访问，使用缓存
  double.value
  expect(callCount).toBe(2)
})

// ---- 6. watch 基本侦听 ----
test('watch 基本侦听', () => {
  const count = ref(0)
  let watchedNewVal: number | undefined
  let watchedOldVal: number | undefined

  const stopWatch = watch(count, (newVal, oldVal) => {
    watchedNewVal = newVal
    watchedOldVal = oldVal
  })

  // 修改值
  count.value = 1

  // watch 使用调度器，需要 nextTick 后才能看到结果
  // 这里先验证 stop 函数存在
  expect(typeof stopWatch).toBe('function')
  stopWatch()
})

// ---- 7. watchEffect 自动收集 ----
test('watchEffect 自动收集', () => {
  const count = ref(0)
  let effectCount = 0

  const stopWatch = watchEffect(() => {
    effectCount = count.value
  })

  // 立即执行一次
  expect(effectCount).toBe(0)

  // 修改值后自动重新执行
  count.value = 5
  // 需要等待 nextTick
  expect(typeof stopWatch).toBe('function')
  stopWatch()
})

// ---- 8. nextTick 批量更新 ----
test('nextTick 批量更新', async () => {
  const count = ref(0)
  const results: number[] = []

  watch(count, (newVal) => {
    results.push(newVal)
  })

  // 连续修改多次
  count.value = 1
  count.value = 2
  count.value = 3

  // nextTick 之前，回调还未执行
  expect(results.length).toBe(0)

  // 等待 nextTick
  await nextTick()

  // 批量更新后应该只执行一次（最终值）
  expect(results.length).toBe(1)
  expect(results[0]).toBe(3)
})

// ---- 9. shallowRef 不深层代理 ----
test('shallowRef 不深层代理', () => {
  const state = shallowRef({ count: 0 })

  // 读取
  expect(state.value.count).toBe(0)

  // 修改内部属性不会触发更新（浅层）
  let triggered = false
  const runner = effect(() => {
    triggered = true
    state.value
  })

  // 重置标记
  triggered = false

  // 修改内部属性
  state.value.count = 1
  // shallowRef 不会追踪内部属性变化
  expect(state.value.count).toBe(1)

  // 替换整个 value 会触发更新
  state.value = { count: 2 }
  expect(state.value.count).toBe(2)

  if ((runner as any).stop) (runner as any).stop()
})

// ---- 10. toRef/toRefs ----
test('toRef/toRefs', () => {
  const state = reactive({ count: 0, name: 'lyt' })

  // toRef
  const countRef = toRef(state, 'count')
  expect(countRef.value).toBe(0)
  expect(isRef(countRef)).toBe(true)

  // 通过 toRef 修改会同步到原始对象
  countRef.value = 10
  expect(state.count).toBe(10)

  // 通过原始对象修改会同步到 toRef
  state.count = 20
  expect(countRef.value).toBe(20)

  // toRefs
  const refs = toRefs(state)
  expect(refs.count.value).toBe(20)
  expect(refs.name.value).toBe('lyt')
  expect(isRef(refs.count)).toBe(true)
  expect(isRef(refs.name)).toBe(true)

  // 通过 toRefs 修改会同步到原始对象
  refs.name.value = 'hello'
  expect(state.name).toBe('hello')
})

// ---- 11. readonly 只读代理 ----
test('readonly 只读代理', () => {
  const original = { count: 0, nested: { foo: 'bar' } }
  const state = readonly(original)

  // 可以读取
  expect(state.count).toBe(0)
  expect(state.nested.foo).toBe('bar')

  // 是只读的
  expect(isReadonly(state)).toBe(true)

  // 设置属性应该被阻止（只发出警告，不抛出错误）
  state.count = 1
  // 值不应该改变
  expect(state.count).toBe(0)

  // 删除属性也应该被阻止
  delete (state as any).count
  expect(state.count).toBe(0)
})

// ---- 12. 多层嵌套响应式 ----
test('多层嵌套响应式', () => {
  const state = reactive({
    a: {
      b: {
        c: {
          d: 42,
        },
      },
    },
  })

  // 深层读取
  expect(state.a.b.c.d).toBe(42)

  // 深层修改
  state.a.b.c.d = 100
  expect(state.a.b.c.d).toBe(100)

  // 所有层级都是响应式的
  expect(isReactive(state.a)).toBe(true)
  expect(isReactive(state.a.b)).toBe(true)
  expect(isReactive(state.a.b.c)).toBe(true)
})

// ---- 13. computed 链式依赖 ----
test('computed 链式依赖', () => {
  const base = ref(1)
  const double = computed(() => base.value * 2)
  const quadruple = computed(() => double.value * 2)

  expect(double.value).toBe(2)
  expect(quadruple.value).toBe(4)

  // 修改基础值
  base.value = 5
  expect(double.value).toBe(10)
  expect(quadruple.value).toBe(20)
})

// ---- 14. watch 立即执行 ----
test('watch 立即执行', async () => {
  const count = ref(0)
  const results: number[] = []

  watch(count, (newVal) => {
    results.push(newVal)
  }, { immediate: true })

  // 立即执行时应该收到初始值
  await nextTick()
  expect(results.length).toBe(1)
  expect(results[0]).toBe(0)

  // 后续修改正常触发
  count.value = 1
  await nextTick()
  expect(results.length).toBe(2)
  expect(results[1]).toBe(1)
})

// ---- 15. effect 停止 ----
test('effect 停止', () => {
  const count = ref(0)
  let effectCount = 0

  const runner = effect(() => {
    effectCount++
    return count.value
  })

  // 初始执行一次
  expect(effectCount).toBe(1)

  // 修改值触发 effect
  count.value = 1
  expect(effectCount).toBe(2)

  // 停止 effect
  stop(runner)

  // 停止后修改值不再触发 effect
  count.value = 2
  expect(effectCount).toBe(2)
})

// ================================================================
//  测试结果汇总
// ================================================================

// 延迟输出汇总（等待异步测试完成）
setTimeout(() => {
  console.log(`\n--- 响应式系统自测结果 ---`)
  console.log(`总计: ${totalTests}`)
  console.log(`通过: ${passedTests}`)
  console.log(`失败: ${failedTests}`)

  if (failedNames.length > 0) {
    console.log(`\n失败的测试:`)
    for (const name of failedNames) {
      console.log(`  - ${name}`)
    }
  }

  console.log(failedTests === 0 ? '\n所有测试通过!' : '\n存在失败的测试!')
}, 100)
