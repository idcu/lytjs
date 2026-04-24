#!/usr/bin/env node
/**
 * 验证所有包的导出和基本功能
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('========================================')
console.log('  Lyt.js 包验证测试')
console.log('========================================\n')

const packages = [
  { name: 'reactivity', path: '../packages/reactivity/dist/index.mjs' },
  { name: 'vdom', path: '../packages/vdom/dist/index.mjs' },
  { name: 'renderer', path: '../packages/renderer/dist/index.mjs' },
  { name: 'component', path: '../packages/component/dist/index.mjs' },
  { name: 'core', path: '../packages/core/dist/index.mjs' },
  { name: 'router', path: '../packages/router/dist/index.mjs' },
  { name: 'store', path: '../packages/store/dist/index.mjs' },
  { name: 'devtools', path: '../packages/devtools/dist/index.mjs' },
  { name: 'components', path: '../packages/components/dist/index.mjs' },
]

let total = 0
let passed = 0
let failed = 0

for (const pkg of packages) {
  total++
  console.log(`Testing @lytjs/${pkg.name}...`)
  try {
    const module = await import(pkg.path)
    const exports = Object.keys(module)
    console.log(`  ✓ OK - ${exports.length} exports available`)
    console.log(`  Exports: ${exports.join(', ')}\n`)
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
