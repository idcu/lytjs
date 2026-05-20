/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  reactive,
  effect,
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from '../src';

describe('首次渲染优化 (First Render Optimization)', () => {
  beforeEach(() => {
    resetSkippedTrackingCount();
  });

  describe('shouldSkipTracking', () => {
    it('应在 withFirstRenderOptimization 期间返回 true', () => {
      expect(shouldSkipTracking()).toBe(false);
      withFirstRenderOptimization(() => {
        expect(shouldSkipTracking()).toBe(true);
      });
      expect(shouldSkipTracking()).toBe(false);
    });

    it('应在嵌套调用中保持 true', () => {
      withFirstRenderOptimization(() => {
        expect(shouldSkipTracking()).toBe(true);
        withFirstRenderOptimization(() => {
          expect(shouldSkipTracking()).toBe(true);
        });
        expect(shouldSkipTracking()).toBe(true);
      });
      expect(shouldSkipTracking()).toBe(false);
    });
  });

  describe('withFirstRenderOptimization', () => {
    it('应在首次渲染期间跳过 track 调用', () => {
      const obj = reactive({ count: 0 });
      let effectRunCount = 0;

      // 首次渲染：不收集依赖
      withFirstRenderOptimization(() => {
        effect(() => {
          effectRunCount++;
          void obj.count; // 访问响应式属性
        });
      });

      const skippedBefore = getSkippedTrackingCount();
      expect(skippedBefore).toBeGreaterThan(0);

      // 修改值，effect 不应触发（因为首次渲染期间没有收集依赖）
      obj.count = 1;
      expect(effectRunCount).toBe(1); // 只有初始执行，没有触发更新
    });

    it('应在正常模式下收集依赖', () => {
      const obj = reactive({ count: 0 });
      let effectRunCount = 0;

      effect(() => {
        effectRunCount++;
        void obj.count;
      });

      expect(effectRunCount).toBe(1);
      obj.count = 1;
      expect(effectRunCount).toBe(2);
      obj.count = 2;
      expect(effectRunCount).toBe(3);
    });

    it('应正确返回函数结果', () => {
      const result = withFirstRenderOptimization(() => {
        return 42;
      });
      expect(result).toBe(42);
    });

    it('应在异常后正确恢复标志位', () => {
      expect(shouldSkipTracking()).toBe(false);

      try {
        withFirstRenderOptimization(() => {
          throw new Error('test error');
        });
      } catch {
        // expected
      }

      expect(shouldSkipTracking()).toBe(false);
    });
  });

  describe('getSkippedTrackingCount / resetSkippedTrackingCount', () => {
    it('应统计被跳过的追踪次数', () => {
      const obj = reactive({ a: 1, b: 2, c: 3 });
      resetSkippedTrackingCount();

      withFirstRenderOptimization(() => {
        effect(() => {
          void obj.a;
          void obj.b;
          void obj.c;
        });
      });

      expect(getSkippedTrackingCount()).toBeGreaterThan(0);
    });

    it('resetSkippedTrackingCount 应清零计数', () => {
      const obj = reactive({ x: 1 });

      withFirstRenderOptimization(() => {
        effect(() => {
          void obj.x;
        });
      });

      expect(getSkippedTrackingCount()).toBeGreaterThan(0);
      resetSkippedTrackingCount();
      expect(getSkippedTrackingCount()).toBe(0);
    });
  });

  describe('首次渲染后更新应正常工作', () => {
    it('首次渲染跳过依赖后，后续 effect 应正常收集', () => {
      const obj = reactive({ value: 'hello' });
      let effectRunCount = 0;

      // 模拟首次渲染：跳过依赖收集
      withFirstRenderOptimization(() => {
        effect(() => {
          effectRunCount++;
          void obj.value;
        });
      });

      const countAfterFirstRender = effectRunCount;
      obj.value = 'world';
      // 首次渲染期间没有收集依赖，所以更新不触发 effect
      expect(effectRunCount).toBe(countAfterFirstRender);

      // 创建新的 effect（模拟后续渲染），应正常收集依赖
      resetSkippedTrackingCount();
      effect(() => {
        effectRunCount++;
        void obj.value;
      });

      obj.value = 'updated';
      expect(effectRunCount).toBeGreaterThan(countAfterFirstRender + 1);
    });
  });
});
