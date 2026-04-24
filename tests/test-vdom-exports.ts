#!/usr/bin/env node
/**
 * 测试 vdom 包的导出
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('Testing vdom exports...')

// 直接从源文件导入
const vdomSrc = path.join(__dirname, '../packages', 'vdom', 'src', 'index.ts')
const vdomUrl = new URL(`file://${vdomSrc}`).href

try {
  const vdomModule = await import(vdomUrl)
  console.log('✓ Import successful from source!')
  
  const exports = Object.keys(vdomModule)
  console.log(`\nExports (${exports.length}):`)
  for (const exp of exports) {
    console.log(`  - ${exp}`)
  }

  const required = ['patchKeyedChildren', 'patchUnkeyedChildren', 'getSequence', 'registerDOMOperations']
  let allFound = true

  console.log('\nChecking required exports:')
  for (const req of required) {
    if (vdomModule[req]) {
      console.log(`  ✓ ${req} found`)
    } else {
      console.log(`  ✗ ${req} NOT found`)
      allFound = false
    }
  }

  if (allFound) {
    console.log('\n🎉 所有必要的导出都找到了！')
  } else {
    console.log('\n⚠️ 缺少必要的导出！')
  }

} catch (e) {
  console.error(`✗ Error importing: ${e.message}`)
}
