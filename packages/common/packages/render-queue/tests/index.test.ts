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
    const vnode = createMockVNode('div');
    queue.enqueue({ type: 'remove', vnode });
    queue.enqueue({ type: 'remove', vnode });
    expect(queue.size).toBe(1);
  });

  it('should merge duplicate patch operations for the same element type', () => {
    const queue = new RenderQueue(host, { enableMerge: true });
    const oldVNode = createMockVNode('div');
    const newVNode1 = createMockVNode('div');
    const newVNode2 = createMockVNode('div');
    queue.enqueue({ type: 'patch', oldVNode, newVNode: newVNode1, container: null });
    queue.enqueue({ type: 'patch', oldVNode, newVNode: newVNode2, container: null });
    expect(queue.size).toBe(1);
  });

  it('should not merge when enableMerge is false', () => {
    const queue = new RenderQueue(host, { enableMerge: false });
    const vnode = createMockVNode('div');
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
