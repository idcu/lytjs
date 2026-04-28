
/**
 * Lyt.js 统一测试框架
 *
 * 自定义轻量级测试框架，用于 Node.js 环境下运行测试。
 * 由 test-runner.ts 统一调度，通过 globalThis 挂载到全局。
 *
 * 使用方式：
 * ```ts
 * import { describe, it, expect } from '@lytjs/test-utils'
 *
 * describe('我的模块', () => {
 *   it('应该正常工作', () => {
 *     expect(1 + 1).toBe(2)
 *   })
 * })
 * ```
 */

// ================================================================
//  类型定义
// ================================================================

export interface TestCase {
  name: string
  fn: () => void | Promise<void>
  skipped?: boolean
}

export interface TestResult {
  name: string
  suite: string
  status: 'passed' | 'failed' | 'skipped'
  error?: Error
  duration: number
}

export interface TestSuite {
  name: string
  tests: TestCase[]
  beforeEachFn?: (() => void)[]
  afterEachFn?: (() => void)[]
}

// ================================================================
//  测试注册
// ================================================================

const suites: TestSuite[] = []
let currentSuite: TestSuite | null = null

/**
 * 注册一个测试套件
 */
export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = { name, tests: [], beforeEachFn: [], afterEachFn: [] }
  const prev = currentSuite
  currentSuite = suite
  fn()
  currentSuite = prev
  suites.push(suite)
}

/**
 * 注册一个测试用例
 */
export function it(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) throw new Error('it() must be called inside describe()')
  currentSuite.tests.push({ name, fn })
}

/**
 * test 是 it 的别名
 */
export const test = it

/**
 * 跳过一个测试用例
 */
export function skip(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) throw new Error('skip() must be called inside describe()')
  currentSuite.tests.push({ name, fn, skipped: true })
}

/**
 * 注册 beforeEach 钩子
 */
export function beforeEach(fn: () => void): void {
  currentSuite?.beforeEachFn?.push(fn)
}

/**
 * 注册 afterEach 钩子
 */
export function afterEach(fn: () => void): void {
  currentSuite?.afterEachFn?.push(fn)
}

// ================================================================
//  断言
// ================================================================

/**
 * 创建一个断言对象
 */
export function expect(actual: any): Assertion {
  return new Assertion(actual)
}

// ================================================================
//  工具函数
// ================================================================

/**
 * 深度比较两个值
 *
 * @param a 第一个值
 * @param b 第二个值
 * @returns 是否深度相等
 */
export function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false

  if (typeof a === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

/**
 * 等待指定毫秒数
 *
 * @param ms 等待时间（毫秒）
 * @returns Promise
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ================================================================
//  测试运行器
// ================================================================

/**
 * 运行所有已注册的测试套件
 */
export async function runAll(): Promise<{
  total: number
  passed: number
  failed: number
  skipped: number
  results: TestResult[]
}> {
  const results: TestResult[] = []
  let passed = 0
  let failed = 0
  let skipped = 0

  for (const suite of suites) {
    for (const testCase of suite.tests) {
      if (testCase.skipped) {
        skipped++
        results.push({
          name: testCase.name,
          suite: suite.name,
          status: 'skipped',
          duration: 0,
        })
        console.log(`  \x1b[33m\u2298 SKIP\x1b[0m ${suite.name} > ${testCase.name}`)
        continue
      }

      const start = Date.now()
      try {
        // 运行 beforeEach 钩子
        if (suite.beforeEachFn) {
          for (const hook of suite.beforeEachFn) {
            hook()
          }
        }

        // 运行测试
        const result = testCase.fn()
        if (result instanceof Promise) {
          await result
        }

        // 运行 afterEach 钩子
        if (suite.afterEachFn) {
          for (const hook of suite.afterEachFn) {
            hook()
          }
        }

        const duration = Date.now() - start
        passed++
        results.push({
          name: testCase.name,
          suite: suite.name,
          status: 'passed',
          duration,
        })
        console.log(`  \x1b[32m\u2713 PASS\x1b[0m ${suite.name} > ${testCase.name} (${duration}ms)`)
      } catch (err: any) {
        const duration = Date.now() - start
        failed++
        results.push({
          name: testCase.name,
          suite: suite.name,
          status: 'failed',
          error: err,
          duration,
        })
        console.log(`  \x1b[31m\u2717 FAIL\x1b[0m ${suite.name} > ${testCase.name}`)
        console.log(`    \x1b[31m${err.message}\x1b[0m`)
      }
    }
  }

  // 清空已运行的测试套件，支持多次调用
  suites.length = 0

  // 输出汇总
  console.log('')
  console.log(`--- 测试结果: ${passed} 通过, ${failed} 失败, ${skipped} 跳过, 共 ${passed + failed + skipped} 个 ---`)
  console.log('')

  return { total: passed + failed + skipped, passed, failed, skipped, results }
}

// ================================================================
//  Assertion 类
// ================================================================

export class Assertion {
  private actual: any
  private negated: boolean = false

  constructor(actual: any) {
    this.actual = actual
  }

  get not(): Assertion {
    this.negated = !this.negated
    return this
  }

  toBe(expected: any): void {
    const pass = this.negated
      ? !Object.is(this.actual, expected)
      : Object.is(this.actual, expected)
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}等于 ${this._fmt(expected)}`)
  }

  toEqual(expected: any): void {
    const pass = this.negated
      ? !deepEqual(this.actual, expected)
      : deepEqual(this.actual, expected)
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}深度等于 ${this._fmt(expected)}`)
  }

  toBeTruthy(): void {
    const pass = this.negated ? !this.actual : !!this.actual
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为真值`)
  }

  toBeFalsy(): void {
    const pass = this.negated ? !!this.actual : !this.actual
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为假值`)
  }

  toBeNull(): void {
    const pass = this.negated ? this.actual !== null : this.actual === null
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为 null`)
  }

  toBeUndefined(): void {
    const pass = this.negated ? this.actual !== undefined : this.actual === undefined
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为 undefined`)
  }

  toBeDefined(): void {
    const pass = this.negated ? this.actual === undefined : this.actual !== undefined
    this._assert(pass, `期望值 ${this.negated ? '不' : ''}已定义`)
  }

  toThrow(message?: string): void {
    let threw = false
    let errorMsg = ''
    try {
      if (typeof this.actual === 'function') {
        this.actual()
      } else {
        throw new Error('toThrow() 的实际值必须是函数')
      }
    } catch (err: any) {
      threw = true
      errorMsg = err.message || String(err)
    }
    let pass = this.negated ? !threw : threw
    if (pass && threw && message && !this.negated) {
      pass = errorMsg.includes(message)
    }
    this._assert(pass, `期望函数${this.negated ? '不' : ''}抛出异常${message ? ` (包含 "${message}")` : ''}`)
  }

  toContain(item: any): void {
    let pass: boolean
    if (typeof this.actual === 'string') {
      pass = this.actual.includes(item)
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.some(v => deepEqual(v, item))
    } else {
      pass = false
    }
    if (this.negated) pass = !pass
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}包含 ${this._fmt(item)}`)
  }

  toBeGreaterThan(n: number): void {
    const pass = this.negated
      ? !(this.actual > n)
      : this.actual > n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}大于 ${n}`)
  }

  toBeLessThan(n: number): void {
    const pass = this.negated
      ? !(this.actual < n)
      : this.actual < n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}小于 ${n}`)
  }

  toBeGreaterThanOrEqual(n: number): void {
    const pass = this.negated
      ? !(this.actual >= n)
      : this.actual >= n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}大于等于 ${n}`)
  }

  toBeLessThanOrEqual(n: number): void {
    const pass = this.negated
      ? !(this.actual <= n)
      : this.actual <= n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}小于等于 ${n}`)
  }

  toHaveLength(n: number): void {
    const len = this.actual?.length
    const pass = this.negated
      ? !(len === n)
      : len === n
    this._assert(pass, `期望长度为 ${n}，实际为 ${len}`)
  }

  toBeInstanceOf(cls: any): void {
    const pass = this.negated
      ? !(this.actual instanceof cls)
      : this.actual instanceof cls
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}是 ${cls.name} 的实例`)
  }

  toHaveProperty(path: string, value?: any): void {
    const parts = path.split('.')
    let current = this.actual
    let found = true
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        found = false
        break
      }
      current = current[part]
    }
    if (value !== undefined) {
      const pass = this.negated ? !(found && Object.is(current, value)) : (found && Object.is(current, value))
      this._assert(pass, `期望对象${this.negated ? '不' : ''}包含属性 "${path}" 值为 ${this._fmt(value)}`)
    } else {
      const pass = this.negated ? !found : found
      this._assert(pass, `期望对象${this.negated ? '不' : ''}包含属性 "${path}"`)
    }
  }

  private _assert(pass: boolean, message: string): void {
    if (!pass) {
      throw new Error(message)
    }
  }

  private _fmt(val: any): string {
    if (val === null) return 'null'
    if (val === undefined) return 'undefined'
    if (typeof val === 'string') return `"${val}"`
    if (typeof val === 'function') return '[Function]'
    if (Array.isArray(val)) {
      try { return JSON.stringify(val) } catch { return '[Array]' }
    }
    if (typeof val === 'object') {
      try { return JSON.stringify(val) } catch { return '[Object]' }
    }
    return String(val)
  }
}
