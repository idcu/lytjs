/**
 * Lyt.js Signal 响应式系统 — 单元测试
 *
 * 测试覆盖：
 *   - signal 基本操作：创建、读取、设置、更新
 *   - signal 相等性：Object.is 比较，相同值不通知
 *   - signal 对象值：支持对象类型的信号
 *   - computed 基本操作：惰性求值、缓存
 *   - computed 链式依赖：A -> B -> C
 *   - computed 循环依赖检测
 *   - effect 基本操作：自动追踪、变化时重新执行
 *   - effect 清理：重新执行和销毁时调用清理函数
 *   - effect 嵌套：内层 effect 正确追踪
 *   - effect 销毁：停止 effect 执行
 *   - batch 基本操作：多次更新触发单次 effect
 *   - batch 嵌套：嵌套 batch 正确延迟
 *   - untrack：不创建订阅地读取信号
 *   - 性能：10,000 次更新 < 50ms
 *   - 内存：销毁的 effect 不泄漏
 *   - 集成：signal + computed + effect 协同工作
 *   - 边界情况：已销毁信号读取、设置 computed 信号
 */

import { describe, it, expect } from '../../test-utils/src/index'
import {
  signal,
  computed,
  effect,
  batch,
  untrack,
} from '../src/signal'
import {
  useSignal,
  useSignalState,
  enterSignalComponentContext,
  onSignalCleanup,
} from '../src/signal-component'
import type { WritableSignal, ComputedSignal } from '../src/signal'

// ================================================================
//  Signal 基本操作
// ================================================================

describe('Signal 基本操作', () => {
  it('应该创建信号并读取初始值', () => {
    const count = signal(0)
    expect(count()).toBe(0)
  })

  it('应该支持字符串初始值', () => {
    const name = signal('lyt')
    expect(name()).toBe('lyt')
  })

  it('应该通过 set 设置新值', () => {
    const count = signal(0)
    count.set(5)
    expect(count()).toBe(5)
  })

  it('应该通过 update 基于前值更新', () => {
    const count = signal(10)
    count.update(prev => prev + 1)
    expect(count()).toBe(11)
  })

  it('应该支持多次 set', () => {
    const count = signal(0)
    count.set(1)
    count.set(2)
    count.set(3)
    expect(count()).toBe(3)
  })

  it('应该支持布尔值', () => {
    const flag = signal(false)
    expect(flag()).toBe(false)
    flag.set(true)
    expect(flag()).toBe(true)
  })

  it('应该支持 null 和 undefined', () => {
    const n = signal<number | null>(null)
    expect(n()).toBe(null)
    n.set(42)
    expect(n()).toBe(42)
  })

  it('应该支持数组值', () => {
    const arr = signal([1, 2, 3])
    expect(arr()).toEqual([1, 2, 3])
    arr.set([4, 5, 6])
    expect(arr()).toEqual([4, 5, 6])
  })
})

// ================================================================
//  Signal 相等性
// ================================================================

describe('Signal 相等性 (Object.is)', () => {
  it('相同值不应触发 effect', () => {
    const count = signal(1)
    let runs = 0
    const dispose = effect(() => {
      void count()
      runs++
    })
    expect(runs).toBe(1) // 首次执行

    count.set(1) // 相同值
    expect(runs).toBe(1) // 不应再次触发

    count.set(2) // 不同值
    expect(runs).toBe(2)

    dispose()
  })

  it('NaN 等于 NaN (Object.is)', () => {
    const num = signal(NaN)
    let runs = 0
    const dispose = effect(() => {
      void num()
      runs++
    })
    expect(runs).toBe(1)

    num.set(NaN) // Object.is(NaN, NaN) === true
    expect(runs).toBe(1)

    dispose()
  })

  it('+0 和 -0 不相等 (Object.is)', () => {
    const num = signal(0)
    let runs = 0
    const dispose = effect(() => {
      void num()
      runs++
    })
    expect(runs).toBe(1)

    num.set(-0) // Object.is(0, -0) === false
    expect(runs).toBe(2)

    dispose()
  })

  it('update 返回相同值不应触发 effect', () => {
    const count = signal(5)
    let runs = 0
    const dispose = effect(() => {
      void count()
      runs++
    })
    expect(runs).toBe(1)

    count.update(prev => prev) // 返回相同值
    expect(runs).toBe(1)

    dispose()
  })
})

// ================================================================
//  Signal 对象值
// ================================================================

describe('Signal 对象值', () => {
  it('应该支持对象值', () => {
    const user = signal({ name: 'test', age: 20 })
    expect(user()).toEqual({ name: 'test', age: 20 })
  })

  it('替换整个对象应触发 effect', () => {
    const user = signal({ name: 'test', age: 20 })
    let runs = 0
    const dispose = effect(() => {
      void user()
      runs++
    })
    expect(runs).toBe(1)

    user.set({ name: 'test', age: 20 }) // 新对象，引用不同
    expect(runs).toBe(2)

    dispose()
  })

  it('相同引用的对象不应触发 effect', () => {
    const obj = { name: 'test' }
    const user = signal(obj)
    let runs = 0
    const dispose = effect(() => {
      void user()
      runs++
    })
    expect(runs).toBe(1)

    user.set(obj) // 相同引用
    expect(runs).toBe(1)

    dispose()
  })
})

// ================================================================
//  Computed 基本操作
// ================================================================

describe('Computed 基本操作', () => {
  it('应该惰性求值（首次读取时才计算）', () => {
    let computeCount = 0
    const count = signal(1)
    const doubled = computed(() => {
      computeCount++
      return count() * 2
    })
    // 创建 computed 时不计算
    expect(computeCount).toBe(0)

    // 读取时才计算
    const val = doubled()
    expect(val).toBe(2)
    expect(computeCount).toBe(1)
  })

  it('应该缓存结果直到依赖变化', () => {
    let computeCount = 0
    const count = signal(1)
    const doubled = computed(() => {
      computeCount++
      return count() * 2
    })

    doubled() // 第一次计算
    expect(computeCount).toBe(1)

    doubled() // 第二次读取，应使用缓存
    expect(computeCount).toBe(1)

    count.set(2) // 依赖变化
    doubled() // 重新计算
    expect(computeCount).toBe(2)
  })

  it('应该支持多个依赖', () => {
    const a = signal(1)
    const b = signal(2)
    const sum = computed(() => a() + b())
    expect(sum()).toBe(3)

    a.set(10)
    expect(sum()).toBe(12)

    b.set(20)
    expect(sum()).toBe(30)
  })

  it('应该支持字符串拼接', () => {
    const first = signal('hello')
    const last = signal('world')
    const full = computed(() => `${first()} ${last()}`)
    expect(full()).toBe('hello world')

    first.set('hi')
    expect(full()).toBe('hi world')
  })
})

// ================================================================
//  Computed 链式依赖
// ================================================================

describe('Computed 链式依赖', () => {
  it('应该支持 A -> B -> C 链式依赖', () => {
    const a = signal(1)
    const b = computed(() => a() * 2)
    const c = computed(() => b() + 10)

    expect(b()).toBe(2)
    expect(c()).toBe(12)

    a.set(5)
    expect(b()).toBe(10)
    expect(c()).toBe(20)
  })

  it('应该支持长链式依赖', () => {
    const s = signal(1)
    const c1 = computed(() => s() + 1)
    const c2 = computed(() => c1() + 1)
    const c3 = computed(() => c2() + 1)
    const c4 = computed(() => c3() + 1)
    const c5 = computed(() => c4() + 1)

    expect(c5()).toBe(6)

    s.set(10)
    expect(c5()).toBe(15)
  })

  it('链式依赖中 computed 只计算必要的部分', () => {
    let bCount = 0
    let cCount = 0
    const a = signal(1)
    const b = computed(() => { bCount++; return a() * 2 })
    const c = computed(() => { cCount++; return b() + 10 })

    c() // 触发 b 和 c
    expect(bCount).toBe(1)
    expect(cCount).toBe(1)

    a.set(2) // b 变化，c 也需要重新计算
    c()
    expect(bCount).toBe(2)
    expect(cCount).toBe(2)
  })
})

// ================================================================
//  Computed 循环依赖
// ================================================================

describe('Computed 循环依赖检测', () => {
  it('应该检测直接循环依赖并抛出错误', () => {
    let aRef: ComputedSignal<number>
    const a = computed(() => {
      return (aRef as any)() + 1
    })
    aRef = a

    expect(() => a()).toThrow('循环依赖')
  })

  it('应该检测间接循环依赖并抛出错误', () => {
    let bRef: ComputedSignal<number>
    const a = computed(() => bRef() + 1)
    const b = computed(() => a() + 1)
    bRef = b

    expect(() => a()).toThrow('循环依赖')
  })
})

// ================================================================
//  Effect 基本操作
// ================================================================

describe('Effect 基本操作', () => {
  it('应该自动追踪依赖', () => {
    const count = signal(0)
    let effectValue = -1
    const dispose = effect(() => {
      effectValue = count()
    })
    expect(effectValue).toBe(0)

    count.set(1)
    expect(effectValue).toBe(1)

    count.set(2)
    expect(effectValue).toBe(2)

    dispose()
  })

  it('应该追踪多个依赖', () => {
    const a = signal(1)
    const b = signal(2)
    let sum = 0
    const dispose = effect(() => {
      sum = a() + b()
    })
    expect(sum).toBe(3)

    a.set(10)
    expect(sum).toBe(12)

    b.set(20)
    expect(sum).toBe(30)

    dispose()
  })

  it('首次执行应该在创建时立即运行', () => {
    let ran = false
    effect(() => { ran = true })
    expect(ran).toBe(true)
  })

  it('应该在依赖变化时重新执行', () => {
    const name = signal('lyt')
    let observed = ''
    const dispose = effect(() => {
      observed = name()
    })
    expect(observed).toBe('lyt')

    name.set('lyt.js')
    expect(observed).toBe('lyt.js')

    dispose()
  })
})

// ================================================================
//  Effect 清理
// ================================================================

describe('Effect 清理', () => {
  it('应该在重新执行前调用清理函数 (onCleanup)', () => {
    const count = signal(0)
    let cleanupCalled = 0
    const dispose = effect((onCleanup) => {
      onCleanup(() => { cleanupCalled++ })
      void count()
    })
    expect(cleanupCalled).toBe(0)

    count.set(1)
    expect(cleanupCalled).toBe(1)

    count.set(2)
    expect(cleanupCalled).toBe(2)

    dispose()
  })

  it('应该在 dispose 时调用清理函数', () => {
    let cleanupCalled = false
    const count = signal(0)
    const dispose = effect((onCleanup) => {
      onCleanup(() => { cleanupCalled = true })
      void count()
    })
    expect(cleanupCalled).toBe(false)

    dispose()
    expect(cleanupCalled).toBe(true)
  })

  it('应该支持多次注册清理函数（后注册的覆盖前一个）', () => {
    let val = 0
    const count = signal(0)
    const dispose = effect((onCleanup) => {
      onCleanup(() => { val = 1 })
      onCleanup(() => { val = 2 }) // 覆盖前一个
      void count()
    })

    count.set(1)
    expect(val).toBe(2) // 最后注册的清理函数生效

    dispose()
  })
})

// ================================================================
//  Effect 嵌套
// ================================================================

describe('Effect 嵌套', () => {
  it('内层 effect 应该独立追踪依赖', () => {
    const outer = signal(1)
    const inner = signal('a')
    let outerRuns = 0
    let innerRuns = 0

    const disposeOuter = effect(() => {
      outerRuns++
      void outer()

      const disposeInner = effect(() => {
        innerRuns++
        void inner()
      })

      // 内层 effect 在外层每次执行时创建
      // 注意：实际使用中应避免这种模式，但系统应正确处理
      disposeInner()
    })

    expect(outerRuns).toBe(1)
    expect(innerRuns).toBe(1)

    inner.set('b')
    // 内层 effect 已被 dispose，不应再运行
    expect(innerRuns).toBe(1)

    outer.set(2)
    expect(outerRuns).toBe(2)
    // 外层重新执行会创建新的内层 effect
    expect(innerRuns).toBe(2)

    disposeOuter()
  })

  it('嵌套 effect 不应互相干扰依赖追踪', () => {
    const a = signal(1)
    const b = signal(2)
    let aRuns = 0
    let bRuns = 0

    const disposeA = effect(() => {
      aRuns++
      void a()
    })

    const disposeB = effect(() => {
      bRuns++
      void b()
    })

    expect(aRuns).toBe(1)
    expect(bRuns).toBe(1)

    a.set(10)
    expect(aRuns).toBe(2)
    expect(bRuns).toBe(1) // b 的 effect 不应被触发

    b.set(20)
    expect(aRuns).toBe(2)
    expect(bRuns).toBe(2)

    disposeA()
    disposeB()
  })
})

// ================================================================
//  Effect 销毁
// ================================================================

describe('Effect 销毁', () => {
  it('dispose 后不应再执行', () => {
    const count = signal(0)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void count()
    })
    expect(runs).toBe(1)

    dispose()
    count.set(1)
    count.set(2)
    count.set(3)
    expect(runs).toBe(1) // dispose 后不再执行
  })

  it('多次 dispose 不应报错', () => {
    const count = signal(0)
    const dispose = effect(() => { void count() })
    dispose()
    dispose() // 第二次调用不应报错
  })
})

// ================================================================
//  Batch 基本操作
// ================================================================

describe('Batch 基本操作', () => {
  it('batch 内多次更新应只触发一次 effect', () => {
    const a = signal(1)
    const b = signal(2)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void a()
      void b()
    })
    expect(runs).toBe(1)

    batch(() => {
      a.set(10)
      b.set(20)
      expect(runs).toBe(1) // batch 内不应触发
    })
    expect(runs).toBe(2) // batch 结束后触发一次

    dispose()
  })

  it('batch 内相同值更新不应触发 effect', () => {
    const count = signal(1)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void count()
    })
    expect(runs).toBe(1)

    batch(() => {
      count.set(1) // 相同值
      count.set(1) // 相同值
    })
    expect(runs).toBe(1) // 不应触发

    dispose()
  })

  it('batch 外更新应立即触发', () => {
    const count = signal(0)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void count()
    })

    count.set(1)
    expect(runs).toBe(2)

    dispose()
  })
})

// ================================================================
//  Batch 嵌套
// ================================================================

describe('Batch 嵌套', () => {
  it('嵌套 batch 应在最外层完成后才触发 effect', () => {
    const a = signal(1)
    const b = signal(2)
    const c = signal(3)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void a()
      void b()
      void c()
    })
    expect(runs).toBe(1)

    batch(() => {
      a.set(10)
      batch(() => {
        b.set(20)
        c.set(30)
        expect(runs).toBe(1) // 内层 batch 不触发
      })
      expect(runs).toBe(1) // 外层 batch 还未完成
    })
    expect(runs).toBe(2) // 最外层完成后触发一次

    dispose()
  })

  it('三层嵌套 batch', () => {
    const count = signal(0)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void count()
    })

    batch(() => {
      batch(() => {
        batch(() => {
          count.set(1)
        })
        expect(runs).toBe(1)
      })
      expect(runs).toBe(1)
    })
    expect(runs).toBe(2)

    dispose()
  })
})

// ================================================================
//  Untrack
// ================================================================

describe('Untrack', () => {
  it('untrack 内读取 signal 不应创建订阅', () => {
    const a = signal(1)
    const b = signal(2)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void a()
      untrack(() => {
        void b() // 不应创建订阅
      })
    })
    expect(runs).toBe(1)

    b.set(20) // 不应触发 effect
    expect(runs).toBe(1)

    a.set(10) // 应触发 effect
    expect(runs).toBe(2)

    dispose()
  })

  it('untrack 应返回函数的返回值', () => {
    const count = signal(42)
    const val = untrack(() => count())
    expect(val).toBe(42)
  })

  it('untrack 内可以读取 computed', () => {
    const a = signal(1)
    const b = computed(() => a() * 2)
    let runs = 0
    const dispose = effect(() => {
      runs++
      untrack(() => {
        void b() // 不应创建订阅
      })
    })
    expect(runs).toBe(1)

    a.set(10) // b 变化但 effect 不订阅 b
    expect(runs).toBe(1)

    dispose()
  })
})

// ================================================================
//  性能测试
// ================================================================

describe('性能测试', () => {
  it('10,000 次 signal 更新应在 50ms 内完成', () => {
    const count = signal(0)
    let runs = 0

    const dispose = effect(() => {
      runs++
      void count()
    })

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      count.set(i)
    }
    const elapsed = performance.now() - start

    dispose()
    expect(elapsed).toBeLessThan(50)
  })

  it('10,000 次 batch 内更新应在 50ms 内完成', () => {
    const count = signal(0)
    let runs = 0

    const dispose = effect(() => {
      runs++
      void count()
    })

    const start = performance.now()
    batch(() => {
      for (let i = 0; i < 10000; i++) {
        count.set(i)
      }
    })
    const elapsed = performance.now() - start

    dispose()
    expect(elapsed).toBeLessThan(50)
    // batch 内 10000 次更新，effect 只应在 batch 结束后执行一次
    // 首次执行 + batch 结束后一次 = 2
    expect(runs).toBe(2)
  })
})

// ================================================================
//  内存测试
// ================================================================

describe('内存测试', () => {
  it('销毁的 effect 不应泄漏（不再被通知）', () => {
    const count = signal(0)
    let runs = 0

    // 创建并立即销毁多个 effect
    for (let i = 0; i < 100; i++) {
      const dispose = effect(() => {
        runs++
        void count()
      })
      dispose()
    }

    const runsBeforeSet = runs

    // 更新 signal，已销毁的 effect 不应被通知
    count.set(1)
    expect(runs).toBe(runsBeforeSet) // 不应有新的运行
  })

  it('computed 在没有订阅者时不应保留依赖', () => {
    const a = signal(1)
    let computeCount = 0

    const c = computed(() => {
      computeCount++
      return a() * 2
    })

    // 读取一次
    c()
    expect(computeCount).toBe(1)

    // 更新依赖，如果没有活跃的 effect 订阅 computed，
    // computed 只是标记为 dirty，不会立即重新计算
    a.set(2)
    expect(computeCount).toBe(1) // 不应重新计算

    // 下次读取时才重新计算
    c()
    expect(computeCount).toBe(2)
  })
})

// ================================================================
//  集成测试
// ================================================================

describe('集成测试 (signal + computed + effect)', () => {
  it('完整的响应式链路', () => {
    const firstName = signal('John')
    const lastName = signal('Doe')
    const fullName = computed(() => `${firstName()} ${lastName()}`)
    const greeting = computed(() => `Hello, ${fullName()}!`)

    let displayed = ''
    const dispose = effect(() => {
      displayed = greeting()
    })

    expect(displayed).toBe('Hello, John Doe!')

    firstName.set('Jane')
    expect(displayed).toBe('Hello, Jane Doe!')

    lastName.set('Smith')
    expect(displayed).toBe('Hello, Jane Smith!')

    dispose()
  })

  it('computed 过滤 signal 列表', () => {
    const items = signal([1, 2, 3, 4, 5, 6])
    const threshold = signal(3)
    const filtered = computed(() => items().filter(x => x > threshold()))

    let result: number[] = []
    const dispose = effect(() => {
      result = filtered()
    })

    expect(result).toEqual([4, 5, 6])

    threshold.set(4)
    expect(result).toEqual([5, 6])

    items.set([10, 1, 2, 5])
    expect(result).toEqual([10, 5])

    dispose()
  })

  it('多个 effect 订阅同一个 signal', () => {
    const count = signal(0)
    let effect1Runs = 0
    let effect2Runs = 0

    const dispose1 = effect(() => {
      effect1Runs++
      void count()
    })

    const dispose2 = effect(() => {
      effect2Runs++
      void count()
    })

    expect(effect1Runs).toBe(1)
    expect(effect2Runs).toBe(1)

    count.set(1)
    expect(effect1Runs).toBe(2)
    expect(effect2Runs).toBe(2)

    dispose1()
    count.set(2)
    expect(effect1Runs).toBe(2) // 已销毁
    expect(effect2Runs).toBe(3) // 仍在运行

    dispose2()
  })

  it('effect 中使用 computed', () => {
    const a = signal(1)
    const b = signal(2)
    const sum = computed(() => a() + b())
    const doubled = computed(() => sum() * 2)

    let result = 0
    const dispose = effect(() => {
      result = doubled()
    })

    expect(result).toBe(6)

    a.set(10)
    expect(result).toBe(24)

    b.set(3)
    expect(result).toBe(26)

    dispose()
  })

  it('batch + computed + effect 集成', () => {
    const x = signal(1)
    const y = signal(2)
    const sum = computed(() => x() + y())
    let runs = 0
    let lastSum = 0

    const dispose = effect(() => {
      runs++
      lastSum = sum()
    })

    expect(runs).toBe(1)
    expect(lastSum).toBe(3)

    batch(() => {
      x.set(10)
      y.set(20)
      expect(runs).toBe(1) // batch 内不触发
    })

    expect(runs).toBe(2)
    expect(lastSum).toBe(30)

    dispose()
  })
})

// ================================================================
//  边界情况
// ================================================================

describe('边界情况', () => {
  it('读取已销毁 effect 的 signal 不应报错', () => {
    const count = signal(42)
    const dispose = effect(() => { void count() })
    dispose()

    // signal 本身仍然可用
    expect(count()).toBe(42)
    count.set(100)
    expect(count()).toBe(100)
  })

  it('computed 不应有 set 方法', () => {
    const a = signal(1)
    const c = computed(() => a() * 2)

    // ComputedSignal 不应有 set 方法
    expect((c as any).set).toBeUndefined()
    expect((c as any).update).toBeUndefined()
  })

  it('effect 可以不使用 onCleanup', () => {
    const count = signal(0)
    let runs = 0
    const dispose = effect(() => {
      runs++
      void count()
    })
    expect(runs).toBe(1)

    count.set(1)
    expect(runs).toBe(2)

    dispose()
  })

  it('空 effect 不应报错', () => {
    const dispose = effect(() => {
      // 空的 effect
    })
    dispose() // 不应报错
  })

  it('computed 依赖变化后重新计算应使用最新值', () => {
    const a = signal(1)
    const b = signal(10)
    const product = computed(() => a() * b())

    expect(product()).toBe(10)

    a.set(2)
    b.set(20) // 连续更新
    expect(product()).toBe(40)
  })

  it('signal update 中的函数应接收当前值', () => {
    const count = signal(5)
    count.update(prev => {
      expect(prev).toBe(5)
      return prev + 10
    })
    expect(count()).toBe(15)
  })

  it('大量 computed 链不应栈溢出', () => {
    const base = signal(1)
    let current: ComputedSignal<number> = computed(() => base() + 1)
    for (let i = 0; i < 100; i++) {
      const prev = current
      current = computed(() => prev() + 1)
    }
    expect(current()).toBe(102)
  })
})

// ================================================================
//  Signal 组件集成
// ================================================================

describe('Signal 组件集成', () => {
  it('useSignal 应返回 signal 的当前值', () => {
    const count = signal(42)
    expect(useSignal(count)).toBe(42)
  })

  it('useSignalState 应返回 signal 和 setter', () => {
    const [count, setCount] = useSignalState(0)
    expect(count()).toBe(0)
    setCount(10)
    expect(count()).toBe(10)
  })

  it('useSignalState setter 应正确更新值', () => {
    const [name, setName] = useSignalState('lyt')
    expect(name()).toBe('lyt')
    setName('lyt.js')
    expect(name()).toBe('lyt.js')
  })

  it('enterSignalComponentContext 应返回退出函数', () => {
    const exit = enterSignalComponentContext()
    let cleaned = false
    onSignalCleanup(() => { cleaned = true })
    expect(cleaned).toBe(false)
    exit()
    expect(cleaned).toBe(true)
  })

  it('嵌套组件上下文应独立', () => {
    let outerCleaned = false
    let innerCleaned = false

    const exitOuter = enterSignalComponentContext()
    onSignalCleanup(() => { outerCleaned = true })

    const exitInner = enterSignalComponentContext()
    onSignalCleanup(() => { innerCleaned = true })

    exitInner()
    expect(innerCleaned).toBe(true)
    expect(outerCleaned).toBe(false)

    exitOuter()
    expect(outerCleaned).toBe(true)
  })

  it('useSignalState 的 signal 应支持 update', () => {
    const [count] = useSignalState(5)
    count.update(prev => prev * 2)
    expect(count()).toBe(10)
  })
})
