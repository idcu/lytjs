/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * tests/index.test.ts
 * Tests for @lytjs/common-node-cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeCache } from '../src/index';
import type {
  RendererHost,
  HostEventHandler,
  HostEventOptions,
  TransitionDurationInfo,
} from '@lytjs/host-contract';
import type { VNode, ComponentInstance } from '../src/index';

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
      const errorFn = () => {
        throw new Error('cleanup error');
      };
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
