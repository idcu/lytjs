/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * tests/index.test.ts
 * Tests for @lytjs/common-transition-engine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransitionEngine } from '../src/index';
import type {
  RendererHost,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  HostRect,
  TransitionDurationInfo,
} from '@lytjs/host-contract';
import type { TransitionProps } from '@lytjs/vdom/transition';

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
      expect(record.first).toEqual({
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        right: 100,
        bottom: 50,
      });
    });

    it('should record last state and compute invert', () => {
      const engine = new TransitionEngine(host);
      const el = {};
      const record = engine.flipRecordFirst(el);

      // Simulate position change
      (host.getBoundingClientRect as any).mockReturnValueOnce({
        left: 20,
        top: 10,
        width: 100,
        height: 50,
        right: 120,
        bottom: 60,
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
