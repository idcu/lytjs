/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * tests/index.test.ts
 * Tests for @lytjs/common-event-normalizer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventNormalizer } from '../src/index';
import type {
  RendererHost,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,
} from '@lytjs/host-contract';

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
