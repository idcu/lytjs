/**
 * tests/index.test.ts
 * Tests for @lytjs/common-async-scheduler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsyncScheduler } from '../src/index';
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

// ============================================================
// AsyncScheduler
// ============================================================

describe('AsyncScheduler', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('should create an instance', () => {
    const scheduler = new AsyncScheduler(host);
    expect(scheduler.size).toBe(0);
  });

  it('should schedule a task and return a job id', () => {
    const scheduler = new AsyncScheduler(host);
    const id = scheduler.schedule(vi.fn());
    expect(typeof id).toBe('number');
    expect(scheduler.size).toBe(1);
  });

  it('should execute tasks asynchronously', async () => {
    const scheduler = new AsyncScheduler(host);
    const fn = vi.fn();
    scheduler.schedule(fn);
    await new Promise((r) => setTimeout(r, 50));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(scheduler.size).toBe(0);
  });

  it('should execute tasks synchronously via flushSync', () => {
    const scheduler = new AsyncScheduler(host);
    const fn = vi.fn();
    scheduler.schedule(fn);
    scheduler.flushSync();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect priority ordering', () => {
    const scheduler = new AsyncScheduler(host);
    const order: string[] = [];
    scheduler.schedule(() => order.push('low'), 'low');
    scheduler.schedule(() => order.push('high'), 'high');
    scheduler.schedule(() => order.push('normal'), 'normal');
    scheduler.schedule(() => order.push('sync'), 'sync');
    scheduler.flushSync();
    expect(order).toEqual(['sync', 'high', 'normal', 'low']);
  });

  it('should scheduleSync execute immediately', () => {
    const scheduler = new AsyncScheduler(host);
    const fn = vi.fn();
    scheduler.scheduleSync(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should clear the queue without executing', () => {
    const scheduler = new AsyncScheduler(host);
    const fn = vi.fn();
    scheduler.schedule(fn);
    scheduler.clear();
    expect(scheduler.size).toBe(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should dispose the scheduler', () => {
    const scheduler = new AsyncScheduler(host);
    scheduler.schedule(vi.fn());
    scheduler.dispose();
    expect(scheduler.size).toBe(0);
  });

  it('should handle task execution errors gracefully', () => {
    const scheduler = new AsyncScheduler(host);
    const errorFn = () => {
      throw new Error('task error');
    };
    const normalFn = vi.fn();
    scheduler.schedule(errorFn);
    scheduler.schedule(normalFn);
    // Should not throw even if a task fails
    expect(() => scheduler.flushSync()).not.toThrow();
    expect(normalFn).toHaveBeenCalledTimes(1);
  });
});
