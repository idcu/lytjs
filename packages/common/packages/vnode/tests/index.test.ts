import { describe, it, expect } from 'vitest'
import {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isFragment,
  isTextVNode,
  isCommentVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
  type VNode,
  type VNodeTypes,
} from '../src/index'

describe('@lytjs/common-vnode', () => {
  describe('VNode Symbols', () => {
    it('Fragment should be a unique symbol', () => {
      expect(typeof Fragment).toBe('symbol')
      expect(Symbol.keyFor(Fragment)).toBe('Fragment')
    })

    it('Text should be a unique symbol', () => {
      expect(typeof Text).toBe('symbol')
      expect(Symbol.keyFor(Text)).toBe('Text')
    })

    it('Comment should be a unique symbol', () => {
      expect(typeof Comment).toBe('symbol')
      expect(Symbol.keyFor(Comment)).toBe('Comment')
    })

    it('symbols should be unique', () => {
      expect(Fragment).not.toBe(Text)
      expect(Text).not.toBe(Comment)
      expect(Fragment).not.toBe(Comment)
    })
  })

  describe('ShapeFlags', () => {
    it('should have correct flag values', () => {
      expect(ShapeFlags.ELEMENT).toBe(1)
      expect(ShapeFlags.FUNCTIONAL_COMPONENT).toBe(2)
      expect(ShapeFlags.STATEFUL_COMPONENT).toBe(4)
      expect(ShapeFlags.TEXT_CHILDREN).toBe(8)
      expect(ShapeFlags.ARRAY_CHILDREN).toBe(16)
      expect(ShapeFlags.SLOTS_CHILDREN).toBe(32)
      expect(ShapeFlags.SUSPENSE).toBe(64)
      expect(ShapeFlags.TELEPORT).toBe(128)
      expect(ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE).toBe(256)
      expect(ShapeFlags.COMPONENT_KEPT_ALIVE).toBe(512)
    })
  })

  describe('PatchFlags', () => {
    it('should have correct flag values', () => {
      expect(PatchFlags.TEXT).toBe(1)
      expect(PatchFlags.CLASS).toBe(2)
      expect(PatchFlags.STYLE).toBe(4)
      expect(PatchFlags.PROPS).toBe(8)
      expect(PatchFlags.FULL_PROPS).toBe(16)
      expect(PatchFlags.HYDRATE_EVENTS).toBe(32)
      expect(PatchFlags.STABLE_FRAGMENT).toBe(64)
      expect(PatchFlags.KEYED_FRAGMENT).toBe(128)
      expect(PatchFlags.UNKEYED_FRAGMENT).toBe(256)
      expect(PatchFlags.NEED_PATCH).toBe(512)
      expect(PatchFlags.DYNAMIC_SLOTS).toBe(1024)
      expect(PatchFlags.HOISTED).toBe(-1)
      expect(PatchFlags.BAIL).toBe(-2)
    })
  })

  describe('isFragment', () => {
    it('should return true for Fragment type', () => {
      expect(isFragment({ type: Fragment } as any)).toBe(true)
    })

    it('should return false for non-Fragment type', () => {
      expect(isFragment({ type: 'div' } as any)).toBe(false)
      expect(isFragment({ type: Text } as any)).toBe(false)
    })
  })

  describe('isTextVNode', () => {
    it('should return true for Text type', () => {
      expect(isTextVNode({ type: Text } as any)).toBe(true)
    })

    it('should return false for non-Text type', () => {
      expect(isTextVNode({ type: 'div' } as any)).toBe(false)
      expect(isTextVNode({ type: Fragment } as any)).toBe(false)
    })
  })

  describe('isCommentVNode', () => {
    it('should return true for Comment type', () => {
      expect(isCommentVNode({ type: Comment } as any)).toBe(true)
    })

    it('should return false for non-Comment type', () => {
      expect(isCommentVNode({ type: 'div' } as any)).toBe(false)
      expect(isCommentVNode({ type: Text } as any)).toBe(false)
    })
  })

  describe('isSameVNodeType', () => {
    it('should return true for same type and key', () => {
      const a = { type: 'div', key: 'a' } as any
      const b = { type: 'div', key: 'a' } as any
      expect(isSameVNodeType(a, b)).toBe(true)
    })

    it('should return false for different type', () => {
      const a = { type: 'div', key: 'a' } as any
      const b = { type: 'span', key: 'a' } as any
      expect(isSameVNodeType(a, b)).toBe(false)
    })

    it('should return false for different key', () => {
      const a = { type: 'div', key: 'a' } as any
      const b = { type: 'div', key: 'b' } as any
      expect(isSameVNodeType(a, b)).toBe(false)
    })

    it('should return true when both keys are undefined', () => {
      const a = { type: 'div' } as any
      const b = { type: 'div' } as any
      expect(isSameVNodeType(a, b)).toBe(true)
    })
  })

  describe('hasPatchFlag', () => {
    it('should return true when flag is set', () => {
      expect(hasPatchFlag({ patchFlag: PatchFlags.TEXT | PatchFlags.CLASS } as any, PatchFlags.TEXT)).toBe(true)
    })

    it('should return false when flag is not set', () => {
      expect(hasPatchFlag({ patchFlag: PatchFlags.TEXT } as any, PatchFlags.CLASS)).toBe(false)
    })

    it('should return false when patchFlag is undefined', () => {
      expect(hasPatchFlag({} as any, PatchFlags.TEXT)).toBe(false)
    })
  })

  describe('describePatchFlag', () => {
    it('should describe TEXT flag', () => {
      expect(describePatchFlag(PatchFlags.TEXT)).toContain('TEXT')
    })

    it('should describe CLASS flag', () => {
      expect(describePatchFlag(PatchFlags.CLASS)).toContain('CLASS')
    })

    it('should describe combined flags', () => {
      const desc = describePatchFlag(PatchFlags.TEXT | PatchFlags.CLASS)
      expect(desc).toContain('TEXT')
      expect(desc).toContain('CLASS')
    })

    it('should describe HOISTED flag', () => {
      expect(describePatchFlag(PatchFlags.HOISTED)).toContain('HOISTED')
    })
  })
})
