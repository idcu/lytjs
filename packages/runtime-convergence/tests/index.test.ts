/**
 * tests/index.test.ts
 * Tests for @lytjs/runtime-convergence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RenderQueue,
  EventNormalizer,
  NodeCache,
  AsyncScheduler,
  TransitionEngine,
} from '../src/index';
import type {
  RendererHost,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  HostRect,
  TransitionDurationInfo,
} from '@lytjs/host-contract';
import type { VNode, ComponentInstance, TransitionProps } from '../src/types';

// ============================================================
// Mock RendererHost
// ============================================================

function createMockHost(): RendererHost<object, object> {
  const eventListeners: Array<{
    el: object;
    event: string;
    handler: HostEventHandler;
    options?: HostEventOptions;
  }> = [];

  return {
    createElement: vi.fn(() => ({ tagName: 'div', classList: new Set<string>(), style: {} as any })),
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
    addEventListener: vi.fn((el, event, handler, options) => {
      eventListeners.push({ el, event, handler, options });
      return () => {
        const idx = eventListeners.findIndex(
          (l) => l.el === el && l.event === event && l.handler === handler,
        );
        if (idx >= 0) eventListeners.splice(idx, 1);
      };
    }),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 })),
    getAttribute: vi.fn(() => null),
    getTransitionInfo: vi.fn((): TransitionDurationInfo => ({ duration: 300, hasTransition: true, hasAnimation: false })),
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

function createMockVNode(type: string = 'div'): VNode {
  return { type, props: null, children: null };
}

function createMockComponentInstance(uid: number = 1): ComponentInstance {
  return {
    uid,
    type: {},
    isUnmounted: false,
    vnode: createMockVNode(),
    parent: null,
    subTree: createMockVNode(),
  };
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

// ============================================================
// EventNormalizer
// ============================================================

describe('EventNormalizer', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('should create an instance', () => {
    const normalizer = new EventNormalizer(host);
    expect(normalizer).toBeDefined();
  });

  describe('normalizeEventName', () => {
    it('should normalize onClick to click', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.normalizeEventName('onClick')).toBe('click');
    });

    it('should normalize @click to click', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.normalizeEventName('@click')).toBe('click');
    });

    it('should normalize plain click to click', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.normalizeEventName('click')).toBe('click');
    });

    it('should normalize onClick.stop.prevent to click', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.normalizeEventName('onClick.stop.prevent')).toBe('click');
    });
  });

  describe('parseModifiers', () => {
    it('should parse no modifiers', () => {
      const normalizer = new EventNormalizer(host);
      const mods = normalizer.parseModifiers('onClick');
      expect(mods.stop).toBe(false);
      expect(mods.prevent).toBe(false);
      expect(mods.capture).toBe(false);
      expect(mods.once).toBe(false);
      expect(mods.self).toBe(false);
      expect(mods.passive).toBe(false);
    });

    it('should parse stop modifier', () => {
      const normalizer = new EventNormalizer(host);
      const mods = normalizer.parseModifiers('onClick.stop');
      expect(mods.stop).toBe(true);
    });

    it('should parse multiple modifiers', () => {
      const normalizer = new EventNormalizer(host);
      const mods = normalizer.parseModifiers('onClick.stop.prevent.capture');
      expect(mods.stop).toBe(true);
      expect(mods.prevent).toBe(true);
      expect(mods.capture).toBe(true);
    });
  });

  describe('parseEventName', () => {
    it('should return name and modifiers', () => {
      const normalizer = new EventNormalizer(host);
      const info = normalizer.parseEventName('onClick.stop');
      expect(info.name).toBe('click');
      expect(info.modifiers.stop).toBe(true);
    });
  });

  describe('getEventKey', () => {
    it('should convert click to onClick', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.getEventKey('click')).toBe('onClick');
    });

    it('should convert mouseenter to onMouseenter', () => {
      const normalizer = new EventNormalizer(host);
      expect(normalizer.getEventKey('mouseenter')).toBe('onMouseenter');
    });
  });

  describe('patchEvent', () => {
    it('should add event listener via host', () => {
      const normalizer = new EventNormalizer(host);
      const el = {};
      const handler: HostEventHandler = vi.fn();
      normalizer.patchEvent(el, 'onClick', handler);
      expect(host.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should update invoker value when listener already exists', () => {
      const normalizer = new EventNormalizer(host);
      const el = {};
      const handler1: HostEventHandler = vi.fn();
      const handler2: HostEventHandler = vi.fn();
      normalizer.patchEvent(el, 'onClick', handler1);
      normalizer.patchEvent(el, 'onClick', handler2);
      // Should only call addEventListener once (the second call updates the value)
      expect(host.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should remove event listener when nextValue is null', () => {
      const normalizer = new EventNormalizer(host);
      const el = {};
      const handler: HostEventHandler = vi.fn();
      normalizer.patchEvent(el, 'onClick', handler);
      normalizer.patchEvent(el, 'onClick', null);
      expect(host.removeEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllEventListeners', () => {
    it('should remove all listeners from an element', () => {
      const normalizer = new EventNormalizer(host);
      const el = {};
      normalizer.patchEvent(el, 'onClick', vi.fn());
      normalizer.patchEvent(el, 'onMouseover', vi.fn());
      normalizer.removeAllEventListeners(el);
      expect(host.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================
// NodeCache
// ============================================================

describe('NodeCache', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('should create an instance', () => {
    const cache = new NodeCache(host);
    expect(cache).toBeDefined();
  });

  describe('VNode mapping', () => {
    it('should store and retrieve a VNode', () => {
      const cache = new NodeCache(host);
      const container = {};
      const vnode = createMockVNode('div');
      cache.setVNode(container, vnode);
      expect(cache.getVNode(container)).toBe(vnode);
    });

    it('should return null for unknown container', () => {
      const cache = new NodeCache(host);
      expect(cache.getVNode({})).toBeNull();
    });

    it('should delete a VNode mapping', () => {
      const cache = new NodeCache(host);
      const container = {};
      cache.setVNode(container, createMockVNode());
      cache.deleteVNode(container);
      expect(cache.getVNode(container)).toBeNull();
    });

    it('should not store VNode when enableVNodeMap is false', () => {
      const cache = new NodeCache(host, { enableVNodeMap: false });
      const container = {};
      cache.setVNode(container, createMockVNode());
      expect(cache.getVNode(container)).toBeNull();
    });
  });

  describe('Resource registry', () => {
    it('should register and cleanup event listeners', () => {
      const cache = new NodeCache(host);
      const instance = createMockComponentInstance(1);
      const el = {};
      const handler: HostEventHandler = vi.fn();
      cache.registerEventListener(instance, el, 'click', handler);
      cache.cleanupComponentResources(instance);
      expect(host.removeEventListener).toHaveBeenCalledWith(el, 'click', handler, undefined);
    });

    it('should register and cleanup effect subscriptions', () => {
      const cache = new NodeCache(host);
      const instance = createMockComponentInstance(2);
      const disposer = vi.fn();
      cache.registerEffectSubscription(instance, disposer);
      cache.cleanupComponentResources(instance);
      expect(disposer).toHaveBeenCalledTimes(1);
    });

    it('should register and cleanup cleanup hooks', () => {
      const cache = new NodeCache(host);
      const instance = createMockComponentInstance(3);
      const cleanup = vi.fn();
      cache.registerCleanup(instance, cleanup);
      cache.cleanupComponentResources(instance);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should not register resources when enableResourceRegistry is false', () => {
      const cache = new NodeCache(host, { enableResourceRegistry: false });
      const instance = createMockComponentInstance(4);
      cache.registerCleanup(instance, vi.fn());
      cache.cleanupComponentResources(instance);
      // Should not throw, just skip
    });

    it('should handle cleanup errors gracefully', () => {
      const cache = new NodeCache(host);
      const instance = createMockComponentInstance(5);
      const errorFn = () => { throw new Error('cleanup error'); };
      cache.registerCleanup(instance, errorFn);
      // Should not throw even if cleanup fails
      expect(() => cache.cleanupComponentResources(instance)).not.toThrow();
    });
  });

  describe('cleanupContainer', () => {
    it('should remove the VNode mapping for a container', () => {
      const cache = new NodeCache(host);
      const container = {};
      cache.setVNode(container, createMockVNode());
      cache.cleanupContainer(container);
      expect(cache.getVNode(container)).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should clear all internal state', () => {
      const cache = new NodeCache(host);
      const container = {};
      cache.setVNode(container, createMockVNode());
      cache.dispose();
      expect(cache.getVNode(container)).toBeNull();
    });
  });
});

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
    const errorFn = () => { throw new Error('task error'); };
    const normalFn = vi.fn();
    scheduler.schedule(errorFn);
    scheduler.schedule(normalFn);
    // Should not throw even if a task fails
    expect(() => scheduler.flushSync()).not.toThrow();
    expect(normalFn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// TransitionEngine
// ============================================================

describe('TransitionEngine', () => {
  let host: RendererHost<object, object>;

  beforeEach(() => {
    host = createMockHost();
  });

  it('should create an instance', () => {
    const engine = new TransitionEngine(host);
    expect(engine).toBeDefined();
  });

  describe('getState', () => {
    it('should return idle state for new element', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      const state = engine.getState(el);
      expect(state.phase).toBe('idle');
      expect(state.cancelled).toBe(false);
      expect(state.doneCallback).toBeNull();
    });
  });

  describe('isTransitioning', () => {
    it('should return false for idle element', () => {
      const engine = new TransitionEngine(host);
      expect(engine.isTransitioning({})).toBe(false);
    });
  });

  describe('performEnter', () => {
    it('should call onBeforeEnter hook', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const onBeforeEnter = vi.fn();
      const props = { name: 'v', onBeforeEnter } as unknown as TransitionProps<object>;

      engine.performEnter(el, props, vi.fn());

      expect(onBeforeEnter).toHaveBeenCalledWith(el);
    });

    it('should add enter-from and enter-active classes', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const props = { name: 'test' } as unknown as TransitionProps<object>;

      engine.performEnter(el, props, vi.fn());

      expect(host.addClass).toHaveBeenCalledWith(el, 'test-enter-from');
      expect(host.addClass).toHaveBeenCalledWith(el, 'test-enter-active');
    });

    it('should call onEnter hook if provided', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const onEnter = vi.fn((_el: any, done: () => void) => done());
      const props = { name: 'v', onEnter } as unknown as TransitionProps<object>;

      engine.performEnter(el, props, vi.fn());

      expect(onEnter).toHaveBeenCalledWith(el, expect.any(Function));
    });

    it('should finish enter and call onAfterEnter', async () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const onAfterEnter = vi.fn();
      const done = vi.fn();
      const props = {
        name: 'v',
        onAfterEnter,
      } as unknown as TransitionProps<object>;

      // Make getTransitionInfo report no transition so finishEnter is called immediately
      (host.getTransitionInfo as any).mockReturnValueOnce({
        duration: 0,
        hasTransition: false,
        hasAnimation: false,
      });

      engine.performEnter(el, props, done);

      // No transition -> finishEnter called synchronously
      expect(host.removeClass).toHaveBeenCalledWith(el, 'v-enter-active');
      expect(host.removeClass).toHaveBeenCalledWith(el, 'v-enter-to');
      expect(onAfterEnter).toHaveBeenCalledWith(el);
      // Note: doneCallback is stored but finishEnter does not invoke it;
      // the upper layer (component) is responsible for calling done.
    });
  });

  describe('performLeave', () => {
    it('should call onBeforeLeave hook', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const onBeforeLeave = vi.fn();
      const props = { name: 'v', onBeforeLeave } as unknown as TransitionProps<object>;

      engine.performLeave(el, props, vi.fn());

      expect(onBeforeLeave).toHaveBeenCalledWith(el);
    });

    it('should add leave-from and leave-active classes', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const props = { name: 'test' } as unknown as TransitionProps<object>;

      engine.performLeave(el, props, vi.fn());

      expect(host.addClass).toHaveBeenCalledWith(el, 'test-leave-from');
      expect(host.addClass).toHaveBeenCalledWith(el, 'test-leave-active');
    });
  });

  describe('cancelTransition', () => {
    it('should cancel an active transition', () => {
      const engine = new TransitionEngine(host);
      const el = { classList: new Set<string>() };
      const done = vi.fn();

      // Start a transition
      engine.performEnter(el, { name: 'v' } as unknown as TransitionProps<object>, done);

      // Cancel it
      engine.cancelTransition(el);

      expect(engine.isTransitioning(el)).toBe(false);
    });

    it('should do nothing for idle element', () => {
      const engine = new TransitionEngine(host);
      expect(() => engine.cancelTransition({})).not.toThrow();
    });
  });

  describe('FLIP animation', () => {
    it('should record first state', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      const record = engine.flipRecordFirst(el);
      expect(record.el).toBe(el);
      expect(record.first).toEqual({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 });
    });

    it('should record last state and compute invert', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      const record = engine.flipRecordFirst(el);

      // Simulate position change
      (host.getBoundingClientRect as any).mockReturnValueOnce({
        left: 20, top: 10, width: 100, height: 50, right: 120, bottom: 60,
      });

      const updated = engine.flipRecordLast(record);
      expect(updated.invert.x).toBe(-20); // 0 - 20
      expect(updated.invert.y).toBe(-10); // 0 - 10
    });

    it('should execute flipPlay', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      const record: any = {
        el,
        first: { left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 },
        last: { left: 20, top: 10, width: 100, height: 50, right: 120, bottom: 60 },
        invert: { x: -20, y: -10 },
        play: null,
      };

      engine.flipPlay(record, 300);
      expect(host.setStyle).toHaveBeenCalledWith(el, 'transform', 'translate(-20px, -10px)');
    });

    it('should skip FLIP when enableFLIP is false', () => {
      const engine = new TransitionEngine(host, { enableFLIP: false });
      const el = {};
      const updateFn = vi.fn();
      engine.flip(el, updateFn);
      expect(updateFn).toHaveBeenCalled();
      expect(host.getBoundingClientRect).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should clear all internal state', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      engine.getState(el);
      engine.dispose();
      expect(engine.isTransitioning(el)).toBe(false);
    });
  });
});
