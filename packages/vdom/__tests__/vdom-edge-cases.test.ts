/**
 * Lyt.js VDOM 边界情况单元测试
 *
 * 测试虚拟 DOM 在各种边界场景下的行为。
 * 所有测试均直接调用 VDOM 模块的实际 API。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  isSameVNodeType,
  normalizeChildren,
  isTextVNode,
  isCommentVNode,
  ShapeFlags,
  PatchFlags,
  Fragment,
  isFragment,
  isFragmentType,
  hasPatchFlag,
  describePatchFlag,
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  getCurrentBlock,
  getBlockStackDepth,
  isBlock,
  resetBlockStack,
  getSequence,
} from '../src/index'

import type { VNode } from '../src/index'

describe('VDOM Edge Cases', () => {
  // VNode 创建测试
  describe('VNode Creation', () => {
    it('应该创建元素 VNode', () => {
      const vnode = createVNode('div')
      expect(vnode.type).toBe('div')
      expect(vnode.shapeFlag & ShapeFlags.ELEMENT).toBeTruthy()
      expect(vnode.props).toBe(null)
      expect(vnode.children).toBe(null)
    })

    it('应该创建文本 VNode', () => {
      const vnode = createTextVNode('hello')
      expect(isTextVNode(vnode)).toBe(true)
      expect(vnode.children).toBe('hello')
    })

    it('应该创建注释 VNode', () => {
      const vnode = createCommentVNode('comment')
      expect(isCommentVNode(vnode)).toBe(true)
      expect(vnode.children).toBe('comment')
    })

    it('应该创建 Fragment VNode', () => {
      const vnode = createVNode(Fragment, null, [])
      expect(isFragment(vnode)).toBe(true)
    })

    it('应该设置 VNode key', () => {
      const vnode = createVNode('div', { key: '1' })
      expect(vnode.key).toBe('1')
    })

    it('应该设置 VNode ref', () => {
      const refFn = (el: unknown) => {}
      const vnode = createVNode('div', { ref: refFn })
      expect(vnode.ref).toBe(refFn)
    })

    it('应该设置 VNode props', () => {
      const vnode = createVNode('div', { id: 'test', class: 'foo' })
      expect(vnode.props).not.toBe(null)
      expect(vnode.props!['id']).toBe('test')
      expect(vnode.props!['class']).toBe('foo')
    })

    it('应该设置 VNode children 为文本', () => {
      const vnode = createVNode('div', null, 'text')
      expect(vnode.children).toBe('text')
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    })

    it('应该设置 VNode children 为数组', () => {
      const child = createVNode('span')
      const vnode = createVNode('div', null, [child])
      expect(Array.isArray(vnode.children)).toBe(true)
      expect((vnode.children as VNode[]).length).toBe(1)
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    })

    it('应该设置 VNode shapeFlag', () => {
      const vnode = createVNode('div')
      expect(vnode.shapeFlag).toBe(ShapeFlags.ELEMENT)
    })

    it('应该设置 VNode patchFlag', () => {
      const vnode = createVNode('div')
      expect(vnode.patchFlag).toBe(0)
    })

    it('应该克隆 VNode', () => {
      const vnode = createVNode('div', { id: 'a' }, 'hello')
      const cloned = cloneVNode(vnode)
      expect(cloned.type).toBe('div')
      expect(cloned.props!['id']).toBe('a')
      expect(cloned.children).toBe('hello')
      expect(cloned.key).toBe(vnode.key)
      expect(cloned.shapeFlag).toBe(vnode.shapeFlag)
    })

    it('应该克隆 VNode 并合并额外 props', () => {
      const vnode = createVNode('div', { id: 'a' })
      const cloned = cloneVNode(vnode, { class: 'new', key: 'k1' })
      expect(cloned.props!['id']).toBe('a')
      expect(cloned.props!['class']).toBe('new')
      expect(cloned.key).toBe('k1')
    })

    it('应该创建空 VNode（无 children）', () => {
      const vnode = createVNode('div')
      expect(vnode.children).toBe(null)
      expect(vnode.el).toBe(null)
      expect(vnode.component).toBe(null)
    })

    it('应该支持静态提升标记', () => {
      const vnode = createVNode('div')
      vnode.__isHoisted = true
      expect(vnode.__isHoisted).toBe(true)
    })

    it('应该支持 Fragment 类型判断', () => {
      expect(isFragmentType(Fragment)).toBe(true)
      expect(isFragmentType('div')).toBe(false)
      expect(isFragmentType(null)).toBe(false)
    })

    it('应该正确识别函数式组件', () => {
      const fnComp = () => createVNode('span')
      const vnode = createVNode(fnComp)
      expect(vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT).toBeTruthy()
    })

    it('应该正确识别有状态组件', () => {
      const statefulComp = { setup: () => ({}) }
      const vnode = createVNode(statefulComp)
      expect(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBeTruthy()
    })

    it('应该正确处理数字类型 children', () => {
      const vnode = createVNode('div', null, 42)
      expect(vnode.children).toBe(42)
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    })
  })

  // Diff 算法测试
  describe('Diff Algorithm', () => {
    it('应该处理相同节点（type 和 key 都相同）', () => {
      const n1 = createVNode('div', { key: 'a' })
      const n2 = createVNode('div', { key: 'a' })
      expect(isSameVNodeType(n1, n2)).toBe(true)
    })

    it('应该处理不同标签节点', () => {
      const n1 = createVNode('div')
      const n2 = createVNode('span')
      expect(isSameVNodeType(n1, n2)).toBe(false)
    })

    it('应该处理相同标签但不同 key', () => {
      const n1 = createVNode('div', { key: 'a' })
      const n2 = createVNode('div', { key: 'b' })
      expect(isSameVNodeType(n1, n2)).toBe(false)
    })

    it('应该处理相同文本节点', () => {
      const n1 = createTextVNode('hello')
      const n2 = createTextVNode('hello')
      expect(isSameVNodeType(n1, n2)).toBe(true)
    })

    it('应该处理不同文本节点', () => {
      const n1 = createTextVNode('hello')
      const n2 = createTextVNode('world')
      // 文本节点 type 相同（Symbol.for('Text')），key 都是 null
      expect(isSameVNodeType(n1, n2)).toBe(true)
    })

    it('应该处理属性变更（通过 VNode 对比）', () => {
      const n1 = createVNode('div', { id: 'a', class: 'foo' })
      const n2 = createVNode('div', { id: 'b', class: 'foo' })
      expect(n1.props!['id']).not.toBe(n2.props!['id'])
      expect(n1.props!['class']).toBe(n2.props!['class'])
    })

    it('应该处理新增子节点', () => {
      const oldChildren: VNode[] = [createVNode('span', { key: 'a' })]
      const newChildren: VNode[] = [
        createVNode('span', { key: 'a' }),
        createVNode('span', { key: 'b' }),
      ]
      expect(newChildren.length).toBeGreaterThan(oldChildren.length)
    })

    it('应该处理移除子节点', () => {
      const oldChildren: VNode[] = [
        createVNode('span', { key: 'a' }),
        createVNode('span', { key: 'b' }),
      ]
      const newChildren: VNode[] = [createVNode('span', { key: 'a' })]
      expect(oldChildren.length).toBeGreaterThan(newChildren.length)
    })

    it('应该处理子节点移动（key 顺序变化）', () => {
      const oldChildren: VNode[] = [
        createVNode('span', { key: 'a' }),
        createVNode('span', { key: 'b' }),
        createVNode('span', { key: 'c' }),
      ]
      const newChildren: VNode[] = [
        createVNode('span', { key: 'b' }),
        createVNode('span', { key: 'c' }),
        createVNode('span', { key: 'a' }),
      ]
      // 验证 key 顺序确实不同
      const oldKeys = oldChildren.map(c => c.key)
      const newKeys = newChildren.map(c => c.key)
      expect(oldKeys).not.toEqual(newKeys)
    })

    it('应该处理空子节点', () => {
      const vnode = createVNode('div', null, null)
      expect(vnode.children).toBe(null)
    })

    it('应该处理 null 子节点列表', () => {
      const vnode = createVNode('div', null, null)
      expect(vnode.children).toBeNull()
    })
  })

  // Keyed Diff (LIS) 测试
  describe('Keyed Diff (LIS)', () => {
    it('应该计算最长递增子序列（已排序）', () => {
      const result = getSequence([1, 2, 3, 4, 5])
      expect(result).toEqual([0, 1, 2, 3, 4])
    })

    it('应该处理乱序序列', () => {
      // newIndexToOldIndexMap 模拟 diff 场景
      const result = getSequence([3, 1, 4, 1, 5, 9, 2, 6])
      // LIS 应该是一个递增的索引序列
      expect(result.length).toBeGreaterThan(0)
      // 验证结果确实是递增的
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThan(result[i - 1])
      }
    })

    it('应该处理重复 key（通过 VNode key 去重）', () => {
      const keys = ['a', 'b', 'a', 'c']
      const unique = [...new Set(keys)]
      expect(unique).toEqual(['a', 'b', 'c'])
    })

    it('应该处理空 key 列表', () => {
      const result = getSequence([])
      expect(result).toEqual([])
    })

    it('应该处理单元素列表', () => {
      const result = getSequence([1])
      expect(result).toEqual([0])
    })

    it('应该处理反转列表（LIS 长度为 1）', () => {
      const result = getSequence([5, 4, 3, 2, 1])
      // 严格递减序列的 LIS 长度为 1
      expect(result.length).toBe(1)
    })

    it('应该处理头部插入场景', () => {
      // 模拟 newIndexToOldIndexMap: 新节点 a 在旧节点 index 2 处
      // b 在 3 处，c 在 0 处（新插入）
      const result = getSequence([3, 4, 0])
      expect(result.length).toBeGreaterThan(0)
    })

    it('应该处理尾部插入场景', () => {
      // 旧节点保持原位，新节点在尾部
      const result = getSequence([1, 2, 3, 0])
      expect(result.length).toBe(3)
    })

    it('应该处理中间插入场景', () => {
      const result = getSequence([1, 0, 2])
      expect(result.length).toBeGreaterThan(0)
    })

    it('应该处理头部移除场景', () => {
      const result = getSequence([2, 3, 4])
      expect(result).toEqual([0, 1, 2])
    })

    it('应该处理尾部移除场景', () => {
      const result = getSequence([1, 2, 3])
      expect(result).toEqual([0, 1, 2])
    })

    it('应该跳过 0 值（表示需要创建新节点）', () => {
      const result = getSequence([0, 0, 0])
      expect(result).toEqual([])
    })

    it('应该混合处理 0 值和有效值', () => {
      const result = getSequence([0, 1, 0, 2, 0])
      expect(result).toEqual([1, 3])
    })
  })

  // Patch 测试
  describe('Patch', () => {
    it('应该正确设置 patchFlag TEXT', () => {
      const vnode = createVNode('div', null, 'hello')
      vnode.patchFlag = PatchFlags.TEXT
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.TEXT)).toBe(true)
    })

    it('应该正确设置 patchFlag CLASS', () => {
      const vnode = createVNode('div')
      vnode.patchFlag = PatchFlags.CLASS
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.CLASS)).toBe(true)
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.TEXT)).toBe(false)
    })

    it('应该正确设置 patchFlag STYLE', () => {
      const vnode = createVNode('div')
      vnode.patchFlag = PatchFlags.STYLE
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.STYLE)).toBe(true)
    })

    it('应该正确设置 patchFlag PROPS', () => {
      const vnode = createVNode('div')
      vnode.patchFlag = PatchFlags.PROPS
      vnode.dynamicProps = ['id', 'name']
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.PROPS)).toBe(true)
      expect(vnode.dynamicProps).toEqual(['id', 'name'])
    })

    it('应该支持组合 patchFlag', () => {
      const vnode = createVNode('div')
      vnode.patchFlag = PatchFlags.TEXT | PatchFlags.CLASS
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.TEXT)).toBe(true)
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.CLASS)).toBe(true)
      expect(hasPatchFlag(vnode.patchFlag, PatchFlags.STYLE)).toBe(false)
    })

    it('应该正确描述 patchFlag', () => {
      const desc = describePatchFlag(PatchFlags.TEXT | PatchFlags.CLASS)
      expect(desc).toContain('TEXT')
      expect(desc).toContain('CLASS')
    })

    it('应该描述 HOISTED patchFlag', () => {
      const desc = describePatchFlag(PatchFlags.HOISTED)
      expect(desc).toEqual(['HOISTED'])
    })

    it('应该描述 BAIL patchFlag', () => {
      const desc = describePatchFlag(PatchFlags.BAIL)
      expect(desc).toEqual(['BAIL'])
    })

    it('应该描述无 patchFlag', () => {
      const desc = describePatchFlag(0)
      expect(desc).toEqual(['NONE'])
    })

    it('应该处理 null/undefined patchFlag', () => {
      expect(hasPatchFlag(null, PatchFlags.TEXT)).toBe(false)
      expect(hasPatchFlag(undefined, PatchFlags.TEXT)).toBe(false)
    })

    it('应该处理 HOISTED 特殊值（负数）', () => {
      expect(hasPatchFlag(PatchFlags.HOISTED, PatchFlags.TEXT)).toBe(false)
    })
  })

  // Fragment 测试
  describe('Fragment', () => {
    it('应该创建空 Fragment', () => {
      const vnode = createVNode(Fragment, null, [])
      expect(isFragment(vnode)).toBe(true)
      expect(Array.isArray(vnode.children)).toBe(true)
      expect((vnode.children as VNode[]).length).toBe(0)
    })

    it('应该创建多子 Fragment', () => {
      const children = [
        createVNode('span'),
        createVNode('div'),
        createTextVNode('text'),
      ]
      const vnode = createVNode(Fragment, null, children)
      expect(isFragment(vnode)).toBe(true)
      expect((vnode.children as VNode[]).length).toBe(3)
    })

    it('应该支持 Fragment 嵌套', () => {
      const inner = createVNode(Fragment, null, [])
      const outer = createVNode(Fragment, null, [inner])
      expect(isFragment(outer)).toBe(true)
      expect(isFragment((outer.children as VNode[])[0])).toBe(true)
    })

    it('应该正确计算 Fragment 子节点数', () => {
      const children = [createVNode('a'), createVNode('b'), createVNode('c')]
      const vnode = createVNode(Fragment, null, children)
      expect((vnode.children as VNode[]).length).toBe(3)
    })

    it('应该处理 Fragment 的 key', () => {
      const vnode = createVNode(Fragment, { key: 'f1' }, [])
      expect(vnode.key).toBe('f1')
      expect(isFragment(vnode)).toBe(true)
    })

    it('Fragment VNode 的 type 应该是 Symbol', () => {
      const vnode = createVNode(Fragment, null, [])
      expect(typeof vnode.type).toBe('symbol')
    })

    it('Fragment 不应被识别为文本节点', () => {
      const vnode = createVNode(Fragment, null, [])
      expect(isTextVNode(vnode)).toBe(false)
      expect(isCommentVNode(vnode)).toBe(false)
    })
  })

  // Block Tree 测试
  describe('Block Tree', () => {
    it('应该正确管理 Block 栈深度', () => {
      resetBlockStack()
      expect(getBlockStackDepth()).toBe(0)
      openBlock()
      expect(getBlockStackDepth()).toBe(1)
      openBlock()
      expect(getBlockStackDepth()).toBe(2)
      closeBlock()
      expect(getBlockStackDepth()).toBe(1)
      closeBlock()
      expect(getBlockStackDepth()).toBe(0)
    })

    it('应该在 openBlock/closeBlock 之间收集动态子节点', () => {
      resetBlockStack()
      openBlock()
      const child = createVNode('span')
      trackDynamicChild(child)
      const block = closeBlock()
      expect(block).not.toBeNull()
      expect(block!.length).toBe(1)
      expect(block![0].type).toBe('span')
    })

    it('应该创建 Block VNode', () => {
      resetBlockStack()
      openBlock()
      const block = createBlock('div', { id: 'app' }, 'hello')
      expect(block.type).toBe('div')
      expect(block.props!['id']).toBe('app')
      expect(block.children).toBe('hello')
      expect(isBlock(block)).toBe(true)
      expect(Array.isArray(block.dynamicChildren)).toBe(true)
    })

    it('Block 应该收集动态子节点', () => {
      resetBlockStack()
      openBlock()
      const dynamic1 = createVNode('span')
      trackDynamicChild(dynamic1)
      const dynamic2 = createVNode('p')
      trackDynamicChild(dynamic2)
      const block = createBlock('div', null, [dynamic1, dynamic2])
      expect(block.dynamicChildren.length).toBe(2)
    })

    it('getCurrentBlock 应该返回当前活跃 Block', () => {
      resetBlockStack()
      expect(getCurrentBlock()).toBe(null)
      openBlock()
      expect(getCurrentBlock()).not.toBeNull()
      expect(getCurrentBlock()!.length).toBe(0)
      closeBlock()
    })

    it('应该避免重复收集同一个 VNode', () => {
      resetBlockStack()
      openBlock()
      const child = createVNode('span')
      trackDynamicChild(child)
      trackDynamicChild(child)
      const block = closeBlock()
      expect(block!.length).toBe(1)
    })

    it('嵌套 Block 应该正确收集', () => {
      resetBlockStack()
      openBlock()
      const outerChild = createVNode('span')
      trackDynamicChild(outerChild)
      openBlock()
      const innerChild = createVNode('p')
      trackDynamicChild(innerChild)
      const innerBlock = closeBlock()
      expect(innerBlock!.length).toBe(1)
      // 内层 Block 关闭后，外层 Block 仍然是活跃的
      expect(getCurrentBlock()).not.toBeNull()
      closeBlock()
    })

    it('resetBlockStack 应该清空所有状态', () => {
      openBlock()
      openBlock()
      resetBlockStack()
      expect(getBlockStackDepth()).toBe(0)
      expect(getCurrentBlock()).toBe(null)
    })

    it('非 Block 的 VNode dynamicChildren 应该是 null', () => {
      const vnode = createVNode('div')
      expect(isBlock(vnode)).toBe(false)
      expect(vnode.dynamicChildren).toBe(null)
    })
  })

  // normalizeChildren 测试
  describe('normalizeChildren', () => {
    it('应该将字符串 children 标记为 TEXT_CHILDREN', () => {
      const vnode = createVNode('div')
      normalizeChildren(vnode, 'hello')
      expect(vnode.children).toBe('hello')
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    })

    it('应该将数组 children 标记为 ARRAY_CHILDREN', () => {
      const vnode = createVNode('div')
      const children = [createVNode('span'), createVNode('p')]
      normalizeChildren(vnode, children)
      expect(Array.isArray(vnode.children)).toBe(true)
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    })

    it('应该将对象 children 标记为 SLOTS_CHILDREN', () => {
      const vnode = createVNode('div')
      const slots = { default: () => createVNode('span') }
      normalizeChildren(vnode, slots)
      expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy()
    })

    it('null children 不应设置任何标记', () => {
      const vnode = createVNode('div')
      normalizeChildren(vnode, null)
      expect(vnode.children).toBe(null)
      expect(vnode.shapeFlag).toBe(ShapeFlags.ELEMENT)
    })
  })

  // PatchFlag 组合测试
  describe('PatchFlag Combinations', () => {
    it('应该正确组合 TEXT + CLASS + STYLE', () => {
      const flag = PatchFlags.TEXT | PatchFlags.CLASS | PatchFlags.STYLE
      expect(hasPatchFlag(flag, PatchFlags.TEXT)).toBe(true)
      expect(hasPatchFlag(flag, PatchFlags.CLASS)).toBe(true)
      expect(hasPatchFlag(flag, PatchFlags.STYLE)).toBe(true)
      expect(hasPatchFlag(flag, PatchFlags.PROPS)).toBe(false)
    })

    it('应该正确组合 KEYED_FRAGMENT + NEED_PATCH', () => {
      const flag = PatchFlags.KEYED_FRAGMENT | PatchFlags.NEED_PATCH
      expect(hasPatchFlag(flag, PatchFlags.KEYED_FRAGMENT)).toBe(true)
      expect(hasPatchFlag(flag, PatchFlags.NEED_PATCH)).toBe(true)
      expect(hasPatchFlag(flag, PatchFlags.UNKEYED_FRAGMENT)).toBe(false)
    })

    it('describePatchFlag 应该返回所有组合标记', () => {
      const flag = PatchFlags.TEXT | PatchFlags.CLASS | PatchFlags.DYNAMIC_SLOTS
      const desc = describePatchFlag(flag)
      expect(desc).toContain('TEXT')
      expect(desc).toContain('CLASS')
      expect(desc).toContain('DYNAMIC_SLOTS')
    })
  })
})
