/**
 * @lytjs/common-performance
 * Performance monitoring API for component render timing
 * FIX: P2-11 RUNTIME-NEW-02 - 性能监控 API
 */

declare const __DEV__: boolean;

import { warn } from '@lytjs/common-error';

// ==================== Types ====================

/**
 * Performance entry for a single render operation
 */
export interface RenderPerformanceEntry {
  /** Component name or identifier */
  componentName: string;

  /** Type of operation */
  operation: 'mount' | 'patch' | 'unmount';

  /** Start time (high resolution timestamp) */
  startTime: number;

  /** End time (high resolution timestamp) */
  endTime: number;

  /** Duration in milliseconds */
  duration: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Component performance statistics
 */
export interface ComponentPerformanceStats {
  /** Component name */
  componentName: string;

  /** Number of mount operations */
  mountCount: number;

  /** Number of patch (update) operations */
  patchCount: number;

  /** Number of unmount operations */
  unmountCount: number;

  /** Total time spent in mount operations (ms) */
  totalMountTime: number;

  /** Total time spent in patch operations (ms) */
  totalPatchTime: number;

  /** Total time spent in unmount operations (ms) */
  totalUnmountTime: number;

  /** Average mount time (ms) */
  averageMountTime: number;

  /** Average patch time (ms) */
  averagePatchTime: number;

  /** Average unmount time (ms) */
  averageUnmountTime: number;

  /** Maximum mount time (ms) */
  maxMountTime: number;

  /** Maximum patch time (ms) */
  maxPatchTime: number;

  /** Maximum unmount time (ms) */
  maxUnmountTime: number;

  /** Last render timestamp */
  lastRenderTime: number;
}

/**
 * Performance monitor options
 */
export interface PerformanceMonitorOptions {
  /** Maximum number of entries to keep in history */
  maxHistorySize?: number;

  /** Whether to enable monitoring by default */
  enabled?: boolean;

  /** Callback when a new entry is recorded */
  onEntry?: (entry: RenderPerformanceEntry) => void;

  /** Callback when stats are updated */
  onStatsUpdate?: (stats: ComponentPerformanceStats) => void;
}

// ==================== Performance Monitor Class ====================

/**
 * PerformanceMonitor - Tracks component render performance
 *
 * @example
 * ```ts
 * const monitor = new PerformanceMonitor({ maxHistorySize: 100 });
 *
 * // Start timing a render
 * const endTiming = monitor.startTiming('MyComponent', 'patch');
 *
 * // ... perform render ...
 *
 * // End timing
 * endTiming();
 *
 * // Get stats
 * const stats = monitor.getStats('MyComponent');
 * console.log(`Average render time: ${stats?.averagePatchTime}ms`);
 * ```
 */
export class PerformanceMonitor {
  // FIX: P2-v11-17 使用环形缓冲区替代数组 + shift()，
  // 避免 history.shift() 的 O(n) 时间复杂度
  private historyBuffer: (RenderPerformanceEntry | null)[] = [];
  private historyHead = 0;
  private historyCount = 0;
  private stats: Map<string, ComponentPerformanceStats> = new Map();
  private options: Required<PerformanceMonitorOptions>;
  private _enabled: boolean;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      maxHistorySize: options.maxHistorySize ?? 1000,
      enabled: options.enabled ?? true,
      onEntry: options.onEntry ?? (() => {}),
      onStatsUpdate: options.onStatsUpdate ?? (() => {}),
    };
    this._enabled = this.options.enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Enable or disable monitoring
   */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * Start timing a render operation.
   * Returns a function that should be called when the operation completes.
   *
   * @param componentName - Name of the component being rendered
   * @param operation - Type of operation (mount, patch, unmount)
   * @param metadata - Optional metadata to attach to the entry
   * @returns A function to end the timing
   *
   * @example
   * ```ts
   * const endTiming = monitor.startTiming('MyComponent', 'patch');
   * // ... render logic ...
   * endTiming({ propsChanged: true });
   * ```
   */
  startTiming(
    componentName: string,
    operation: 'mount' | 'patch' | 'unmount',
    metadata?: Record<string, unknown>,
  ): (endMetadata?: Record<string, unknown>) => RenderPerformanceEntry | null {
    if (!this._enabled) {
      return () => null;
    }

    // FIX: P2-v11-16 添加 performance.now() 回退，
    // 在非浏览器环境（如 SSR、Node.js）中使用 Date.now() 替代
    const getTimestamp = (): number => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      return Date.now();
    };

    const startTime = getTimestamp();

    return (endMetadata?: Record<string, unknown>) => {
      const endTime = getTimestamp();
      const duration = endTime - startTime;

      const entry: RenderPerformanceEntry = {
        componentName,
        operation,
        startTime,
        endTime,
        duration,
        metadata: { ...metadata, ...endMetadata },
      };

      this.recordEntry(entry);
      return entry;
    };
  }

  /**
   * Record a performance entry directly
   */
  recordEntry(entry: RenderPerformanceEntry): void {
    if (!this._enabled) return;

    // FIX: P2-v11-17 使用环形缓冲区写入，O(1) 操作
    if (this.historyBuffer.length < this.options.maxHistorySize) {
      this.historyBuffer.push(entry);
      this.historyCount++;
    } else {
      this.historyBuffer[this.historyHead] = entry;
      this.historyHead = (this.historyHead + 1) % this.options.maxHistorySize;
      // historyCount 保持为 maxHistorySize
    }

    // Update stats
    this.updateStats(entry);

    // Notify callback
    this.options.onEntry(entry);
  }

  /**
   * Update statistics for a component
   */
  private updateStats(entry: RenderPerformanceEntry): void {
    const { componentName, operation, duration } = entry;

    let stats = this.stats.get(componentName);
    if (!stats) {
      stats = {
        componentName,
        mountCount: 0,
        patchCount: 0,
        unmountCount: 0,
        totalMountTime: 0,
        totalPatchTime: 0,
        totalUnmountTime: 0,
        averageMountTime: 0,
        averagePatchTime: 0,
        averageUnmountTime: 0,
        maxMountTime: 0,
        maxPatchTime: 0,
        maxUnmountTime: 0,
        lastRenderTime: Date.now(),
      };
      this.stats.set(componentName, stats);
    }

    // Update counters and times
    switch (operation) {
      case 'mount':
        stats.mountCount++;
        stats.totalMountTime += duration;
        stats.averageMountTime = stats.totalMountTime / stats.mountCount;
        stats.maxMountTime = Math.max(stats.maxMountTime, duration);
        break;
      case 'patch':
        stats.patchCount++;
        stats.totalPatchTime += duration;
        stats.averagePatchTime = stats.totalPatchTime / stats.patchCount;
        stats.maxPatchTime = Math.max(stats.maxPatchTime, duration);
        break;
      case 'unmount':
        stats.unmountCount++;
        stats.totalUnmountTime += duration;
        stats.averageUnmountTime = stats.totalUnmountTime / stats.unmountCount;
        stats.maxUnmountTime = Math.max(stats.maxUnmountTime, duration);
        break;
    }

    stats.lastRenderTime = Date.now();
    this.options.onStatsUpdate(stats);
  }

  /**
   * Get performance statistics for a specific component
   */
  getStats(componentName: string): ComponentPerformanceStats | undefined {
    return this.stats.get(componentName);
  }

  /**
   * Get all component statistics
   */
  getAllStats(): ComponentPerformanceStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get performance history
   * FIX: P2-v11-17 从环形缓冲区读取历史记录
   */
  getHistory(): RenderPerformanceEntry[] {
    const result: RenderPerformanceEntry[] = [];
    for (let i = 0; i < this.historyCount; i++) {
      const idx = (this.historyHead + i) % this.historyBuffer.length;
      const entry = this.historyBuffer[idx];
      if (entry) result.push(entry);
    }
    return result;
  }

  /**
   * Get history for a specific component
   */
  getComponentHistory(componentName: string): RenderPerformanceEntry[] {
    return this.getHistory().filter((entry) => entry.componentName === componentName);
  }

  /**
   * Get history for a specific operation type
   */
  getOperationHistory(operation: 'mount' | 'patch' | 'unmount'): RenderPerformanceEntry[] {
    return this.getHistory().filter((entry) => entry.operation === operation);
  }

  /**
   * Get the slowest renders
   */
  getSlowestRenders(limit: number = 10): RenderPerformanceEntry[] {
    return this.getHistory()
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get average render time across all components
   */
  getGlobalAverageRenderTime(): number {
    const history = this.getHistory();
    if (history.length === 0) return 0;
    const total = history.reduce((sum, entry) => sum + entry.duration, 0);
    return total / history.length;
  }

  /**
   * Get total render time across all components
   */
  getGlobalTotalRenderTime(): number {
    return this.getHistory().reduce((sum, entry) => sum + entry.duration, 0);
  }

  /**
   * Clear all history and stats
   * FIX: P2 统一 clear/clearComponent 策略：使用 fill(null) 预分配固定大小缓冲区，
   * 与 clearComponent 保持一致的环形缓冲区重建方式，避免 clear 后缓冲区大小丢失
   */
  clear(): void {
    this.historyBuffer = new Array(this.options.maxHistorySize).fill(null);
    this.historyHead = 0;
    this.historyCount = 0;
    this.stats.clear();
  }

  /**
   * Clear history and stats for a specific component
   */
  clearComponent(componentName: string): boolean {
    // FIX: P2-batch2-12 修复 clearComponent 破坏环形缓冲区的问题。
    // 原实现直接将过滤后的数组赋值给 historyBuffer 并重置 head/tail，
    // 但丢失了环形缓冲区的固定大小约束。正确做法是重建固定大小的缓冲区。
    const filtered = this.getHistory().filter((entry) => entry.componentName !== componentName);
    // 重建固定大小的环形缓冲区
    this.historyBuffer = new Array(this.options.maxHistorySize).fill(null);
    this.historyHead = 0;
    this.historyCount = filtered.length;
    for (let i = 0; i < filtered.length; i++) {
      // FIX: DTS build error - 类型匹配
      this.historyBuffer[i] = filtered[i] as RenderPerformanceEntry | null;
    }
    return this.stats.delete(componentName);
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const allStats = this.getAllStats();
    const history = this.getHistory();
    const totalRenders = history.length;
    const totalRenderTime = this.getGlobalTotalRenderTime();
    const averageRenderTime = this.getGlobalAverageRenderTime();

    // Find slowest component
    const slowestComponent = allStats.length > 0
      ? allStats.reduce((slowest, current) => {
          const currentAvg = current.averagePatchTime || current.averageMountTime;
          const slowestAvg = slowest.averagePatchTime || slowest.averageMountTime;
          return currentAvg > slowestAvg ? current : slowest;
        })
      : null;

    // Find most rendered component
    const mostRenderedComponent = allStats.length > 0
      ? allStats.reduce((most, current) =>
          current.patchCount > most.patchCount ? current : most
        )
      : null;

    return {
      timestamp: Date.now(),
      totalRenders,
      totalRenderTime,
      averageRenderTime,
      componentCount: allStats.length,
      slowestComponent: slowestComponent?.componentName ?? null,
      mostRenderedComponent: mostRenderedComponent?.componentName ?? null,
      componentStats: allStats,
    };
  }
}

/**
 * Performance report structure
 */
export interface PerformanceReport {
  /** Report generation timestamp */
  timestamp: number;

  /** Total number of render operations */
  totalRenders: number;

  /** Total time spent rendering (ms) */
  totalRenderTime: number;

  /** Average render time (ms) */
  averageRenderTime: number;

  /** Number of unique components tracked */
  componentCount: number;

  /** Name of the slowest component (by average render time) */
  slowestComponent: string | null;

  /** Name of the most rendered component */
  mostRenderedComponent: string | null;

  /** Detailed stats for each component */
  componentStats: ComponentPerformanceStats[];
}

// ==================== Global Instance ====================

/** Global performance monitor instance */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get the global performance monitor instance
 * Creates one if it doesn't exist
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Set the global performance monitor instance
 */
export function setPerformanceMonitor(monitor: PerformanceMonitor): void {
  globalMonitor = monitor;
}

/**
 * Initialize the global performance monitor with options
 */
export function initPerformanceMonitor(options: PerformanceMonitorOptions = {}): PerformanceMonitor {
  globalMonitor = new PerformanceMonitor(options);
  return globalMonitor;
}

// ==================== Convenience Functions ====================

/**
 * Start timing a component render operation using the global monitor
 */
export function startRenderTiming(
  componentName: string,
  operation: 'mount' | 'patch' | 'unmount',
  metadata?: Record<string, unknown>,
): (endMetadata?: Record<string, unknown>) => RenderPerformanceEntry | null {
  return getPerformanceMonitor().startTiming(componentName, operation, metadata);
}

/**
 * Record a render entry using the global monitor
 */
export function recordRenderEntry(entry: RenderPerformanceEntry): void {
  getPerformanceMonitor().recordEntry(entry);
}

/**
 * Get component stats from the global monitor
 */
export function getComponentStats(componentName: string): ComponentPerformanceStats | undefined {
  return getPerformanceMonitor().getStats(componentName);
}

/**
 * Generate a performance report from the global monitor
 */
export function generatePerformanceReport(): PerformanceReport {
  return getPerformanceMonitor().generateReport();
}

/**
 * Check if performance monitoring is enabled
 */
export function isPerformanceMonitoringEnabled(): boolean {
  return globalMonitor?.enabled ?? false;
}

/**
 * Enable or disable performance monitoring
 */
export function setPerformanceMonitoringEnabled(enabled: boolean): void {
  const monitor = getPerformanceMonitor();
  monitor.enabled = enabled;
}

// ==================== Decorator / Wrapper ====================

/**
 * Wrap a render function with performance monitoring
 *
 * @example
 * ```ts
 * const monitoredRender = withPerformanceTracking('MyComponent', (props) => {
 *   return h('div', props.content);
 * });
 * ```
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => unknown>(
  componentName: string,
  renderFn: T,
  operation: 'mount' | 'patch' | 'unmount' = 'patch',
): T {
  return ((...args: unknown[]) => {
    const endTiming = startRenderTiming(componentName, operation);
    try {
      const result = renderFn(...args);
      endTiming();
      return result;
    } catch (error) {
      endTiming({ error: true });
      throw error;
    }
  }) as T;
}

// ==================== DevTools Integration ====================

/**
 * Connect performance monitor to browser DevTools
 * Only works in development mode
 */
export function connectToDevTools(): void {
  if (typeof window === 'undefined') return;

  // Expose monitor to window for DevTools access
  // FIX: DTS build error - 先转换为 unknown 再转换为 Record
  (window as unknown as Record<string, unknown>).__LYTJS_PERFORMANCE_MONITOR__ = getPerformanceMonitor();

  // Mark initialization for DevTools detection
  (window as unknown as Record<string, unknown>).__LYTJS_DEVTOOLS_HOOK__ = true;

  if (__DEV__) {
    // FIX: P1-14 删除 require 调用，直接使用顶部已导入的 warn
    warn('Performance monitor connected to DevTools');
  }
}
