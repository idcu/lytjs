#!/usr/bin/env node
/**
 * 直接测试 vdom 包的核心功能
 */

import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('========================================')
console.log('  VDOM 包直接功能测试')
console.log('========================================\n')

// 直接从源文件导入
const vdomPath = path.join(__dirname, '../packages/vdom/src/index.ts')
const vdomUrl = new URL(`file://${vdomPath}`).href
const {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  isSameVNodeType,
  normalizeChildren,
  Fragment,
  isFragment,
  PatchFlags,
  ShapeFlags,
  createBlock,
  openBlock,
  closeBlock,
  getSequence,
} = await import(vdomUrl)

console.log('✅ 导入成功！')
console.log('')

let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => void) {
  console.log(`测试: ${name}`)
  try {
    fn()
    console.log(`  ✓ 通过\n`)
    testsPassed++
  } catch (e: any) {
    console.log(`  ✗ 失败: ${e.message}\n`)
    testsFailed++
  }
}

// 1. createVNode 基本测试
test('createVNode - 基本创建', () => {
  const vnode = createVNode('div', { class: 'app', id: 'root' }, 'Hello')
  if (vnode.type !== 'div') throw new Error('type 不正确')
  if (!vnode.props) throw new Error('props 不应为 null')
  if (vnode.props.class !== 'app') throw new Error('props.class 不正确')
  if (vnode.props.id !== 'root') throw new Error('props.id 不正确')
})

test('createVNode - ShapeFlags 自动推断', () => {
  const elemVNode = createVNode('div')
  if (!(elemVNode.shapeFlag & ShapeFlags.ELEMENT)) throw new Error('应该是 ELEMENT')
  if (elemVNode.shapeFlag & ShapeFlags.COMPONENT) throw new Error('不应是 COMPONENT')
})

test('createVNode - Text children', () => {
  const vnode = createVNode('div', null, 'Hello World')
  if (!(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN)) throw new Error('应该是 TEXT_CHILDREN')
  if (vnode.children !== 'Hello World') throw new Error('children 不正确')
})

test('createVNode - Array children', () => {
  const child1 = createVNode('span')
  const child2 = createVNode('span')
  const vnode = createVNode('div', null, [child1, child2])
  if (!(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN)) throw new Error('应该是 ARRAY_CHILDREN')
  if (!Array.isArray(vnode.children)) throw new Error('children 应该是数组')
  if (vnode.children.length !== 2) throw new Error('children 长度不正确')
})

// 2. isSameVNodeType 测试
test('isSameVNodeType - 相同类型和 key', () => {
  const v1 = createVNode('div', { key: 'test' })
  const v2 = createVNode('div', { key: 'test' })
  if (!isSameVNodeType(v1, v2)) throw new Error('应该相同')
})

test('isSameVNodeType - 不同类型', () => {
  const v1 = createVNode('div', { key: 'test' })
  const v2 = createVNode('span', { key: 'test' })
  if (isSameVNodeType(v1, v2)) throw new Error('应该不同')
})

test('isSameVNodeType - 不同 key', () => {
  const v1 = createVNode('div', { key: 'a' })
  const v2 = createVNode('div', { key: 'b' })
  if (isSameVNodeType(v1, v2)) throw new Error('应该不同')
})

// 3. cloneVNode 测试
test('cloneVNode - 基本克隆', () => {
  const original = createVNode('div', { class: 'original' }, 'Hello')
  const cloned = cloneVNode(original)
  if (cloned.type !== original.type) throw new Error('type 应该相同')
  if (cloned.props !== original.props) throw new Error('props 应该相同')
  if (cloned.children !== original.children) throw new Error('children 应该相同')
  if (cloned === original) throw new Error('应该是不同的对象引用')
})

// 4. Fragment 测试
test('Fragment - 创建和检查', () => {
  const frag = createVNode(Fragment, null, [
    createVNode('div'),
    createVNode('span')
  ])
  if (!isFragment(frag)) throw new Error('应该是 Fragment')
  if (frag.type !== Fragment) throw new Error('type 应该是 Fragment')
})

// 5. 文本和注释节点
test('createTextVNode - 创建文本节点', () => {
  const text = createTextVNode('Hello Text')
  if (!(text.shapeFlag & ShapeFlags.TEXT)) throw new Error('应该是 TEXT')
})

test('createCommentVNode - 创建注释节点', () => {
  const comment = createCommentVNode('Hello Comment')
  // 注释节点有特殊的 type
  if (!comment.type) throw new Error('应该有 type')
})

// 6. PatchFlags
test('PatchFlags - 位运算', () => {
  let flags = 0
  flags |= PatchFlags.TEXT
  flags |= PatchFlags.CLASS
  if (!(flags & PatchFlags.TEXT)) throw new Error('应该有 TEXT flag')
  if (!(flags & PatchFlags.CLASS)) throw new Error('应该有 CLASS flag')
  if (flags & PatchFlags.STYLE) throw new Error('不应有 STYLE flag')
})

// 7. getSequence (LIS 算法)
test('getSequence - 最长递增子序列', () => {
  const arr = [3, 1, 2]
  const result = getSequence(arr)
  // 最长递增子序列是 [1, 2]，索引是 [1, 2]
  if (result.length !== 2) throw new Error('长度不正确')
  if (result[0] !== 1) throw new Error('第一个索引不正确')
  if (result[1] !== 2) throw new Error('第二个索引不正确')
})

test('getSequence - 更长的序列', () => {
  const arr = [10, 9, 2, 5, 3, 7, 101, 18]
  const result = getSequence(arr)
  // 最长递增子序列长度应该是 4
  if (result.length !== 4) throw new Error('长度不正确')
})

console.log('========================================')
console.log('  测试结果汇总')
console.log('========================================')
console.log(`  通过: ${testsPassed}`)
console.log(`  失败: ${testsFailed}`)
console.log('========================================')

if (testsFailed === 0) {
  console.log('\n🎉 所有测试通过！VDOM 包功能正常！\n')
  process.exit(0)
} else {
  console.log('\n⚠️  有测试失败！\n')
  process.exit(1)
}
