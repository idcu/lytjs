/**
 * Lyt.js 虚拟 DOM — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 *
 * 测试覆盖：
 *   - createVNode 基本创建 / ShapeFlags 自动推断 / children 推断
 *   - isSameVNodeType 判断
 *   - createTextVNode / createCommentVNode
 *   - cloneVNode 克隆
 *   - normalizeChildren 字符串/数组/null/undefined
 *   - Fragment 创建 / isFragment 判断
 *   - PatchFlag 位标记
 *   - Block 创建 / openBlock/closeBlock 栈管理
 *   - getSequence LIS 算法
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  isSameVNodeType,
  normalizeChildren,
  ShapeFlags,
  PatchFlags,
  Fragment,
  isFragment,
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
  resetBlockStack,
  getSequence,
  getBlockStackDepth,
  getCurrentBlock,
} from '../src/index'
import type { VNode } from '../src/index'

// ================================================================
//  createVNode 测试
// ================================================================

describe('createVNode', () => {
  it('基本创建', () => {
    const vnode = createVNode('div', { class: 'app', id: 'root' }, 'Hello')
    expect(vnode.type).toBe('div')
    expect(vnode.props).not.toBe(null)
    expect(vnode.props!['class']).toBe('app')
    expect(vnode.props!['id']).toBe('root')
    expect(vnode.key).toBe(null)
    expect(vnode.ref).toBe(null)
    expect(vnode.el).toBe(null)
  })

  it('自动推断 ShapeFlags（元素）', () => {
    const elem = createVNode('div')
    expect(elem.shapeFlag & ShapeFlags.ELEMENT).toBeTruthy()
    expect(elem.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT).toBeFalsy()
    expect(elem.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBeFalsy()
  })

  it('带 children 推断 TEXT_CHILDREN', () => {
    const textChild = createVNode('div', null, 'hello')
    expect(textChild.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    expect(textChild.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeFalsy()
    expect(textChild.children).toBe('hello')
  })

  it('带 children 推断 ARRAY_CHILDREN', () => {
    const arrChild = createVNode('div', null, [
      createVNode('span'),
      createVNode('span'),
    ])
    expect(arrChild.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    expect(arrChild.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeFalsy()
    expect(Array.isArray(arrChild.children)).toBe(true)
    expect((arrChild.children as VNode[]).length).toBe(2)
  })
})

// ================================================================
//  isSameVNodeType 测试
// ================================================================

describe('isSameVNodeType', () => {
  it('同类型同 key', () => {
    const a = createVNode('div', { key: 'a' })
    const b = createVNode('div', { key: 'a' })
    expect(isSameVNodeType(a, b)).toBe(true)
  })

  it('不同类型', () => {
    const a = createVNode('div', { key: 'a' })
    const b = createVNode('span', { key: 'a' })
    expect(isSameVNodeType(a, b)).toBe(false)
  })

  it('不同 key', () => {
    const a = createVNode('div', { key: 'a' })
    const b = createVNode('div', { key: 'b' })
    expect(isSameVNodeType(a, b)).toBe(false)
  })
})

// ================================================================
//  createTextVNode 测试
// ================================================================

describe('createTextVNode', () => {
  it('创建文本 VNode', () => {
    const textVNode = createTextVNode('Hello World')
    expect(typeof textVNode.type === 'symbol').toBe(true)
    expect(textVNode.children).toBe('Hello World')
    expect(textVNode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
  })

  it('空文本', () => {
    const emptyText = createTextVNode()
    expect(emptyText.children).toBe('')
  })
})

// ================================================================
//  createCommentVNode 测试
// ================================================================

describe('createCommentVNode', () => {
  it('创建注释 VNode', () => {
    const commentVNode = createCommentVNode('a comment')
    expect(typeof commentVNode.type === 'symbol').toBe(true)
    expect(commentVNode.children).toBe('a comment')
  })
})

// ================================================================
//  cloneVNode 测试
// ================================================================

describe('cloneVNode', () => {
  it('克隆', () => {
    const original = createVNode('div', { class: 'app' }, 'hello')
    original.key = 'my-key'
    const cloned = cloneVNode(original)
    expect(cloned.type).toBe(original.type)
    expect(cloned.key).toBe(original.key)
    expect(cloned.children).toBe(original.children)
    expect(cloned.shapeFlag).toBe(original.shapeFlag)
  })

  it('合并额外 props', () => {
    const original = createVNode('div', { class: 'app' }, 'hello')
    original.key = 'my-key'
    const merged = cloneVNode(original, { id: 'new-id' })
    expect(merged.props!['class']).toBe('app')
    expect(merged.props!['id']).toBe('new-id')
  })
})

// ================================================================
//  normalizeChildren 测试
// ================================================================

describe('normalizeChildren', () => {
  it('字符串', () => {
    const vnode = createVNode('div', null, 'hello')
    expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    expect(typeof vnode.children).toBe('string')
    expect(vnode.children).toBe('hello')
  })

  it('数组', () => {
    const children = [createVNode('span'), createVNode('p')]
    const vnode = createVNode('div', null, children)
    expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    expect(Array.isArray(vnode.children)).toBe(true)
    expect((vnode.children as VNode[]).length).toBe(2)
  })

  it('null/undefined', () => {
    const vnode1 = createVNode('div', null, null)
    expect(vnode1.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeFalsy()
    expect(vnode1.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeFalsy()
    expect(vnode1.children).toBe(null)

    const vnode2 = createVNode('div', null, undefined)
    expect(vnode2.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeFalsy()
    expect(vnode2.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeFalsy()
  })
})

// ================================================================
//  Fragment 测试
// ================================================================

describe('Fragment', () => {
  it('创建', () => {
    const fragment = createVNode(Fragment, null, [
      createVNode('div'),
      createVNode('span'),
    ])
    expect(typeof fragment.type === 'symbol').toBe(true)
    expect(String(fragment.type)).toBe('Symbol(Fragment)')
    expect(Array.isArray(fragment.children)).toBe(true)
    expect((fragment.children as VNode[]).length).toBe(2)
  })

  it('isFragment 判断', () => {
    const fragment = createVNode(Fragment, null, [])
    expect(isFragment(fragment)).toBe(true)
    const div = createVNode('div')
    expect(isFragment(div)).toBe(false)
  })
})

// ================================================================
//  PatchFlag 测试
// ================================================================

describe('PatchFlag', () => {
  it('位标记', () => {
    const TEXT = PatchFlags.TEXT
    const CLASS = PatchFlags.CLASS
    const STYLE = PatchFlags.STYLE
    const PROPS = PatchFlags.PROPS

    expect(TEXT).toBe(1)
    expect(CLASS).toBe(2)
    expect(STYLE).toBe(4)
    expect(PROPS).toBe(8)

    // 组合标记
    const combined = TEXT | CLASS | STYLE
    expect(combined & TEXT).toBeTruthy()
    expect(combined & CLASS).toBeTruthy()
    expect(combined & STYLE).toBeTruthy()
    expect(combined & PROPS).toBeFalsy()

    // 特殊值
    expect(PatchFlags.HOISTED).toBe(-1)
    expect(PatchFlags.BAIL).toBe(-2)
  })
})

// ================================================================
//  Block 测试
// ================================================================

describe('Block', () => {
  it('创建', () => {
    resetBlockStack()
    openBlock()
    const block = createBlock('div', null, [
      createTextVNode('static'),
    ])
    expect(isBlock(block)).toBe(true)
    expect(Array.isArray(block.dynamicChildren)).toBe(true)
    resetBlockStack()
  })

  it('openBlock/closeBlock 栈管理', () => {
    resetBlockStack()
    expect(getBlockStackDepth()).toBe(0)
    expect(getCurrentBlock()).toBe(null)

    openBlock()
    expect(getBlockStackDepth()).toBe(1)
    expect(getCurrentBlock()).not.toBe(null)

    openBlock()
    expect(getBlockStackDepth()).toBe(2)

    closeBlock()
    expect(getBlockStackDepth()).toBe(1)

    closeBlock()
    expect(getBlockStackDepth()).toBe(0)
    expect(getCurrentBlock()).toBe(null)

    resetBlockStack()
  })
})

// ================================================================
//  getSequence LIS 测试
// ================================================================

describe('getSequence', () => {
  it('基本用例 [10,9,2,5,3,7,101,18]', () => {
    const result = getSequence([10, 9, 2, 5, 3, 7, 101, 18])
    // LIS 是 [2, 3, 7, 18]，对应索引 [2, 4, 5, 7]
    expect(result.length).toBe(4)
    expect(result).toContain(2)
    expect(result).toContain(4)
    expect(result).toContain(5)
    expect(result).toContain(7)
  })

  it('空数组', () => {
    const result = getSequence([])
    expect(result.length).toBe(0)
  })
})
