/**
 * @lytjs/plugin-animation - GPU 加速测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  to3DTransform,
  canUseGPU,
  enableGPUAcceleration,
  disableGPUAcceleration,
  GPU_PRESETS,
  PerformanceOptimizer,
  getGlobalOptimizer,
  resetGlobalOptimizer,
  type GPUAccelerationOptions,
} from '../src/gpu-acceleration';

describe('GPU Acceleration', () => {
  describe('to3DTransform', () => {
    it('should convert translateX to translate3d', () => {
      const result = to3DTransform('translateX(100px)');
      expect(result).toBe('translate3d(100px, 0, 0)');
    });

    it('should convert translateY to translate3d', () => {
      const result = to3DTransform('translateY(50px)');
      expect(result).toBe('translate3d(0, 50px, 0)');
    });

    it('should convert translate to translate3d', () => {
      const result = to3DTransform('translate(100px, 50px)');
      expect(result).toBe('translate3d(100px, 50px, 0)');
    });

    it('should convert scale to scale3d', () => {
      const result = to3DTransform('scale(2)');
      expect(result).toBe('scale3d(2, 2, 1)');
    });

    it('should convert scale(x, y) to scale3d', () => {
      const result = to3DTransform('scale(2, 3)');
      expect(result).toBe('scale3d(2, 3, 1)');
    });

    it('should handle combined transforms', () => {
      const result = to3DTransform('translateX(100px) scale(2)');
      expect(result).toBe('translate3d(100px, 0, 0) scale3d(2, 2, 1)');
    });

    it('should return original string for unrecognized transforms', () => {
      const result = to3DTransform('rotate(45deg)');
      expect(result).toBe('rotate(45deg)');
    });
  });

  describe('canUseGPU', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        writable: true,
      });
    });

    it('should return true in browser environment', () => {
      const element = document.createElement('div');
      expect(canUseGPU(element)).toBe(true);
    });

    it('should return false in non-browser environment', () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', { value: undefined });

      const element = document.createElement('div');
      expect(canUseGPU(element)).toBe(false);

      Object.defineProperty(globalThis, 'window', { value: originalWindow });
    });
  });

  describe('enableGPUAcceleration', () => {
    it('should set willChange style', () => {
      const element = document.createElement('div') as HTMLElement;

      enableGPUAcceleration(element);

      expect(element.style.willChange).toBe('transform');
      expect(element.style.backfaceVisibility).toBe('hidden');
      expect(element.style.perspective).toBe('1000px');
    });

    it('should use custom willChange option', () => {
      const element = document.createElement('div') as HTMLElement;
      const options: GPUAccelerationOptions = { willChange: 'opacity' };

      enableGPUAcceleration(element, options);

      expect(element.style.willChange).toBe('opacity');
    });

    it('should use custom perspective option', () => {
      const element = document.createElement('div') as HTMLElement;
      const options: GPUAccelerationOptions = { willChange: 'transform' };

      enableGPUAcceleration(element, options);

      expect(element.style.perspective).toBe('1000px');
    });
  });

  describe('disableGPUAcceleration', () => {
    it('should reset GPU acceleration styles', () => {
      const element = document.createElement('div') as HTMLElement;

      enableGPUAcceleration(element);
      disableGPUAcceleration(element);

      expect(element.style.willChange).toBe('auto');
      expect(element.style.backfaceVisibility).toBe('');
      expect(element.style.perspective).toBe('');
    });
  });

  describe('GPU_PRESETS', () => {
    it('should have gpuSlideIn preset', () => {
      expect(GPU_PRESETS.gpuSlideIn).toBeDefined();
      expect(GPU_PRESETS.gpuSlideIn.from).toHaveProperty('transform');
      expect(GPU_PRESETS.gpuSlideIn.to).toHaveProperty('transform');
    });

    it('should have gpuSlideOut preset', () => {
      expect(GPU_PRESETS.gpuSlideOut).toBeDefined();
      expect(GPU_PRESETS.gpuSlideOut.from).toHaveProperty('transform');
      expect(GPU_PRESETS.gpuSlideOut.to).toHaveProperty('transform');
    });

    it('should have gpuZoomIn preset', () => {
      expect(GPU_PRESETS.gpuZoomIn).toBeDefined();
    });

    it('should have gpuZoomOut preset', () => {
      expect(GPU_PRESETS.gpuZoomOut).toBeDefined();
    });

    it('should have rotate3d presets', () => {
      expect(GPU_PRESETS.rotate3dIn).toBeDefined();
      expect(GPU_PRESETS.rotate3dOut).toBeDefined();
    });

    it('should have elasticBounce preset', () => {
      expect(GPU_PRESETS.elasticBounce).toBeDefined();
    });

    it('should have flip presets', () => {
      expect(GPU_PRESETS.flipIn).toBeDefined();
      expect(GPU_PRESETS.flipOut).toBeDefined();
    });

    it('should use translate3d in GPU presets', () => {
      expect(GPU_PRESETS.gpuSlideIn.from.transform).toContain('translate3d');
      expect(GPU_PRESETS.gpuZoomIn.from.transform).toContain('translate3d');
    });
  });

  describe('PerformanceOptimizer', () => {
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      optimizer = new PerformanceOptimizer();
    });

    afterEach(() => {
      optimizer.cleanup();
    });

    it('should be GPU available by default in browser', () => {
      expect(optimizer.isGPUAvailable()).toBe(true);
    });

    it('should track animation', () => {
      optimizer.trackAnimation('anim-1');
      expect(optimizer.getActiveAnimationCount()).toBe(1);
    });

    it('should untrack animation', () => {
      optimizer.trackAnimation('anim-1');
      optimizer.trackAnimation('anim-2');
      optimizer.untrackAnimation('anim-1');
      expect(optimizer.getActiveAnimationCount()).toBe(1);
    });

    it('should handle batched updates', () => {
      const update1 = vi.fn();
      const update2 = vi.fn();

      optimizer.batchAnimation('anim-1', update1);
      optimizer.batchAnimation('anim-2', update2);

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(update1).toHaveBeenCalled();
          expect(update2).toHaveBeenCalled();
          resolve(undefined);
        }, 50);
      });
    });

    it('should cleanup properly', () => {
      optimizer.trackAnimation('anim-1');
      optimizer.batchAnimation('anim-1', vi.fn());

      optimizer.cleanup();

      expect(optimizer.getActiveAnimationCount()).toBe(0);
    });

    it('should detect GPU-friendly properties', () => {
      expect(optimizer.shouldUseGPU(['transform'])).toBe(true);
      expect(optimizer.shouldUseGPU(['opacity'])).toBe(true);
      expect(optimizer.shouldUseGPU(['transform', 'opacity'])).toBe(true);
      expect(optimizer.shouldUseGPU(['width'])).toBe(false);
    });

    it('should optimize element for GPU', () => {
      const element = document.createElement('div') as HTMLElement;

      optimizer.optimizeElement(element);

      expect(element.style.willChange).toBe('transform');
    });
  });

  describe('Global Optimizer', () => {
    afterEach(() => {
      resetGlobalOptimizer();
    });

    it('should return same instance for multiple calls', () => {
      const optimizer1 = getGlobalOptimizer();
      const optimizer2 = getGlobalOptimizer();
      expect(optimizer1).toBe(optimizer2);
    });

    it('should reset global optimizer', () => {
      const optimizer1 = getGlobalOptimizer();
      resetGlobalOptimizer();
      const optimizer2 = getGlobalOptimizer();
      expect(optimizer1).not.toBe(optimizer2);
    });
  });
});
