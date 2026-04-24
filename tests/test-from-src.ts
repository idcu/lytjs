#!/usr/bin/env node
/**
 * 验证所有包，直接从源文件导入
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('========================================')
console.log('  Lyt.js 包验证测试（从源文件）')
console.log('========================================\n')

const packages = [
  {
    name: 'reactivity',
    path: '../packages/reactivity/src/index.ts',
  },
  {
    name: 'vdom',
    path: '../packages/vdom/src/index.ts',
  },
  {
    name: 'renderer',
    path: '../packages/renderer/src/index.ts',
  },
  {
    name: 'component',
    path: '../packages/component/src/index.ts',
  },
  {
    name: 'core',
    path: '../packages/core/src/index.ts',
  },
  {
    name: 'router',
    path: '../packages/router/src/index.ts',
  },
  {
    name: 'store',
    path: '../packages/store/src/index.ts',
  },
  {
    name: 'devtools',
    path: '../packages/devtools/src/index.ts',
  },
  {
    name: 'components',
    path: '../packages/components/src/index.ts',
  },
]

let total = 0
let passed = 0
let failed = 0

for (const pkg of packages) {
  total++
  console.log(`Testing @lytjs/${pkg.name}...`)
  try {
    const fullPath = path.join(__dirname, pkg.path)
    const fileUrl = new URL(`file://${fullPath}`).href
    const module = await import(fileUrl)
    const exports = Object.keys(module)
    console.log(`  ✓ OK - ${exports.length} exports available`)
    console.log(`  Exports: ${exports.slice(0, 10).join(', ')}${exports.length > 10 ? '...' : ''}\n`)
    passed++
  } catch (e) {
    console.log(`  ✗ FAILED - ${e.message}\n`)
    failed++
  }
}

console.log('========================================')
console.log('  验证结果')
console.log('========================================')
console.log(`  Total: ${total}`)
console.log(`  ${total === passed ? '✓' : '✗'} Passed: ${passed}`)
if (failed > 0) console.log(`  ✗ Failed: ${failed}`)
console.log('========================================\n')

if (failed === 0) {
  console.log('🎉 所有包验证成功！\n')
  process.exit(0)
} else {
  console.log('⚠️  存在验证失败的包！\n')
  process.exit(1)
}
