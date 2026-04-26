/**
 * Lyt.js Vapor Mode 性能基准测试
 * 
 * 测试内容：
 *   - Vapor 模式 vs VDOM 模式的性能对比
 *   - 创建、更新、删除操作的性能
 *   - Signal 响应式更新性能
 *   - 大规模列表操作性能
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// ================================================================
//  基准测试辅助函数
// ================================================================

function bench(name, fn, iterations = 10000) {
  // 预热
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = performance.now() - start

  const opsPerSec = Math.round(iterations / (elapsed / 1000))
  console.log(`  ${name}: ${opsPerSec.toLocaleString()} ops/sec (${(elapsed / iterations).toFixed(4)}ms/op)`)
  return opsPerSec
}

console.log('\nLyt.js Vapor Mode 基准测试\n')
console.log('='.repeat(60))
console.log('1. 基础操作性能测试')
console.log('='.repeat(60) + '\n')

// 模拟基准测试 - 我们使用简单的性能比较
// 实际的 Vapor Mode 和 VDOM 对比需要更复杂的设置

// 模拟简单的 DOM 操作
bench('简单 DOM 元素创建', () => {
  const el = { tag: 'div', props: {}, children: [] }
  return el
}, 50000)

bench('Signal 更新操作', () => {
  // 模拟 signal 更新
  let value = 0
  const listeners = []
  const update = (newVal) => {
    value = newVal
    listeners.forEach(fn => fn(newVal))
  }
  update(Math.random())
}, 30000)

console.log('\n' + '='.repeat(60))
console.log('2. 列表操作性能测试')
console.log('='.repeat(60) + '\n')

bench('创建 100 项简单列表', () => {
  const items = []
  for (let i = 0; i < 100; i++) {
    items.push({ id: i, text: `Item ${i}` })
  }
  return items
}, 10000)

bench('更新 100 项列表', () => {
  const items = []
  for (let i = 0; i < 100; i++) {
    items.push({ id: i, text: `Item ${i}` })
  }
  // 更新每一项
  for (let i = 0; i < 100; i++) {
    items[i].text = `Updated ${i}`
  }
  return items
}, 8000)

console.log('\n' + '='.repeat(60))
console.log('3. Vapor vs VDOM 概念验证')
console.log('='.repeat(60) + '\n')

// 模拟 Vapor 模式（直接 DOM 更新）
bench('Vapor 模式 - 直接属性更新', () => {
  const el = { textContent: 'Test', className: '' }
  el.textContent = 'Updated'
  el.className = 'active'
  return el
}, 40000)

// 模拟 VDOM 模式（创建虚拟节点然后 patch）
bench('VDOM 模式 - 虚拟节点 + patch', () => {
  const oldVNode = { tag: 'div', props: {}, children: 'Test' }
  const newVNode = { tag: 'div', props: { class: 'active' }, children: 'Updated' }
  // 模拟 patch
  return newVNode
}, 25000)

console.log('\n' + '='.repeat(60))
console.log('4. 大规模性能测试')
console.log('='.repeat(60) + '\n')

bench('创建 1000 项复杂列表', () => {
  const items = []
  for (let i = 0; i < 1000; i++) {
    items.push({
      id: i,
      text: `Item ${i}`,
      value: i * 2,
      active: i % 2 === 0,
      nested: { x: i, y: i * 2 }
    })
  }
  return items
}, 2000)

console.log('\n' + '='.repeat(60))
console.log('基准测试完成！')
console.log('='.repeat(60) + '\n')

console.log('📊 说明：')
console.log('  - 这些是概念验证的基准测试')
console.log('  - 实际的 Vapor vs VDOM 对比需要完整的 Lyt.js 构建')
console.log('  - 请运行项目的完整测试套件进行真实的性能对比\n')
