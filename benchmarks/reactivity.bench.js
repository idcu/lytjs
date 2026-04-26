/**
 * Lyt.js 响应式系统性能基准测试
 * 运行方式: node --experimental-vm-modules benchmarks/reactivity.bench.js
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { reactive, ref, computed, watch, watchEffect, signal } = require('../packages/reactivity/dist/index.cjs');

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

console.log('\nLyt.js 响应式系统基准测试\n')

// 1. reactive 创建
bench('reactive() 创建', () => {
  reactive({ count: 0, name: 'test', items: [1, 2, 3] })
})

// 2. ref 创建
bench('ref() 创建', () => {
  ref(0)
})

// 3. signal 创建
bench('signal() 创建', () => {
  signal(0)
})

// 4. 响应式读取
const state = reactive({ count: 0 })
bench('reactive 读取', () => {
  const x = state.count
})

// 5. 响应式写入
bench('reactive 写入', () => {
  state.count++
})

// 6. computed 创建
bench('computed() 创建', () => {
  const r = ref(1)
  computed(() => r.value * 2)
})

// 7. computed 求值
const base = ref(1)
const doubled = computed(() => base.value * 2)
bench('computed 求值', () => {
  base.value++
  const x = doubled.value
})

// 8. watch 触发
bench('watch 触发', () => {
  const r = ref(0)
  watch(r, () => {})
  r.value++
})

// 9. 大型响应式对象
bench('大型 reactive 对象 (100 属性)', () => {
  const obj = {}
  for (let i = 0; i < 100; i++) obj[`key${i}`] = i
  reactive(obj)
})

// 10. 深层响应式
bench('深层 reactive (5 层)', () => {
  reactive({
    a: { b: { c: { d: { e: 1 } } } },
  })
})

console.log('\n基准测试完成\n')
