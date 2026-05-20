 
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  registerComponentEventListener,
  registerComponentEffectSubscription,
  registerComponentCleanup,
  cleanupComponentResources,
} from '../src/unmount';
import type { ResourceCleanupRenderer } from '../src/unmount';

describe('unmount - 组件资源自动清理', () => {
  // 模拟渲染器
  const mockRenderer: ResourceCleanupRenderer = {
    removeEventListener: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---- registerComponentEventListener ----
  describe('registerComponentEventListener', () => {
    it('应注册事件监听器并在清理时调用 removeEventListener', () => {
      const component = {};
      const el = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
      const handler = vi.fn();

      registerComponentEventListener(component, el, 'click', handler);
      cleanupComponentResources(mockRenderer, component);

      expect(mockRenderer.removeEventListener).toHaveBeenCalledWith(
        el,
        'click',
        handler,
        undefined,
      );
    });

    it('应支持传入 options', () => {
      const component = {};
      const el = {};
      const handler = vi.fn();
      const options = { capture: true };

      registerComponentEventListener(component, el, 'click', handler, options);
      cleanupComponentResources(mockRenderer, component);

      expect(mockRenderer.removeEventListener).toHaveBeenCalledWith(el, 'click', handler, options);
    });

    it('应支持同一组件注册多个事件监听器', () => {
      const component = {};
      const el = {};
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registerComponentEventListener(component, el, 'click', handler1);
      registerComponentEventListener(component, el, 'scroll', handler2);
      cleanupComponentResources(mockRenderer, component);

      expect(mockRenderer.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });

  // ---- registerComponentEffectSubscription ----
  describe('registerComponentEffectSubscription', () => {
    it('应注册 effect 订阅并在清理时调用 dispose', () => {
      const component = {};
      const dispose = vi.fn();

      registerComponentEffectSubscription(component, dispose);
      cleanupComponentResources(mockRenderer, component);

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('应支持同一组件注册多个 effect 订阅', () => {
      const component = {};
      const dispose1 = vi.fn();
      const dispose2 = vi.fn();

      registerComponentEffectSubscription(component, dispose1);
      registerComponentEffectSubscription(component, dispose2);
      cleanupComponentResources(mockRenderer, component);

      expect(dispose1).toHaveBeenCalledTimes(1);
      expect(dispose2).toHaveBeenCalledTimes(1);
    });
  });

  // ---- registerComponentCleanup ----
  describe('registerComponentCleanup', () => {
    it('应注册 cleanup 钩子并在清理时执行', () => {
      const component = {};
      const cleanup = vi.fn();

      registerComponentCleanup(component, cleanup);
      cleanupComponentResources(mockRenderer, component);

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  // ---- cleanupComponentResources ----
  describe('cleanupComponentResources', () => {
    it('应按 cleanup -> effect -> event 顺序清理', () => {
      const component = {};
      const order: string[] = [];

      registerComponentCleanup(component, () => order.push('cleanup'));
      registerComponentEffectSubscription(component, () => order.push('effect'));
      registerComponentEventListener(component, {}, 'click', () => {});

      // Mock removeEventListener 以记录调用顺序
      mockRenderer.removeEventListener = vi.fn(() => order.push('event'));

      cleanupComponentResources(mockRenderer, component);

      expect(order).toEqual(['cleanup', 'effect', 'event']);
    });

    it('单个清理失败不应阻断其余清理流程', () => {
      const component = {};
      const cleanup1 = vi.fn(() => {
        throw new Error('cleanup error');
      });
      const cleanup2 = vi.fn();
      const dispose = vi.fn();

      registerComponentCleanup(component, cleanup1);
      registerComponentCleanup(component, cleanup2);
      registerComponentEffectSubscription(component, dispose);

      expect(() => cleanupComponentResources(mockRenderer, component)).not.toThrow();
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('对无注册资源的组件调用清理不应报错', () => {
      const component = {};
      expect(() => cleanupComponentResources(mockRenderer, component)).not.toThrow();
    });

    it('清理后再次调用不应重复清理', () => {
      const component = {};
      const cleanup = vi.fn();

      registerComponentCleanup(component, cleanup);
      cleanupComponentResources(mockRenderer, component);
      cleanupComponentResources(mockRenderer, component);

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('不同组件的资源应相互隔离', () => {
      const componentA = {};
      const componentB = {};
      const cleanupA = vi.fn();
      const cleanupB = vi.fn();

      registerComponentCleanup(componentA, cleanupA);
      registerComponentCleanup(componentB, cleanupB);

      cleanupComponentResources(mockRenderer, componentA);

      expect(cleanupA).toHaveBeenCalledTimes(1);
      expect(cleanupB).not.toHaveBeenCalled();
    });

    it('effect dispose 失败不应阻断事件监听器清理', () => {
      const component = {};
      const dispose = vi.fn(() => {
        throw new Error('effect error');
      });

      registerComponentEffectSubscription(component, dispose);
      registerComponentEventListener(component, {}, 'click', vi.fn());

      expect(() => cleanupComponentResources(mockRenderer, component)).not.toThrow();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(mockRenderer.removeEventListener).toHaveBeenCalledTimes(1);
    });

    it('事件监听器清理失败不应影响其他事件监听器', () => {
      const component = {};
      const el1 = {};
      const el2 = {};

      registerComponentEventListener(component, el1, 'click', vi.fn());
      registerComponentEventListener(component, el2, 'scroll', vi.fn());

      mockRenderer.removeEventListener = vi.fn((el: unknown) => {
        if (el === el1) throw new Error('remove error');
      });

      expect(() => cleanupComponentResources(mockRenderer, component)).not.toThrow();
      expect(mockRenderer.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });
});
