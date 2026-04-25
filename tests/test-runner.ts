
/**
 * Lyt.js 测试运行器
 *
 * 查找并运行 packages/* 下所有 __tests__ 目录中的测试文件
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// 导入 @lytjs/test-utils
import * as testUtils from '../packages/test-utils/src/index'

// 把测试框架挂载到 globalThis
;(globalThis as any).describe = testUtils.describe
;(globalThis as any).it = testUtils.it
;(globalThis as any).test = testUtils.test
;(globalThis as any).skip = testUtils.skip
;(globalThis as any).beforeEach = testUtils.beforeEach
;(globalThis as any).afterEach = testUtils.afterEach
;(globalThis as any).expect = testUtils.expect
;(globalThis as any).Assertion = testUtils.Assertion
;(globalThis as any).deepEqual = testUtils.deepEqual
;(globalThis as any).waitFor = testUtils.waitFor
;(globalThis as any).runAll = testUtils.runAll

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
  const result = await testUtils.runAll()
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('测试运行失败:', err)
  process.exit(1)
})
