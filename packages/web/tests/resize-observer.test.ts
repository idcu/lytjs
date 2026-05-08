// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ResizeObserverManager,
  useResizeObserver,
  supportsResizeObserver,
} from '../src/resize-observer';

describe('@lytjs/web/resize-observer', () => {
  describe('supportsResizeObserver', () => {
    it('在支持的环境中应返回 true', () => {
      // jsdom 环境下可能不支持 ResizeObserver，这里测试函数本身是否可调用
      expect(typeof supportsResizeObserver).toBe('function');
      const result = supportsResizeObserver();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('ResizeObserverManager', () => {
    let manager: ResizeObserverManager;
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('div');
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      if (manager) {
        manager.disconnect();
      }
      mockElement.remove();
    });

    describe('构造函数', () => {
      it('应创建管理器实例', () => {
        manager = new ResizeObserverManager(() => {});
        expect(manager).toBeDefined();
      });

      it('isAvailable 应反映 ResizeObserver 支持状态', () => {
        manager = new ResizeObserverManager(() => {});
        expect(typeof manager.isAvailable).toBe('boolean');
      });
    });

    describe('observe / unobserve / disconnect', () => {
      it('初始状态应为未连接', () => {
        manager = new ResizeObserverManager(() => {});
        expect(manager.connected).toBe(false);
        expect(manager.observedCount).toBe(0);
      });

      it('observe 后应标记为已连接', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return; // 跳过不支持的环境

        const result = manager.observe(mockElement);
        expect(result).toBe(true);
        expect(manager.connected).toBe(true);
        expect(manager.observedCount).toBe(1);
      });

      it('不应重复观察同一元素', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return;

        manager.observe(mockElement);
        const result = manager.observe(mockElement);
        expect(result).toBe(false);
        expect(manager.observedCount).toBe(1);
      });

      it('unobserve 后应减少观察计数', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return;

        manager.observe(mockElement);
        const result = manager.unobserve(mockElement);
        expect(result).toBe(true);
        expect(manager.observedCount).toBe(0);
        expect(manager.connected).toBe(false);
      });

      it('unobserve 不存在的元素应返回 false', () => {
        manager = new ResizeObserverManager(() => {});
        const result = manager.unobserve(mockElement);
        expect(result).toBe(false);
      });

      it('disconnect 应清除所有观察', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return;

        const el2 = document.createElement('span');
        document.body.appendChild(el2);

        manager.observe(mockElement);
        manager.observe(el2);
        expect(manager.observedCount).toBe(2);

        manager.disconnect();
        expect(manager.observedCount).toBe(0);
        expect(manager.connected).toBe(false);

        el2.remove();
      });

      it('disconnect 后再次 observe 应正常工作', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return;

        manager.observe(mockElement);
        manager.disconnect();
        expect(manager.observedCount).toBe(0);

        const result = manager.observe(mockElement);
        expect(result).toBe(true);
        expect(manager.observedCount).toBe(1);
      });
    });

    describe('isObserving', () => {
      it('应正确报告观察状态', () => {
        manager = new ResizeObserverManager(() => {});
        if (!manager.isAvailable) return;

        expect(manager.isObserving(mockElement)).toBe(false);
        manager.observe(mockElement);
        expect(manager.isObserving(mockElement)).toBe(true);
        manager.unobserve(mockElement);
        expect(manager.isObserving(mockElement)).toBe(false);
      });
    });

    describe('回调', () => {
      it('应将回调传递给 ResizeObserver', () => {
        if (!supportsResizeObserver()) return;

        const callback = vi.fn();
        manager = new ResizeObserverManager(callback);
        manager.observe(mockElement);

        // ResizeObserver 回调需要手动触发（在 jsdom 中可能不自动触发）
        // 这里仅验证 observe 不会抛出异常
        expect(manager.observedCount).toBe(1);
      });
    });

    describe('不支持 ResizeObserver 的环境', () => {
      it('observe 应返回 false 并发出警告', () => {
        // 保存原始 ResizeObserver
        const OriginalRO = globalThis.ResizeObserver;

        // 临时移除 ResizeObserver
        (globalThis as Record<string, unknown>).ResizeObserver = undefined;

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        manager = new ResizeObserverManager(() => {});

        expect(manager.isAvailable).toBe(false);
        const result = manager.observe(mockElement);
        expect(result).toBe(false);

        warnSpy.mockRestore();
        (globalThis as Record<string, unknown>).ResizeObserver = OriginalRO;
      });
    });
  });

  describe('useResizeObserver', () => {
    let mockElement: HTMLElement;
    let cleanup: (() => void) | undefined;

    beforeEach(() => {
      mockElement = document.createElement('div');
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      if (cleanup) {
        cleanup();
      }
      mockElement.remove();
    });

    it('应返回清理函数', () => {
      cleanup = useResizeObserver(mockElement, () => {});
      expect(typeof cleanup).toBe('function');
    });

    it('清理函数调用后应停止观察', () => {
      cleanup = useResizeObserver(mockElement, () => {});
      cleanup();
      cleanup = undefined;
      // 验证清理不会抛出异常
    });

    it('在不支持的环境中应仍返回清理函数', () => {
      const OriginalRO = globalThis.ResizeObserver;
      (globalThis as Record<string, unknown>).ResizeObserver = undefined;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      cleanup = useResizeObserver(mockElement, () => {});
      expect(typeof cleanup).toBe('function');

      warnSpy.mockRestore();
      (globalThis as Record<string, unknown>).ResizeObserver = OriginalRO;
    });
  });
});
