 
import { describe, it, expect, beforeEach } from 'vitest';
import {
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
} from '../src/block';
import { createVNode } from '../src/vnode';
import type { VNode } from '@lytjs/common-vnode';

describe('Block Tree runtime', () => {
  beforeEach(() => {
    resetBlockStack();
  });

  // ===== openBlock / closeBlock =====

  describe('openBlock / closeBlock', () => {
    it('should create a new dynamicChildren array on openBlock', () => {
      openBlock();
      const block = getCurrentBlock();
      expect(block).toEqual([]);
      expect(getBlockStackDepth()).toBe(1);
    });

    it('should restore outer block on closeBlock', () => {
      openBlock();
      openBlock();
      expect(getBlockStackDepth()).toBe(2);

      const innerBlock = closeBlock();
      expect(innerBlock).toEqual([]);
      expect(getBlockStackDepth()).toBe(1);

      const outerBlock = getCurrentBlock();
      expect(outerBlock).toEqual([]);
    });

    it('should return null when closing block without open', () => {
      const block = closeBlock();
      expect(block).toBeNull();
    });

    it('should handle nested blocks correctly', () => {
      openBlock(); // depth 1
      const vnode1 = createVNode('span');
      trackDynamicChild(vnode1);

      openBlock(); // depth 2
      const vnode2 = createVNode('div');
      trackDynamicChild(vnode2);

      const innerBlock = closeBlock(); // back to depth 1
      expect(innerBlock).toEqual([vnode2]);

      const vnode3 = createVNode('p');
      trackDynamicChild(vnode3);

      const outerBlock = closeBlock(); // back to depth 0
      expect(outerBlock).toEqual([vnode1, vnode3]);
    });
  });

  // ===== createBlock =====

  describe('createBlock', () => {
    it('should create a Block VNode with empty dynamicChildren', () => {
      const block = createBlock('div', null, null, 0);
      expect(isBlock(block)).toBe(true);
      expect(block.dynamicChildren).toEqual([]);
      expect(block.type).toBe('div');
    });

    it('should collect dynamicChildren from current block scope', () => {
      openBlock();
      const dynamicChild = createVNode('span');
      trackDynamicChild(dynamicChild);

      const block = createBlock('div', null, null, 0);
      expect(block.dynamicChildren).toEqual([dynamicChild]);
    });

    it('should register itself in outer block scope', () => {
      openBlock(); // outer scope
      openBlock(); // inner scope (the one createBlock will close)
      const innerBlock = createBlock('div', null, null, 0);
      // createBlock closed the inner scope, currentBlock is now the outer scope
      expect(getCurrentBlock()).toEqual([innerBlock]);
    });

    it('should not register when no outer block scope', () => {
      openBlock(); // only scope
      const block = createBlock('div', null, null, 0);
      // createBlock closed the only scope, currentBlock is now null
      expect(getCurrentBlock()).toBeNull();
      expect(block.dynamicChildren).toEqual([]);
    });

    it('should set patchFlag correctly', () => {
      const block = createBlock('div', null, null, 16);
      expect(block.patchFlag).toBe(16);
    });

    it('should pass props and children to createVNode', () => {
      const block = createBlock('div', { class: 'test' }, 'hello', 0);
      expect(block.props).toEqual({ class: 'test' });
      expect(block.children).toBe('hello');
    });
  });

  // ===== trackDynamicChild =====

  describe('trackDynamicChild', () => {
    it('should add vnode to currentBlock', () => {
      openBlock();
      const vnode = createVNode('span');
      trackDynamicChild(vnode);
      expect(getCurrentBlock()).toEqual([vnode]);
    });

    it('should deduplicate by reference equality', () => {
      openBlock();
      const vnode = createVNode('span');
      trackDynamicChild(vnode);
      trackDynamicChild(vnode);
      trackDynamicChild(vnode);
      expect(getCurrentBlock()).toEqual([vnode]);
    });

    it('should silently ignore when no block context', () => {
      const vnode = createVNode('span');
      expect(() => trackDynamicChild(vnode)).not.toThrow();
      expect(getCurrentBlock()).toBeNull();
    });
  });

  // ===== isBlock =====

  describe('isBlock', () => {
    it('should return true for Block VNode', () => {
      openBlock();
      const block = createBlock('div', null, null, 0);
      expect(isBlock(block)).toBe(true);
    });

    it('should return false for VNode with null dynamicChildren', () => {
      const vnode = createVNode('div');
      expect(isBlock(vnode)).toBe(false);
    });

    it('should return false for VNode without dynamicChildren property', () => {
      const vnode = { type: 'div', dynamicChildren: null } as unknown as VNode;
      expect(isBlock(vnode)).toBe(false);
    });
  });

  // ===== resetBlockStack =====

  describe('resetBlockStack', () => {
    it('should reset block stack to initial state', () => {
      openBlock();
      openBlock();
      openBlock();
      expect(getBlockStackDepth()).toBe(3);

      resetBlockStack();
      expect(getCurrentBlock()).toBeNull();
      expect(getBlockStackDepth()).toBe(0);
    });
  });

  // ===== getBlockStackDepth =====

  describe('getBlockStackDepth', () => {
    it('should return 0 initially', () => {
      expect(getBlockStackDepth()).toBe(0);
    });

    it('should return correct depth for nested blocks', () => {
      openBlock();
      expect(getBlockStackDepth()).toBe(1);
      openBlock();
      expect(getBlockStackDepth()).toBe(2);
      openBlock();
      expect(getBlockStackDepth()).toBe(3);
      closeBlock();
      expect(getBlockStackDepth()).toBe(2);
      closeBlock();
      expect(getBlockStackDepth()).toBe(1);
      closeBlock();
      expect(getBlockStackDepth()).toBe(0);
    });
  });

  // ===== Integration: nested Block Tree =====

  describe('nested Block Tree integration', () => {
    it('should build correct Block Tree with nested blocks', () => {
      openBlock(); // outer block
      const _staticChild = createVNode('span'); // static, not tracked
      const dynamicChild1 = createVNode('em');
      trackDynamicChild(dynamicChild1);

      // inner block
      openBlock();
      const innerDynamic = createVNode('strong');
      trackDynamicChild(innerDynamic);
      const innerBlock = createBlock('div', null, null, 0);

      const dynamicChild2 = createVNode('p');
      trackDynamicChild(dynamicChild2);

      const outerBlock = createBlock('section', null, null, 0);

      // Verify outer block
      expect(outerBlock.dynamicChildren).toEqual([dynamicChild1, innerBlock, dynamicChild2]);

      // Verify inner block
      expect(innerBlock.dynamicChildren).toEqual([innerDynamic]);

      // Verify inner block is registered in outer block
      expect(isBlock(innerBlock)).toBe(true);
    });
  });
});
