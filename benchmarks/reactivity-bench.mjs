// benchmarks/reactivity-bench.mjs
// Lyt.js Reactivity 性能基准测试
// 运行方式: node --import ./e2e/loader.mjs benchmarks/reactivity-bench.mjs

const {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  signal,
  batch,
} = await import('../packages/reactivity/dist/index.mjs')

function bench(name, fn, iterations = 100000) {
  // warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = performance.now() - start
  const ops = (iterations / elapsed * 1000).toFixed(0)
  console.log(`  ${name}: ${ops} ops/sec (${elapsed.toFixed(2)}ms for ${iterations} iterations)`)
}

console.log('=== Reactivity Benchmarks ===')

// 1. ref 创建和读写（100 万次）
bench('ref 创建 (1M)', () => {
  ref(0)
}, 1000000)

const r = ref(0)
bench('ref 读取 (1M)', () => {
  const x = r.value
}, 1000000)

bench('ref 写入 (1M)', () => {
  r.value = 1
}, 1000000)

// 2. reactive 创建和读写（100 万次）
bench('reactive 创建 (1M)', () => {
  reactive({ count: 0, name: 'test' })
}, 1000000)

const state = reactive({ count: 0, name: 'hello' })
bench('reactive 读取 (1M)', () => {
  const x = state.count
}, 1000000)

bench('reactive 写入 (1M)', () => {
  state.count++
}, 1000000)

// 3. computed 依赖追踪（100 万次）
bench('computed 创建 (1M)', () => {
  const base = ref(1)
  computed(() => base.value * 2)
}, 1000000)

const cBase = ref(1)
const cDoubled = computed(() => cBase.value * 2)
bench('computed 求值 (1M)', () => {
  cBase.value++
  const x = cDoubled.value
}, 1000000)

// 4. watch 触发（10 万次）
bench('watch 创建 + 触发 (100K)', () => {
  const w = ref(0)
  watch(w, () => {})
  w.value++
}, 100000)

// 5. signal 创建和更新（100 万次）
bench('signal 创建 (1M)', () => {
  signal(0)
}, 1000000)

const s = signal(0)
bench('signal 读取 (1M)', () => {
  const x = s()
}, 1000000)

bench('signal 更新 (1M)', () => {
  s.set(1)
}, 1000000)

// 6. batch 批量更新（10 万次）
bench('batch 批量更新 (100K)', () => {
  const s1 = signal(0)
  const s2 = signal(0)
  const s3 = signal(0)
  batch(() => {
    s1.set(1)
    s2.set(2)
    s3.set(3)
  })
}, 100000)

console.log('\n=== Reactivity Benchmarks Complete ===')
