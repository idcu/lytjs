#!/usr/bin/env node
/**
 * 直接测试 reactivity 包的核心功能
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('========================================')
console.log('  Reactivity 包直接功能测试')
console.log('========================================\n')

// 直接从源文件导入
const reactivityPath = path.join(__dirname, '../packages/reactivity/src/index.ts')
const reactivityUrl = new URL(`file://${reactivityPath}`).href
const {
  reactive,
  ref,
  computed,
  watch,
  watchEffect,
  isReactive,
  isRef,
  nextTick,
} = await import(reactivityUrl)

console.log('✅ 导入成功！')
console.log('')

let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => void | Promise<void>) {
  console.log(`测试: ${name}`)
  try {
    const result = fn()
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`  ✓ 通过\n`)
        testsPassed++
      }).catch(e => {
        console.log(`  ✗ 失败: ${e.message}\n`)
        testsFailed++
      })
    } else {
      console.log(`  ✓ 通过\n`)
      testsPassed++
    }
  } catch (e: any) {
    console.log(`  ✗ 失败: ${e.message}\n`)
    testsFailed++
  }
}

// 1. reactive 基本测试
test('reactive - 基本读写', () => {
  const state = reactive({ count: 0, name: 'lyt' })
  if (state.count !== 0) throw new Error('初始值不正确')
  if (state.name !== 'lyt') throw new Error('初始值不正确')
  state.count = 1
  state.name = 'hello'
  if (state.count !== 1) throw new Error('设置后值不正确')
  if (state.name !== 'hello') throw new Error('设置后值不正确')
})

test('reactive - isReactive 检查', () => {
  const state = reactive({ count: 0 })
  if (!isReactive(state)) throw new Error('应该是 reactive')
  const plain = { count: 0 }
  if (isReactive(plain)) throw new Error('不应该是 reactive')
})

test('reactive - 嵌套对象', () => {
  const state = reactive({
    user: {
      name: 'lyt',
      address: { city: 'shanghai' }
    }
  })
  if (!isReactive(state.user)) throw new Error('嵌套对象应该是 reactive')
  if (!isReactive(state.user.address)) throw new Error('深层嵌套对象应该是 reactive')
  state.user.address.city = 'beijing'
  if (state.user.address.city !== 'beijing') throw new Error('嵌套属性设置失败')
})

// 2. ref 测试
test('ref - 基本读写', () => {
  const count = ref(0)
  if (count.value !== 0) throw new Error('初始值不正确')
  if (!isRef(count)) throw new Error('应该是 ref')
  count.value = 100
  if (count.value !== 100) throw new Error('设置后值不正确')
})

test('ref - 对象自动 reactive', () => {
  const user = ref({ name: 'lyt' })
  if (!isReactive(user.value)) throw new Error('ref 对象应该被转为 reactive')
  user.value.name = 'hello'
  if (user.value.name !== 'hello') throw new Error('属性设置失败')
})

// 3. computed 测试
test('computed - 基本计算', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  if (double.value !== 0) throw new Error('初始计算值不正确')
  count.value = 5
  if (double.value !== 10) throw new Error('计算更新不正确')
})

test('computed - 缓存', () => {
  let computeCount = 0
  const count = ref(0)
  const double = computed(() => {
    computeCount++
    return count.value * 2
  })
  double.value // 第一次访问
  double.value // 第二次访问（应该不重新计算）
  if (computeCount !== 1) throw new Error('应该有缓存')
  count.value = 1
  double.value // 应该重新计算
  if (computeCount !== 2) throw new Error('依赖变化时应该重新计算')
})

// 4. watch 测试
test('watch - 基本监听', async () => {
  const count = ref(0)
  let watchTriggered = false
  let oldValue: number | undefined
  let newValue: number | undefined
  
  watch(count, (newVal, oldVal) => {
    watchTriggered = true
    newValue = newVal
    oldValue = oldVal
  })
  
  count.value = 1
  await nextTick()
  
  if (!watchTriggered) throw new Error('watch 应该被触发')
  if (oldValue !== 0) throw new Error('oldValue 不正确')
  if (newValue !== 1) throw new Error('newValue 不正确')
})

test('watchEffect - 自动收集依赖', async () => {
  const count = ref(0)
  let effectRunCount = 0
  
  watchEffect(() => {
    effectRunCount++
    count.value // 访问以收集依赖
  })
  
  if (effectRunCount !== 1) throw new Error('应该立即运行一次')
  
  count.value = 1
  await nextTick()
  
  if (effectRunCount !== 2) throw new Error('依赖变化时应该再次运行')
})

// 5. 数组操作
test('reactive - 数组操作', () => {
  const state = reactive({ items: [1, 2, 3] })
  if (state.items.length !== 3) throw new Error('初始长度不正确')
  state.items.push(4)
  if (state.items.length !== 4) throw new Error('push 后长度不正确')
  if (state.items[3] !== 4) throw new Error('push 的值不正确')
  state.items.splice(1, 1)
  if (state.items.length !== 3) throw new Error('splice 后长度不正确')
  if (state.items[1] !== 3) throw new Error('splice 后元素不正确')
})

console.log('========================================')
console.log('  测试结果汇总')
console.log('========================================')
console.log(`  通过: ${testsPassed}`)
console.log(`  失败: ${testsFailed}`)
console.log('========================================')

if (testsFailed === 0) {
  console.log('\n🎉 所有测试通过！Reactivity 包功能正常！\n')
  process.exit(0)
} else {
  console.log('\n⚠️  有测试失败！\n')
  process.exit(1)
}
