/**
 * @lytjs/plugin-animation - GPU 加速增强
 *
 * 提供高性能的 GPU 加速动画支持
 */

/**
 * GPU 加速配置
 */
export interface GPUAccelerationOptions {
  enable3D?: boolean;
  willChange?: 'auto' | 'transform' | 'opacity' | 'scroll-position';
  force3D?: boolean;
  compositorThreshold?: number;
}

const DEFAULT_GPU_OPTIONS: GPUAccelerationOptions = {
  enable3D: true,
  willChange: 'transform',
  force3D: false,
  compositorThreshold: 0.001,
};

/**
 * 将 2D transform 转换为 3D（启用 GPU 加速）
 */
export function to3DTransform(transform: string): string {
  return transform.replace(/translateX\(([^)]+)\)/g, 'translate3d($1, 0, 0)')
    .replace(/translateY\(([^)]+)\)/g, 'translate3d(0, $1, 0)')
    .replace(/translate\(([^,]+),\s*([^)]+)\)/g, 'translate3d($1, $2, 0)')
    .replace(/scale\(([^)]+)\)/g, 'scale3d($1, $1, 1)')
    .replace(/scale\(([^,]+),\s*([^)]+)\)/g, 'scale3d($1, $2, 1)');
}

/**
 * 检测元素是否支持 GPU 加速
 */
export function canUseGPU(element: Element): boolean {
  const el = element as HTMLElement;
  
  if (typeof window === 'undefined') return false;
  
  const noGPU = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (noGPU) {
    const hasGPU = el.style.transform !== undefined;
    return hasGPU;
  }
  
  return true;
}

/**
 * 为元素启用 GPU 加速
 */
export function enableGPUAcceleration(
  element: HTMLElement,
  options: GPUAccelerationOptions = DEFAULT_GPU_OPTIONS,
): void {
  const { willChange = 'transform' } = options;
  
  element.style.willChange = willChange;
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
}

/**
 * 禁用元素的 GPU 加速
 */
export function disableGPUAcceleration(element: HTMLElement): void {
  element.style.willChange = 'auto';
  element.style.backfaceVisibility = '';
  element.style.perspective = '';
}

/**
 * GPU 加速的预设动画
 */
export const GPU_PRESETS = {
  /**
   * 快速滑入（GPU 加速）
   */
  gpuSlideIn: {
    from: { 
      transform: 'translate3d(0, -100%, 0)', 
      opacity: 0 
    },
    to: { 
      transform: 'translate3d(0, 0, 0)', 
      opacity: 1 
    },
  },

  /**
   * 快速滑出（GPU 加速）
   */
  gpuSlideOut: {
    from: { 
      transform: 'translate3d(0, 0, 0)', 
      opacity: 1 
    },
    to: { 
      transform: 'translate3d(0, -100%, 0)', 
      opacity: 0 
    },
  },

  /**
   * 缩放进入（GPU 加速）
   */
  gpuZoomIn: {
    from: { 
      transform: 'translate3d(-50%, -50%, 0) scale(0)', 
      opacity: 0 
    },
    to: { 
      transform: 'translate3d(-50%, -50%, 0) scale(1)', 
      opacity: 1 
    },
  },

  /**
   * 缩放离开（GPU 加速）
   */
  gpuZoomOut: {
    from: { 
      transform: 'translate3d(-50%, -50%, 0) scale(1)', 
      opacity: 1 
    },
    to: { 
      transform: 'translate3d(-50%, -50%, 0) scale(0)', 
      opacity: 0 
    },
  },

  /**
   * 3D 旋转进入
   */
  rotate3dIn: {
    from: { 
      transform: 'rotate3d(0, 1, 0, 90deg)',
      opacity: 0 
    },
    to: { 
      transform: 'rotate3d(0, 0, 0, 0deg)',
      opacity: 1 
    },
  },

  /**
   * 3D 旋转离开
   */
  rotate3dOut: {
    from: { 
      transform: 'rotate3d(0, 0, 0, 0deg)',
      opacity: 1 
    },
    to: { 
      transform: 'rotate3d(0, 1, 0, 90deg)',
      opacity: 0 
    },
  },

  /**
   * 弹性弹跳（GPU 加速）
   */
  elasticBounce: {
    '0%': { 
      transform: 'translate3d(0, 0, 0) scale(1)', 
      opacity: 1 
    },
    '30%': { 
      transform: 'translate3d(0, -30px, 0) scale(1.1)', 
      opacity: 1 
    },
    '50%': { 
      transform: 'translate3d(0, -15px, 0) scale(0.95)', 
      opacity: 1 
    },
    '70%': { 
      transform: 'translate3d(0, -7px, 0) scale(1.02)', 
      opacity: 1 
    },
    '100%': { 
      transform: 'translate3d(0, 0, 0) scale(1)', 
      opacity: 1 
    },
  },

  /**
   * 翻转进入
   */
  flipIn: {
    from: { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, 90deg)',
      opacity: 0 
    },
    '40%': { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, -10deg)',
      opacity: 1 
    },
    '100%': { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, 0deg)',
      opacity: 1 
    },
  },

  /**
   * 翻转离开
   */
  flipOut: {
    from: { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, 0deg)',
      opacity: 1 
    },
    '30%': { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, 20deg)',
      opacity: 1 
    },
    '100%': { 
      transform: 'perspective(400px) rotate3d(1, 0, 0, -90deg)',
      opacity: 0 
    },
  },
};

/**
 * 性能优化工具
 */
export class PerformanceOptimizer {
  private gpuEnabled: boolean;
  private options: GPUAccelerationOptions;
  private activeAnimations: Set<string> = new Set();
  private rafId: number | null = null;
  private batchedUpdates: Map<string, () => void> = new Map();

  constructor(options: GPUAccelerationOptions = DEFAULT_GPU_OPTIONS) {
    this.options = { ...DEFAULT_GPU_OPTIONS, ...options };
    this.gpuEnabled = this.checkGPUAvailability();
  }

  private checkGPUAvailability(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  isGPUAvailable(): boolean {
    return this.gpuEnabled;
  }

  shouldUseGPU(properties: string[]): boolean {
    if (!this.gpuEnabled) return false;
    
    const gpuFriendly = ['transform', 'opacity', 'filter'];
    
    return properties.every(prop => 
      gpuFriendly.some(gpuProp => prop.toLowerCase().includes(gpuProp))
    );
  }

  optimizeElement(element: HTMLElement): void {
    if (this.shouldUseGPU(['transform', 'opacity'])) {
      enableGPUAcceleration(element, this.options);
    }
  }

  batchAnimation(id: string, update: () => void): void {
    this.batchedUpdates.set(id, update);
    
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flushBatchedUpdates();
      });
    }
  }

  private flushBatchedUpdates(): void {
    this.batchedUpdates.forEach(update => update());
    this.batchedUpdates.clear();
    this.rafId = null;
  }

  trackAnimation(id: string): void {
    this.activeAnimations.add(id);
  }

  untrackAnimation(id: string): void {
    this.activeAnimations.delete(id);
  }

  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.batchedUpdates.clear();
    this.activeAnimations.clear();
  }
}

/**
 * 创建全局性能优化器实例
 */
let globalOptimizer: PerformanceOptimizer | null = null;

export function getGlobalOptimizer(): PerformanceOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new PerformanceOptimizer();
  }
  return globalOptimizer;
}

export function resetGlobalOptimizer(options?: GPUAccelerationOptions): void {
  if (globalOptimizer) {
    globalOptimizer.cleanup();
  }
  globalOptimizer = new PerformanceOptimizer(options);
}
