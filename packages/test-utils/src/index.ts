
/**
 * Lyt.js 统一测试框架
 *
 * 轻量级测试运行器和断言库，纯原生实现，零外部依赖。
 * 所有包的测试文件统一使用本模块提供的 describe/it/expect/runAll。
 *
 * 使用方式：
 * ```ts
 * import { describe, it, expect, runAll } from '@lytjs/test-utils'
 *
 * describe('我的模块', () => {
 *   it('应该正常工作', () => {
 *     expect(1 + 1).toBe(2)
 *   })
 * })
 *
 * runAll()
 * ```
 */

// ================================================================
//  类型定义
// ================================================================

interface TestCase {
  name: string
  fn: () => void | Promise<void>
}

interface TestResult {
  name: string
  suite: string
  status: 'passed' | 'failed' | 'skipped'
  error?: Error
  duration: number
}

interface TestSuite {
  name: string
  tests: TestCase[]
  beforeEachFn?: (() => void)[]
  afterEachFn?: (() => void)[]
}

// ================================================================
//  测试注册
// ================================================================

/** 全局测试套件列表 */
const suites: TestSuite[] = []

/** runAll 是否已执行过（防止重复执行） */
let hasRun = false

/** 当前正在定义的测试套件 */
let currentSuite: TestSuite | null = null

/**
 * 定义测试套件
 *
 * @param name 测试套件名称
 * @param fn   定义函数，内部使用 it/test 注册测试用例
 */
function describe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeEachFn: [],
    afterEachFn: [],
  }
  suites.push(suite)
  const prevSuite = currentSuite
  currentSuite = suite
  try {
    fn()
  } finally {
    currentSuite = prevSuite
  }
}

/**
 * 注册测试用例
 *
 * @param name 测试名称
 * @param fn   测试函数
 */
function it(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error(`it() 必须在 describe() 内部调用: "${name}"`)
  }
  currentSuite.tests.push({ name, fn })
}

/** it 的别名 */
function test(name: string, fn: () => void | Promise<void>): void {
  it(name, fn)
}

/**
 * 跳过测试用例
 *
 * @param name 测试名称
 * @param fn   测试函数（不会执行）
 */
function skip(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error(`skip() 必须在 describe() 内部调用: "${name}"`)
  }
  currentSuite.tests.push({
    name,
    fn: () => { throw new SkipError(name) },
  })
}

/** 跳过标记错误 */
class SkipError extends Error {
  constructor(name: string) {
    super(`SKIP: ${name}`)
    this.name = 'SkipError'
  }
}

/**
 * 注册前置钩子
 *
 * @param fn 每个测试用例执行前调用的函数
 */
function beforeEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('beforeEach() 必须在 describe() 内部调用')
  }
  currentSuite.beforeEachFn!.push(fn)
}

/**
 * 注册后置钩子
 *
 * @param fn 每个测试用例执行后调用的函数
 */
function afterEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('afterEach() 必须在 describe() 内部调用')
  }
  currentSuite.afterEachFn!.push(fn)
}

// ================================================================
//  断言库
// ================================================================

/**
 * Assertion 断言类
 *
 * 支持链式调用和 .not 取反。
 */
class Assertion {
  private actual: any
  private negated: boolean = false

  constructor(actual: any) {
    this.actual = actual
  }

  /** 取反后续断言 */
  get not(): Assertion {
    this.negated = !this.negated
    return this
  }

  /** 断言严格相等 (===) */
  toBe(expected: any): void {
    const pass = this.negated
      ? !Object.is(this.actual, expected)
      : Object.is(this.actual, expected)
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}等于 ${this._fmt(expected)}`)
  }

  /** 断言深度相等 */
  toEqual(expected: any): void {
    const pass = this.negated
      ? !deepEqual(this.actual, expected)
      : deepEqual(this.actual, expected)
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}深度等于 ${this._fmt(expected)}`)
  }

  /** 断言为真值 */
  toBeTruthy(): void {
    const pass = this.negated ? !this.actual : !!this.actual
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为真值`)
  }

  /** 断言为假值 */
  toBeFalsy(): void {
    const pass = this.negated ? !!this.actual : !this.actual
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为假值`)
  }

  /** 断言为 null */
  toBeNull(): void {
    const pass = this.negated ? this.actual !== null : this.actual === null
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为 null`)
  }

  /** 断言为 undefined */
  toBeUndefined(): void {
    const pass = this.negated ? this.actual !== undefined : this.actual === undefined
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}为 undefined`)
  }

  /** 断言不为 undefined（即已定义） */
  toBeDefined(): void {
    const pass = this.negated ? this.actual === undefined : this.actual !== undefined
    this._assert(pass, `期望值 ${this.negated ? '不' : ''}已定义`)
  }

  /** 断言函数抛出异常 */
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

  /** 断言数组/字符串包含指定项 */
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

  /** 断言数值大于 n */
  toBeGreaterThan(n: number): void {
    const pass = this.negated
      ? !(this.actual > n)
      : this.actual > n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}大于 ${n}`)
  }

  /** 断言数值小于 n */
  toBeLessThan(n: number): void {
    const pass = this.negated
      ? !(this.actual < n)
      : this.actual < n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}小于 ${n}`)
  }

  /** 断言数值大于等于 n */
  toBeGreaterThanOrEqual(n: number): void {
    const pass = this.negated
      ? !(this.actual >= n)
      : this.actual >= n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}大于等于 ${n}`)
  }

  /** 断言数值小于等于 n */
  toBeLessThanOrEqual(n: number): void {
    const pass = this.negated
      ? !(this.actual <= n)
      : this.actual <= n
    this._assert(pass, `期望 ${this._fmt(this.actual)} ${this.negated ? '不' : ''}小于等于 ${n}`)
  }

  /** 断言数组/字符串长度为 n */
  toHaveLength(n: number): void {
    const len = this.actual?.length
    const pass = this.negated
      ? !(len === n)
      : len === n
    this._assert(pass, `期望长度为 ${n}，实际为 ${len}`)
  }

  /** 内部断言方法 */
  private _assert(pass: boolean, message: string): void {
    if (!pass) {
      throw new AssertionError(message)
    }
  }

  /** 格式化值用于错误消息 */
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

/** 断言错误 */
class AssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}

/**
 * 创建断言
 *
 * @param value 要断言的值
 * @returns Assertion 实例
 */
function expect(value: any): Assertion {
  return new Assertion(value)
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
function deepEqual(a: any, b: any): boolean {
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
function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ================================================================
//  运行器
// ================================================================

/** ANSI 颜色码 */
const COLOR = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
}

/**
 * 运行所有已注册的测试套件
 *
 * 按注册顺序执行所有 describe 中的测试用例，
 * 收集结果并输出格式化报告。
 *
 * @returns 测试结果汇总
 */
async function runAll(): Promise<{
  total: number
  passed: number
  failed: number
  skipped: number
  results: TestResult[]
}> {
  const results: TestResult[] = []
  let total = 0
  let passed = 0
  let failed = 0
  let skipped = 0

  console.log(`\n${COLOR.bold}${COLOR.cyan}=== Lyt.js 测试运行器 ===${COLOR.reset}\n`)

  for (const suite of suites) {
    console.log(`${COLOR.bold}${suite.name}${COLOR.reset}`)

    for (const tc of suite.tests) {
      total++
      const start = performance.now()

      if (suite.beforeEachFn) {
        for (const hook of suite.beforeEachFn) {
          try { hook() } catch (err: any) {
            console.warn(`  ${COLOR.yellow}[WARN] beforeEach 出错: ${err.message}${COLOR.reset}`)
          }
        }
      }

      let status: TestResult['status'] = 'passed'
      let error: Error | undefined

      try {
        const result = tc.fn()
        if (result instanceof Promise) {
          await result
        }
      } catch (err: any) {
        if (err instanceof SkipError) {
          status = 'skipped'
          skipped++
        } else {
          status = 'failed'
          failed++
          error = err
        }
      }

      const duration = performance.now() - start

      if (suite.afterEachFn) {
        for (const hook of suite.afterEachFn) {
          try { hook() } catch (err: any) {
            console.warn(`  ${COLOR.yellow}[WARN] afterEach 出错: ${err.message}${COLOR.reset}`)
          }
        }
      }

      if (status === 'passed') {
        passed++
      }

      const result: TestResult = { name: tc.name, suite: suite.name, status, error, duration }
      results.push(result)

      const durationStr = duration < 1 ? '' : ` ${COLOR.gray}(${duration.toFixed(1)}ms)${COLOR.reset}`
      if (status === 'passed') {
        console.log(`  ${COLOR.green}[PASS]${COLOR.reset} ${tc.name}${durationStr}`)
      } else if (status === 'skipped') {
        console.log(`  ${COLOR.yellow}[SKIP]${COLOR.reset} ${tc.name}${durationStr}`)
      } else {
        console.log(`  ${COLOR.red}[FAIL]${COLOR.reset} ${tc.name}${durationStr}`)
        if (error) {
          console.log(`    ${COLOR.red}${error.message}${COLOR.reset}`)
        }
      }
    }

    console.log('')
  }

  console.log(`${COLOR.bold}=== 测试结果 ===${COLOR.reset}`)
  console.log(`  总计: ${total}`)
  console.log(`  ${COLOR.green}通过: ${passed}${COLOR.reset}`)
  if (failed > 0) console.log(`  ${COLOR.red}失败: ${failed}${COLOR.reset}`)
  if (skipped > 0) console.log(`  ${COLOR.yellow}跳过: ${skipped}${COLOR.reset}`)
  console.log('')

  if (failed === 0) {
    console.log(`${COLOR.green}${COLOR.bold}所有测试通过!${COLOR.reset}\n`)
  } else {
    console.log(`${COLOR.red}${COLOR.bold}存在失败的测试!${COLOR.reset}\n`)
  }

  suites.length = 0

  return { total, passed, failed, skipped, results }
}

export {
  describe,
  it,
  test,
  skip,
  beforeEach,
  afterEach,
  expect,
  Assertion,
  deepEqual,
  waitFor,
  runAll,
  type TestCase,
  type TestResult,
  type TestSuite,
}

