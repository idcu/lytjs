
/**
 * Lyt.js 统一测试框架
 *
 * 在 vitest 环境下，代理到 vitest 的 describe/it/expect。
 * 同时保留自定义的断言扩展（toBeInstanceOf 等）和工具函数。
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
//  从 vitest 导入核心测试 API
// ================================================================

export {
  describe,
  it,
  test,
  skip,
  beforeEach,
  afterEach,
  expect,
  vi,
} from 'vitest'

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
//  类型定义（向后兼容）
// ================================================================

export interface TestCase {
  name: string
  fn: () => void | Promise<void>
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

/**
 * @deprecated 使用 vitest 的 describe/it/expect 代替
 * 保留此函数以向后兼容，但在 vitest 环境下为空操作
 */
export async function runAll(): Promise<{
  total: number
  passed: number
  failed: number
  skipped: number
  results: TestResult[]
}> {
  return { total: 0, passed: 0, failed: 0, skipped: 0, results: [] }
}

/**
 * Assertion 类 - 保留以向后兼容
 * @deprecated 直接使用 vitest 的 expect
 */
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
