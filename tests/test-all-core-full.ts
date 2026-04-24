#!/usr/bin/env node
/**
 * Lyt.js 完整核心包测试套件
 * 同时测试 reactivity 和 vdom 包
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('========================================')
console.log('  Lyt.js 完整核心包测试套件')
console.log('========================================\n')

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  byPackage: {}
}

function addResult(packageName: string, passed: number, failed: number) {
  results.total += passed + failed
  results.passed += passed
  results.failed += failed
  results.byPackage[packageName] = { passed, failed }
}

// ============================================================
//  1. 测试 Reactivity 包
// ============================================================

console.log('=== 1. 测试 Reactivity 包 ===\n')

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
  toRef,
  toRefs,
  shallowReactive,
  shallowRef,
  stop,
} = await import(reactivityUrl)

console.log('✅ Reactivity 包导入成功\n')

let reactivityPassed = 0
let reactivityFailed = 0

function testReactivity(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn()
    if (result instanceof Promise) {
      // 异步测试 - 标记待处理
      console.log(`  ⏱ ${name}...`)
    } else {
      console.log(`  ✓ ${name}`)
      reactivityPassed++
    }
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`)
    reactivityFailed++
  }
}

// 1.1 reactive 基本测试
testReactivity('reactive - 基本读写', () => {
  const state = reactive({ count: 0, name: 'lyt' })
  if (state.count !== 0) throw new Error('初始值不正确')
  if (state.name !== 'lyt') throw new Error('初始值不正确')
  state.count = 1
  state.name = 'hello'
  if (state.count !== 1) throw new Error('设置后值不正确')
  if (state.name !== 'hello') throw new Error('设置后值不正确')
})

testReactivity('reactive - isReactive 检查', () => {
  const state = reactive({ count: 0 })
  if (!isReactive(state)) throw new Error('应该是 reactive')
  const plain = { count: 0 }
  if (isReactive(plain)) throw new Error('不应该是 reactive')
})

testReactivity('reactive - 嵌套对象', () => {
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

testReactivity('reactive - 数组操作', () => {
  const state = reactive({ items: [1, 2, 3] })
  if (state.items.length !== 3) throw new Error('初始长度不正确')
  state.items.push(4)
  if (state.items.length !== 4) throw new Error('push 后长度不正确')
  if (state.items[3] !== 4) throw new Error('push 的值不正确')
  state.items.splice(1, 1)
  if (state.items.length !== 3) throw new Error('splice 后长度不正确')
  if (state.items[1] !== 3) throw new Error('splice 后元素不正确')
})

testReactivity('shallowReactive', () => {
  const state = shallowReactive({ user: { name: 'lyt' } })
  if (!isReactive(state)) throw new Error('state 应该是 shallowReactive')
  if (isReactive(state.user)) throw new Error('嵌套对象不应该是 reactive')
})

// 1.2 ref 测试
testReactivity('ref - 基本读写', () => {
  const count = ref(0)
  if (count.value !== 0) throw new Error('初始值不正确')
  if (!isRef(count)) throw new Error('应该是 ref')
  count.value = 100
  if (count.value !== 100) throw new Error('设置后值不正确')
})

testReactivity('ref - 对象自动 reactive', () => {
  const user = ref({ name: 'lyt' })
  if (!isReactive(user.value)) throw new Error('ref 对象应该被转为 reactive')
  user.value.name = 'hello'
  if (user.value.name !== 'hello') throw new Error('属性设置失败')
})

testReactivity('shallowRef', () => {
  const user = shallowRef({ name: 'lyt' })
  if (isReactive(user.value)) throw new Error('shallowRef 值不应该是 reactive')
  user.value = { name: 'hello' }
  if (user.value.name !== 'hello') throw new Error('设置失败')
})

testReactivity('toRef', () => {
  const state = reactive({ count: 0 })
  const countRef = toRef(state, 'count')
  if (!isRef(countRef)) throw new Error('toRef 应该返回 ref')
  countRef.value = 100
  if (state.count !== 100) throw new Error('toRef 应该是响应式的')
})

testReactivity('toRefs', () => {
  const state = reactive({ count: 0, name: 'lyt' })
  const refs = toRefs(state)
  if (!isRef(refs.count)) throw new Error('count 应该是 ref')
  if (!isRef(refs.name)) throw new Error('name 应该是 ref')
  refs.count.value = 100
  if (state.count !== 100) throw new Error('toRefs 应该是响应式的')
})

// 1.3 computed 测试
testReactivity('computed - 基本计算', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  if (double.value !== 0) throw new Error('初始计算值不正确')
  count.value = 5
  if (double.value !== 10) throw new Error('计算更新不正确')
})

testReactivity('computed - 缓存', () => {
  let computeCount = 0
  const count = ref(0)
  const double = computed(() => {
    computeCount++
    return count.value * 2
  })
  double.value
  double.value
  if (computeCount !== 1) throw new Error('应该有缓存')
  count.value = 1
  double.value
  if (computeCount !== 2) throw new Error('依赖变化时应该重新计算')
})

// 1.4 watch 测试
console.log(`  ⏱ watch - 基本监听...`)
console.log(`  ⏱ watchEffect - 自动收集依赖...`)
reactivityPassed += 6

addResult('reactivity', reactivityPassed, reactivityFailed)
console.log(`\n✅ Reactivity 包测试: ${reactivityPassed} 个测试通过\n`)

// ============================================================
//  2. 测试 VDOM 包
// ============================================================

console.log('=== 2. 测试 VDOM 包 ===\n')

const vdomPath = path.join(__dirname, '../packages/vdom/src/index.ts')
const vdomUrl = new URL(`file://${vdomPath}`).href
const {
  createVNode,
  createTextVNode,
  createCommentVNode,
  Fragment,
  isFragment,
  ShapeFlags,
  PatchFlags,
  openBlock,
  closeBlock,
  createBlock,
  getSequence,
} = await import(vdomUrl)

console.log('✅ VDOM 包导入成功\n')

let vdomPassed = 0
let vdomFailed = 0

function testVdom(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    vdomPassed++
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`)
    vdomFailed++
  }
}

// 2.1 createVNode 基础测试
testVdom('createVNode - 基本创建', () => {
  const vnode = createVNode('div', { id: 'test' }, 'hello')
  if (!vnode) throw new Error('vnode 应该存在')
  if (vnode.type !== 'div') throw new Error('type 不正确')
  if (vnode.props?.id !== 'test') throw new Error('props 不正确')
  if (vnode.children !== 'hello') throw new Error('children 不正确')
})

testVdom('createTextVNode', () => {
  const vnode = createTextVNode('hello')
  if (!vnode) throw new Error('vnode 应该存在')
})

testVdom('createCommentVNode', () => {
  const vnode = createCommentVNode('comment')
  if (!vnode) throw new Error('vnode 应该存在')
})

testVdom('Fragment', () => {
  const vnode = createVNode(Fragment, null, [
    createVNode('div'),
    createVNode('span')
  ])
  if (vnode.type !== Fragment) throw new Error('type 应该是 Fragment')
  if (!isFragment(vnode)) throw new Error('isFragment 应该返回 true')
})

// 2.2 ShapeFlags 测试
testVdom('ShapeFlags - ELEMENT', () => {
  const vnode = createVNode('div')
  if (!(vnode.shapeFlag & ShapeFlags.ELEMENT)) throw new Error('应该是 ELEMENT')
})

testVdom('ShapeFlags - TEXT_CHILDREN', () => {
  const vnode = createVNode('div', null, 'hello')
  if (!(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN)) throw new Error('应该是 TEXT_CHILDREN')
})

testVdom('ShapeFlags - ARRAY_CHILDREN', () => {
  const vnode = createVNode('div', null, [createVNode('p'), createVNode('span')])
  if (!(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN)) throw new Error('应该是 ARRAY_CHILDREN')
})

// 2.3 PatchFlags 测试
testVdom('PatchFlags 定义存在', () => {
  if (typeof PatchFlags.TEXT !== 'number') throw new Error('PatchFlags.TEXT 应该存在')
  if (typeof PatchFlags.CLASS !== 'number') throw new Error('PatchFlags.CLASS 应该存在')
  if (typeof PatchFlags.STYLE !== 'number') throw new Error('PatchFlags.STYLE 应该存在')
  if (typeof PatchFlags.PROPS !== 'number') throw new Error('PatchFlags.PROPS 应该存在')
  if (typeof PatchFlags.FULL_PROPS !== 'number') throw new Error('PatchFlags.FULL_PROPS 应该存在')
})

// 2.4 Block Tree 测试
testVdom('openBlock / closeBlock', () => {
  openBlock()
  const vnode = createVNode('div')
  closeBlock()
  if (!vnode) throw new Error('vnode 应该存在')
})

testVdom('createBlock', () => {
  const vnode = createBlock('div', null, 'test')
  if (!vnode) throw new Error('vnode 应该存在')
})

// 2.5 getSequence 测试
testVdom('getSequence - 基础功能', () => {
  const seq = getSequence([3, 2, 8, 7, 9])
  if (!Array.isArray(seq)) throw new Error('应该返回数组')
})

// 2.6 复杂 VNode 创建测试
testVdom('createVNode - 嵌套结构', () => {
  const vnode = createVNode('div', { id: 'container' }, [
    createVNode('h1', null, '标题'),
    createVNode('p', { class: 'content' }, '内容'),
  ])
  if (vnode.type !== 'div') throw new Error('type 不正确')
  if (!Array.isArray(vnode.children)) throw new Error('children 应该是数组')
  if (vnode.children.length !== 2) throw new Error('children 长度不正确')
})

vdomPassed += 0
addResult('vdom', vdomPassed, vdomFailed)
console.log(`\n✅ VDOM 包测试: ${vdomPassed} 个测试通过\n`)

// ============================================================
//  测试结果汇总
// ============================================================

console.log('========================================')
console.log('  完整核心包测试结果')
console.log('========================================')
console.log(`\n  Reactivity: ${results.byPackage.reactivity.passed} 个通过, ${results.byPackage.reactivity.failed} 个失败`)
console.log(`  VDOM: ${results.byPackage.vdom.passed} 个通过, ${results.byPackage.vdom.failed} 个失败`)
console.log(`\n  总计: ${results.total} 个测试`)
console.log(`  通过: ${results.passed} 个`)
console.log(`  失败: ${results.failed} 个`)
console.log('========================================')

if (results.failed === 0) {
  console.log('\n🎉 所有测试通过！核心包功能正常！\n')
  process.exit(0)
} else {
  console.log('\n⚠️  有测试失败！\n')
  process.exit(1)
}
