#!/usr/bin/env node
/**
 * Lyt.js 单包测试运行器
 *
 * 使用示例：
 *   npx tsx test-single-package.ts reactivity
 *   npx tsx test-single-package.ts vdom
 *   npx tsx test-single-package.ts renderer
 *   npx tsx test-single-package.ts components
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
    throw new Error('it must be called inside describe')
  }
  currentSuite.tests.push({ name, fn })
}

function test(name: string, fn: () => void | Promise<void>): void {
  it(name, fn)
}

function beforeEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('beforeEach must be called inside describe')
  }
  currentSuite.beforeEachFn!.push(fn)
}

function afterEach(fn: () => void): void {
  if (!currentSuite) {
    throw new Error('afterEach must be called inside describe')
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
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to be ${this._fmt(expected)}`)
  }

  toEqual(expected: any): void {
    const pass = this.negated
      ? !this._deepEqual(this.actual, expected)
      : this._deepEqual(this.actual, expected)
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to equal ${this._fmt(expected)}`)
  }

  toBeTruthy(): void {
    const pass = this.negated ? !this.actual : !!this.actual
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to be truthy`)
  }

  toBeFalsy(): void {
    const pass = this.negated ? !!this.actual : !this.actual
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to be falsy`)
  }

  toBeNull(): void {
    const pass = this.negated ? this.actual !== null : this.actual === null
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to be null`)
  }

  toBeUndefined(): void {
    const pass = this.negated ? this.actual !== undefined : this.actual === undefined
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to be undefined`)
  }

  toBeDefined(): void {
    const pass = this.negated ? this.actual === undefined : this.actual !== undefined
    this._assert(pass, `Expected value ${this.negated ? 'not ' : ''}to be defined`)
  }

  toContain(item: any): void {
    let pass: boolean
    if (typeof this.actual === 'string') {
      pass = this.actual.includes(item)
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.some(v => this._deepEqual(v, item))
    } else {
      pass = false
    }
    if (this.negated) pass = !pass
    this._assert(pass, `Expected ${this._fmt(this.actual)} ${this.negated ? 'not ' : ''}to contain ${this._fmt(item)}`)
  }

  toHaveLength(n: number): void {
    const len = this.actual?.length
    const pass = this.negated ? !(len === n) : len === n
    this._assert(pass, `Expected length ${n}, got ${len}`)
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

  private _deepEqual(a: any, b: any): boolean {
    if (Object.is(a, b)) return true
    if (a === null || b === null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false
        if (!this._deepEqual(a[key], b[key])) return false
      }
      return true
    }

    return false
  }
}

function expect(value: any): Assertion {
  return new Assertion(value)
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
}> {
  let total = 0, passed = 0, failed = 0

  console.log(`\n${COLOR.bold}${COLOR.cyan}=== Lyt.js Package Tests ===${COLOR.reset}\n`)

  for (const suite of suites) {
    console.log(`${COLOR.bold}${suite.name}${COLOR.reset}`)

    for (const tc of suite.tests) {
      total++
      const start = performance.now()

      if (suite.beforeEachFn) {
        for (const hook of suite.beforeEachFn) {
          try { hook() } catch (e: any) {
            console.warn(`  ${COLOR.yellow}[WARN] beforeEach error: ${e.message}${COLOR.reset}`)
          }
        }
      }

      let status = 'passed'
      let error: Error | undefined

      try {
        const result = tc.fn()
        if (result instanceof Promise) {
          await result
        }
      } catch (e: any) {
        status = 'failed'
        failed++
        error = e
      }

      const duration = performance.now() - start

      if (suite.afterEachFn) {
        for (const hook of suite.afterEachFn) {
          try { hook() } catch (e: any) {
            console.warn(`  ${COLOR.yellow}[WARN] afterEach error: ${e.message}${COLOR.reset}`)
          }
        }
      }

      if (status === 'passed') {
        passed++
      }

      const durationStr = duration < 1 ? '' : ` ${COLOR.gray}(${duration.toFixed(1)}ms)${COLOR.reset}`
      if (status === 'passed') {
        console.log(`  ${COLOR.green}[PASS]${COLOR.reset} ${tc.name}${durationStr}`)
      } else {
        console.log(`  ${COLOR.red}[FAIL]${COLOR.reset} ${tc.name}${durationStr}`)
        if (error) {
          console.log(`    ${COLOR.red}${error.message}${COLOR.reset}`)
        }
      }
    }

    console.log('')
  }

  console.log(`${COLOR.bold}=== Test Results ===${COLOR.reset}`)
  console.log(`  Total: ${total}`)
  console.log(`  ${COLOR.green}Passed: ${passed}${COLOR.reset}`)
  if (failed > 0) console.log(`  ${COLOR.red}Failed: ${failed}${COLOR.reset}`)
  console.log('')

  if (failed === 0) {
    console.log(`${COLOR.green}${COLOR.bold}All tests passed!${COLOR.reset}\n`)
  } else {
    console.log(`${COLOR.red}${COLOR.bold}Some tests failed!${COLOR.reset}\n`)
  }

  return { total, passed, failed }
}

// ================================================================
//  全局暴露测试框架
// ================================================================
globalThis.describe = describe
globalThis.it = it
globalThis.test = test
globalThis.beforeEach = beforeEach
globalThis.afterEach = afterEach
globalThis.expect = expect

// ================================================================
//  查找并导入指定包的测试文件
// ================================================================

async function main() {
  const args = process.argv.slice(2)
  const packageName = args[0]

  if (!packageName) {
    console.error('Usage: npx tsx test-single-package.ts <package-name>')
    console.error('Example: npx tsx test-single-package.ts reactivity')
    process.exit(1)
  }

  console.log('========================================')
  console.log(`  Running tests for @lytjs/${packageName}`)
  console.log('========================================')

  const testsDir = path.join(__dirname, '../packages', packageName, '__tests__')

  if (!fs.existsSync(testsDir)) {
    console.error(`Tests directory not found: ${testsDir}`)
    process.exit(1)
  }

  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'))

  if (testFiles.length === 0) {
    console.log('No test files found.')
    process.exit(0)
  }

  console.log(`Found ${testFiles.length} test files\n`)

  // 导入测试文件
  for (const file of testFiles) {
    console.log(`Importing: ${file}`)
    const fileUrl = new URL(`file://${path.join(testsDir, file)}`).href
    try {
      await import(fileUrl)
    } catch (e: any) {
      console.error(`  Failed to import: ${e.message}`)
    }
  }

  // 运行测试
  const result = await runAll()
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
