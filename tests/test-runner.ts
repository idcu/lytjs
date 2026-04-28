
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

// 导入 @lytjs/test-utils
import * as testUtils from '../packages/test-utils/src/index'

// 把测试框架挂载到 globalThis
const utils = testUtils.default || testUtils
;(globalThis as any).describe = utils.describe
;(globalThis as any).it = utils.it
;(globalThis as any).test = utils.test
;(globalThis as any).skip = utils.skip
;(globalThis as any).beforeEach = utils.beforeEach
;(globalThis as any).afterEach = utils.afterEach
;(globalThis as any).expect = utils.expect
;(globalThis as any).deepEqual = utils.deepEqual
;(globalThis as any).waitFor = utils.waitFor
;(globalThis as any).runAll = utils.runAll

// DOM mock for packages that need document (e.g. plugin-theme)
const mockStyleProps: Record<string, string> = {}

// HTMLElement / HTMLCanvasElement mock
if (!(globalThis as any).HTMLElement) {
  ;(globalThis as any).HTMLElement = class MockHTMLElement {
    style: Record<string, string> = {}
    children: any[] = []
    childNodes: any[] = []
    innerHTML = ''
    textContent = ''
    tagName = 'DIV'
    id = ''
    className = ''
    appendChild(child: any) { this.children.push(child); return child }
    removeChild(child: any) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); return child }
    setAttribute() {}
    getAttribute() { return null }
    hasAttribute() { return false }
    removeAttribute() {}
    addEventListener() {}
    removeEventListener() {}
    querySelector() { return null }
    querySelectorAll() { return [] }
    focus() {}
    classList = { add() {}, remove() {}, contains() { return false }, toggle() {} }
    parentNode: any = null
  }
}
if (!(globalThis as any).HTMLCanvasElement) {
  ;(globalThis as any).HTMLCanvasElement = class MockHTMLCanvasElement extends (globalThis as any).HTMLElement {
    width = 600
    height = 400
    getContext() {
      return {
        clearRect() {}, fillRect() {}, fillText() {}, strokeText() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        arc() {}, arcTo() {}, fill() {}, stroke() {}, rect() {},
        measureText() { return { width: 50 } },
        setTransform() {},
        fillStyle: '', strokeStyle: '', font: '', textAlign: '',
        textBaseline: '', lineWidth: 1, lineCap: '', lineJoin: '',
      }
    }
  }
}
const _prevDoc = (globalThis as any).document
;(globalThis as any).document = {
  documentElement: {
    style: {
      setProperty(key: string, value: string) { mockStyleProps[key] = value },
      getPropertyValue(key: string) { return mockStyleProps[key] || '' },
      removeProperty(key: string) { delete mockStyleProps[key] },
    },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null },
    hasAttribute() { return false },
    dataset: {},
  },
  createElement(tag: string) {
    return {
      tagName: tag.toUpperCase(),
      style: {
        setProperty(key: string, value: string) {},
        getPropertyValue(key: string) { return '' },
        removeProperty(key: string) {},
        cssText: '',
      },
      className: '',
      innerHTML: '',
      textContent: '',
      scrollTop: 0,
      clientHeight: 400,
      offsetHeight: 400,
      setAttribute() {},
      getAttribute() { return null },
      hasAttribute() { return false },
      appendChild() {},
      removeChild() {},
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null },
      querySelectorAll() { return [] },
      focus() {},
      classList: { add() {}, remove() {}, contains() { return false }, toggle() {} },
      childNodes: [],
      children: [],
      parentNode: null,
    }
  },
  head: { appendChild() {} },
  body: { appendChild() {} },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
  activeElement: null,
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} } },
  getElementById() { return null },
}

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
  const result = await utils.runAll()
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('测试运行失败:', err)
  process.exit(1)
})
