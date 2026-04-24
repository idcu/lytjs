
/**
 * Lyt.js 测试运行器
 *
 * 查找并运行 packages/* 下所有 __tests__ 目录中的测试文件
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ================================================================
//  内联测试框架 (来自 @lytjs/test-utils)
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

const suites: TestSuite[] = []
let hasRun = false
let currentSuite: TestSuite | null = null

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

function it(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error(`it() 必须在 describe() 内部调用: "${name}"`)
  }
  currentSuite.tests.push({ name, fn })
}

function test(name: string, fn: () => void | Promise<void>): void {
  it(name, fn)
}

function skip(name: string, fn: () => void | Promise<void>): void {
  if (!currentSuite) {
    throw new Error(`skip() 必须在 describe() 内部调用: "${name}"`)
  }
  currentSuite.tests.push({
    name,
    fn: () => { throw new SkipError(name) },
  })
}

class SkipError extends Error {
  constructor(name: string) {
    super(`SKIP: ${name}`)
    this.name = 'SkipError'
  }
}

function beforeEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('beforeEach() 必须在 describe() 内部调用')
  }
  currentSuite.beforeEachFn!.push(fn)
}

function afterEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('afterEach() 必须在 describe() 内部调用')
  }
  currentSuite.afterEachFn!.push(fn)
}

class Assertion {
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
      throw new AssertionError(message)
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

class AssertionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionError'
  }
}

function expect(value: any): Assertion {
  return new Assertion(value)
}

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

function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const COLOR = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
}

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

// ================================================================
//  全局暴露测试框架
// ================================================================
;(globalThis as any).describe = describe
;(globalThis as any).it = it
;(globalThis as any).test = test
;(globalThis as any).skip = skip
;(globalThis as any).beforeEach = beforeEach
;(globalThis as any).afterEach = afterEach
;(globalThis as any).expect = expect
;(globalThis as any).Assertion = Assertion
;(globalThis as any).deepEqual = deepEqual
;(globalThis as any).waitFor = waitFor

// ================================================================
//  查找并导入测试文件
// ================================================================

async function main() {
  const packagesDir = path.join(__dirname, '../packages')
  const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

  const testFiles: string[] = []
  for (const pkg of packages) {
    const testsDir = path.join(packagesDir, pkg, '__tests__')
    if (fs.existsSync(testsDir)) {
      const files = fs.readdirSync(testsDir)
        .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'))
        .map(f => path.join(testsDir, f))
      testFiles.push(...files)
    }
  }

  console.log(`找到 ${testFiles.length} 个测试文件\n`)

  // 导入测试文件
  for (const file of testFiles) {
    console.log(`导入: ${path.basename(file)}`)
    const fileUrl = new URL(`file://${file}`).href
    try {
      await import(fileUrl)
    } catch (e: any) {
      console.error(`  导入失败: ${e.message}`)
    }
  }

  // 运行所有测试
  const result = await runAll()
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('测试运行失败:', err)
  process.exit(1)
})
