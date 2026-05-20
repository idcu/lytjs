/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDOMOperations, patchKeyedChildren, patchUnkeyedChildren } from '../src/list-diff';
import type { DOMOperations } from '../src/list-diff';
import { createVNode } from '../src/vnode';

describe('list-diff', () => {
  let mockOps: DOMOperations;
  let patchCalls: any[];
  let unmountCalls: any[];
  let moveCalls: any[];

  beforeEach(() => {
    patchCalls = [];
    unmountCalls = [];
    moveCalls = [];

    mockOps = {
      insert: vi.fn(),
      createElement: vi.fn((tag: string) => document.createElement(tag)),
      mount: vi.fn(),
      patch: vi.fn((n1: any, n2: any, container: any, anchor: any) => {
        patchCalls.push({ n1, n2, container, anchor });
      }),
      unmount: vi.fn((vnode: any, parent: any, suspense: any, doRemove: any) => {
        unmountCalls.push({ vnode, doRemove });
      }),
      move: vi.fn((vnode: any, container: any, anchor: any) => {
        moveCalls.push({ vnode, container, anchor });
      }),
    };

    registerDOMOperations(mockOps);
  });

  // ----------------------------------------------------------
  // registerDOMOperations
  // ----------------------------------------------------------
  describe('registerDOMOperations', () => {
    it('应拒绝 null 参数', () => {
      expect(() => registerDOMOperations(null as any)).toThrow(
        'registerDOMOperations requires a valid DOMOperations object',
      );
    });
  });

  // ----------------------------------------------------------
  // patchKeyedChildren — 快速路径
  // ----------------------------------------------------------
  describe('patchKeyedChildren - fast path', () => {
    it('长度相同 + 类型全匹配时应走快速路径', () => {
      const c1 = [
        createVNode('div', { key: 'a' }, 'a'),
        createVNode('div', { key: 'b' }, 'b'),
        createVNode('div', { key: 'c' }, 'c'),
      ];
      const c2 = [
        createVNode('div', { key: 'a' }, 'a-updated'),
        createVNode('div', { key: 'b' }, 'b-updated'),
        createVNode('div', { key: 'c' }, 'c-updated'),
      ];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(3);
      expect(mockOps.unmount).not.toHaveBeenCalled();
      expect(mockOps.move).not.toHaveBeenCalled();
      expect(patchCalls[0].n1).toBe(c1[0]);
      expect(patchCalls[0].n2).toBe(c2[0]);
    });

    it('类型不匹配时应走完整 diff', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('span', { key: 'b' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalled();
    });

    it('长度不同时应走完整 diff', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(2);
      expect(patchCalls[1].n1).toBeNull(); // 挂载 b
    });
  });

  // ----------------------------------------------------------
  // patchKeyedChildren — 同步前缀/后缀
  // ----------------------------------------------------------
  describe('patchKeyedChildren - sync prefix/suffix', () => {
    it('前缀同步 + 挂载剩余', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const c2 = [
        createVNode('div', { key: 'a' }),
        createVNode('div', { key: 'b' }),
        createVNode('div', { key: 'c' }),
      ];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(3);
      expect(mockOps.unmount).not.toHaveBeenCalled();
      expect(patchCalls[2].n1).toBeNull(); // 挂载 c
    });

    it('后缀同步 + 卸载剩余', () => {
      const c1 = [
        createVNode('div', { key: 'a' }),
        createVNode('div', { key: 'b' }),
        createVNode('div', { key: 'c' }),
      ];
      const c2 = [createVNode('div', { key: 'b' }), createVNode('div', { key: 'c' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.unmount).toHaveBeenCalledTimes(1);
      expect(unmountCalls[0].vnode).toBe(c1[0]); // 卸载 a
    });
  });

  // ----------------------------------------------------------
  // patchKeyedChildren — 未知子序列 + LIS
  // ----------------------------------------------------------
  describe('patchKeyedChildren - unknown sequence + LIS', () => {
    it('重排序应复用节点并 patch', () => {
      const c1 = [
        createVNode('div', { key: 'a' }),
        createVNode('div', { key: 'b' }),
        createVNode('div', { key: 'c' }),
      ];
      const c2 = [
        createVNode('div', { key: 'c' }),
        createVNode('div', { key: 'a' }),
        createVNode('div', { key: 'b' }),
      ];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      // 所有旧节点应被 patch（复用），无 unmount
      expect(mockOps.unmount).not.toHaveBeenCalled();
      // 3 个 patch 调用（全部是 n1 !== null，复用旧节点）
      expect(patchCalls.length).toBe(3);
      expect(patchCalls.every((c) => c.n1 !== null)).toBe(true);
    });

    it('混合增删应正确处理', () => {
      const c1 = [
        createVNode('div', { key: 'a' }),
        createVNode('div', { key: 'b' }),
        createVNode('div', { key: 'c' }),
      ];
      const c2 = [createVNode('div', { key: 'b' }), createVNode('div', { key: 'd' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.unmount).toHaveBeenCalledTimes(2); // a, c
      const mountCalls = patchCalls.filter((c) => c.n1 === null);
      expect(mountCalls.length).toBeGreaterThanOrEqual(1); // d
    });

    it('仅新增节点', () => {
      const c1 = [createVNode('div', { key: 'a' })];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.unmount).not.toHaveBeenCalled();
      const mountCalls = patchCalls.filter((c) => c.n1 === null);
      expect(mountCalls.length).toBe(1);
    });

    it('仅删除节点', () => {
      const c1 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const c2 = [createVNode('div', { key: 'a' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.unmount).toHaveBeenCalledTimes(1);
      expect(unmountCalls[0].vnode).toBe(c1[1]);
    });
  });

  // ----------------------------------------------------------
  // patchUnkeyedChildren
  // ----------------------------------------------------------
  describe('patchUnkeyedChildren', () => {
    it('同类型应逐个 patch', () => {
      const c1 = [createVNode('div', null, 'a'), createVNode('span', null, 'b')];
      const c2 = [createVNode('div', null, 'a-updated'), createVNode('span', null, 'b-updated')];
      const container = document.createElement('div');

      patchUnkeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(2);
      expect(mockOps.unmount).not.toHaveBeenCalled();
    });

    it('类型不匹配应卸载+挂载', () => {
      const c1 = [createVNode('div', null, 'a')];
      const c2 = [createVNode('span', null, 'b')];
      const container = document.createElement('div');

      patchUnkeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.unmount).toHaveBeenCalledTimes(1);
      expect(patchCalls[0].n1).toBeNull(); // mount
    });

    it('新列表更长应挂载剩余', () => {
      const c1 = [createVNode('div', null, 'a')];
      const c2 = [createVNode('div', null, 'a'), createVNode('div', null, 'b')];
      const container = document.createElement('div');

      patchUnkeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(2);
      expect(patchCalls[1].n1).toBeNull();
    });

    it('旧列表更长应卸载剩余', () => {
      const c1 = [createVNode('div', null, 'a'), createVNode('div', null, 'b')];
      const c2 = [createVNode('div', null, 'a')];
      const container = document.createElement('div');

      patchUnkeyedChildren(c1, c2, container, null, null, false);

      expect(mockOps.patch).toHaveBeenCalledTimes(1);
      expect(mockOps.unmount).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------
  // Int32Array 验证
  // ----------------------------------------------------------
  describe('Int32Array optimization', () => {
    it('空旧列表 → 新列表应全部挂载', () => {
      const c1: any[] = [];
      const c2 = [createVNode('div', { key: 'a' }), createVNode('div', { key: 'b' })];
      const container = document.createElement('div');

      patchKeyedChildren(c1, c2, container, null, null, false);

      expect(patchCalls).toHaveLength(2);
      expect(patchCalls[0].n1).toBeNull();
      expect(patchCalls[1].n1).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // fallbackAnchor
  // ----------------------------------------------------------
  describe('fallbackAnchor', () => {
    it('应使用 fallbackAnchor 作为锚点', () => {
      const c1: any[] = [];
      const c2 = [createVNode('div', { key: 'a' })];
      const container = document.createElement('div');
      const anchor = document.createComment('end');

      patchKeyedChildren(c1, c2, container, null, null, false, anchor);

      expect(patchCalls[0].anchor).toBe(anchor);
    });
  });
});
