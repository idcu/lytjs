#!/usr/bin/env node
/**
 * Lyt.js 单个测试文件运行器
 *
 * 使用示例：
 *   npx tsx test-one-file.ts packages/reactivity/__tests__/reactivity.test.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ================================================================
//  内联测试框架 (来自 @lytjs/test-utils)
// ================================================================

const suites = []
let currentSuite = null

function describe(name, fn) {
  const suite = {
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

function it(name, fn) {
  if (!currentSuite) {
    throw new Error('it must be called inside describe')
  }
  currentSuite.tests.push({ name, fn })
}

function test(name, fn) {
  it(name, fn)
}

function beforeEach(fn) {
  if (!currentSuite) {
    throw new Error('beforeEach must be called inside describe')
  }
  currentSuite.beforeEachFn.push(fn)
}

function afterEach(fn) {
  if (!currentSuite) {
    throw new Error('afterEach must be called inside describe')
  }
  currentSuite.afterEachFn.push(fn)
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

  console.log(`\n${COLOR.bold}${COLOR.cyan}=== Lyt.js Test Results ===${COLOR.reset}\n`)

  for (const suite of suites) {
    console.log(`${COLOR.bold}${suite.name}${COLOR.reset}`)

    for (const tc of suite.tests) {
      total++
      const start = performance.now()
      let status = 'passed'
      let error: Error | undefined

      try {
        const result = tc.fn()
        if (result instanceof Promise) await result
      } catch (e: any) {
        status = 'failed'
        failed++
        error = e
      }

      const duration = performance.now() - start
      if (status === 'passed') passed++

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

  console.log(`${COLOR.bold}=== Summary ===${COLOR.reset}`)
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

// 暴露全局变量
globalThis.describe = describe
globalThis.it = it
globalThis.test = test
globalThis.beforeEach = beforeEach
globalThis.afterEach = afterEach
globalThis.expect = expect

async function main() {
  const args = process.argv.slice(2)
  const testPath = args[0]

  if (!testPath) {
    console.error('Usage: npx tsx test-one-file.ts <test-file-path>')
    console.error('Example: npx tsx test-one-file.ts packages/reactivity/__tests__/reactivity.test.ts')
    process.exit(1)
  }

  const fullPath = path.isAbsolute(testPath) ? testPath : path.join(__dirname, testPath)

  if (!fs.existsSync(fullPath)) {
    console.error(`Test file not found: ${fullPath}`)
    process.exit(1)
  }

  console.log('========================================')
  console.log(`  Running test: ${path.basename(fullPath)}`)
  console.log('========================================')

  // 导入测试文件
  console.log(`\nImporting test file...\n`)
  const fileUrl = new URL(`file://${fullPath}`).href
  try {
    await import(fileUrl)
  } catch (e: any) {
    console.error(`Failed to import test file: ${e.message}`)
    process.exit(1)
  }

  // 运行测试
  const result = await runAll()
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
