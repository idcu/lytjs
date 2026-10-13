/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * tests/index.test.ts
 * Tests for @lytjs/common-render-queue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RenderQueue } from '../src/index';
import type {
  RendererHost,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,
} from '@lytjs/host-contract';

// ============================================================
// Mock RendererHost
// ============================================================

function createMockHost(): RendererHost<object, object> {
  return {
    createElement: vi.fn(() => ({
      tagName: 'div',
      classList: new Set<string>(),
      style: {} as any,
    })),
    createText: vi.fn(() => ({ nodeType: 3, textContent: '' })),
    createComment: vi.fn(() => ({ nodeType: 8, textContent: '' })),
    setElementText: vi.fn(),
    setText: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
    nextSibling: vi.fn(() => null),
    parentNode: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    patchProp: vi.fn(),
    addClass: vi.fn((el: any, cls: string) => (el as any).classList.add(cls)),
    removeClass: vi.fn((el: any, cls: string) => (el as any).classList.delete(cls)),
    hasClass: vi.fn((el: any, cls: string) => (el as any).classList.has(cls)),
    setStyle: vi.fn(),
    removeStyle: vi.fn(),
    getComputedStyle: vi.fn(() => ({ getPropertyValue: () => '' })),
    forceReflow: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 100,
      height: 50,
      right: 100,
      bottom: 50,
    })),
    getAttribute: vi.fn(() => null),
    getTransitionInfo: vi.fn(
      (): TransitionDurationInfo => ({ duration: 300, hasTransition: true, hasAnimation: false }),
    ),
    nextFrame: vi.fn((fn) => setTimeout(fn, 0)),
    setTimeout: vi.fn((fn, ms) => {
      const id = Date.now() + Math.random();
      setTimeout(fn, ms);
      return id as unknown as number;
    }),
    clearTimeout: vi.fn(),
    getNamespaceURI: vi.fn(() => null),
    replaceChild: vi.fn(),
    getChildNodes: vi.fn(() => []),
    getNodeType: vi.fn(() => 1),
    getTagName: vi.fn(() => 'div'),
  };
}

function createMockVNode(type: string = 'div') {
  return { type, props: null, children: null };
}

/** 已挂载的 VNode（带 el）——用于验证 insert / remove / move 的真实执行 */
function createMountedVNode(type: string = 'div') {
  return { type, props: null, children: null, el: { tagName: type } };
}

// ============================================================
// RenderQueue
// ============================================================

describe('RenderQueue', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('should create an instance', () => {
    const queue = new RenderQueue(host);
    expect(queue.size).toBe(0);
  });

  it('should enqueue a custom operation', () => {
    const queue = new RenderQueue(host);
    const fn = vi.fn();
    queue.enqueue({ type: 'custom', fn });
    expect(queue.size).toBe(1);
  });

  it('should execute operations on flush', async () => {
    const queue = new RenderQueue(host);
    const fn = vi.fn();
    queue.enqueue({ type: 'custom', fn });
    // Wait for the setTimeout(0) to fire
    await new Promise((r) => setTimeout(r, 50));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(0);
  });

  it('should execute operations synchronously via flushSync', () => {
    const queue = new RenderQueue(host);
    const fn = vi.fn();
    queue.enqueue({ type: 'custom', fn });
    expect(fn).not.toHaveBeenCalled();
    queue.flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should merge duplicate remove operations for the same element', () => {
    const queue = new RenderQueue(host, { enableMerge: true });
    // 用已挂载的 vnode：本用例只验证合并，但异步 flush 会真正执行 remove，
    // 未挂载的 vnode 会触发（正确的）报错日志，干扰测试输出。
    const vnode = createMountedVNode('div');
    queue.enqueue({ type: 'remove', vnode });
    queue.enqueue({ type: 'remove', vnode });
    expect(queue.size).toBe(1);
  });

  it('should merge duplicate insert operations for the same element type', () => {
    const queue = new RenderQueue(host, { enableMerge: true });
    const vnode1 = createMountedVNode('div');
    const vnode2 = createMountedVNode('div');
    queue.enqueue({ type: 'insert', vnode: vnode1, container: null });
    queue.enqueue({ type: 'insert', vnode: vnode2, container: null });
    expect(queue.size).toBe(2); // insert 不合并（只有 remove 合并）
  });

  it('should not merge when enableMerge is false', () => {
    const queue = new RenderQueue(host, { enableMerge: false });
    const vnode = createMountedVNode('div');
    queue.enqueue({ type: 'remove', vnode });
    queue.enqueue({ type: 'remove', vnode });
    expect(queue.size).toBe(2);
  });

  it('should clear the queue without executing', () => {
    const queue = new RenderQueue(host);
    const fn = vi.fn();
    queue.enqueue({ type: 'custom', fn });
    queue.clear();
    expect(queue.size).toBe(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should dispose the queue', () => {
    const queue = new RenderQueue(host);
    queue.enqueue({ type: 'custom', fn: vi.fn() });
    queue.dispose();
    expect(queue.size).toBe(0);
  });
});

// ============================================================
// P1-2 回归（2026-10-10）
//
// 此前 insert / remove / move / patch 在 executeOperation 里全是 no-op
// （只在 __DEV__ 下 warn）—— 调用方按类型入队，运行时什么都不发生。
// 下面以「宿主方法是否被真正调用」为判据。
// ============================================================

describe('RenderQueue P1-2：insert / remove / move 必须真正执行', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('insert 应调用 host.insert(child, container, anchor)', () => {
    const queue = new RenderQueue(host);
    const vnode = createMountedVNode('div');
    const container = { tagName: 'body' };

    queue.enqueue({ type: 'insert', vnode, container, anchor: null });
    queue.flushSync();

    expect(host.insert).toHaveBeenCalledTimes(1);
    expect(host.insert).toHaveBeenCalledWith(vnode.el, container, null);
  });

  it('remove 应调用 host.remove(child)', () => {
    const queue = new RenderQueue(host);
    const vnode = createMountedVNode('div');

    queue.enqueue({ type: 'remove', vnode });
    queue.flushSync();

    expect(host.remove).toHaveBeenCalledTimes(1);
    expect(host.remove).toHaveBeenCalledWith(vnode.el);
  });

  it('move 应调用 host.insert 把节点搬到新位置', () => {
    const queue = new RenderQueue(host);
    const vnode = createMountedVNode('span');
    const container = { tagName: 'body' };
    const anchor = { tagName: 'p' };

    queue.enqueue({ type: 'move', vnode, container, anchor });
    queue.flushSync();

    expect(host.insert).toHaveBeenCalledTimes(1);
    expect(host.insert).toHaveBeenCalledWith(vnode.el, container, anchor);
  });

  it('vnode.el 为空时应抛错（而不是静默跳过），且不吞掉后续操作', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const queue = new RenderQueue(host, { enableMerge: false });
    const notMounted = createMockVNode('div'); // 没有 el
    const fn = vi.fn();

    queue.enqueue({ type: 'insert', vnode: notMounted, container: null });
    queue.enqueue({ type: 'custom', fn });
    queue.flushSync();

    // 坏操作被兜底记录
    expect(errorSpy).toHaveBeenCalled();
    // 但后续操作照常执行（此前无兜底，一处抛错会丢掉整批）
    expect(fn).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
