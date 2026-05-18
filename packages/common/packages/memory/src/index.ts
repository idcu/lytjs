/**
 * @lytjs/common-memory
 * Memory optimization utilities including object pool, memory leak detection
 * FIX: P6.4-MEMORY-01 - v6.4 内存优化
 */

declare const __DEV__: boolean;

// ==================== Types ====================

/**
 * Object pool configuration
 */
export interface ObjectPoolConfig<T> {
  /** Maximum pool size */
  maxSize: number;
  /** Factory function to create new objects */
  create: () => T;
  /** Reset function to clean up objects when released */
  reset?: (obj: T) => void;
  /** Validate function to check if object is reusable */
  validate?: (obj: T) => boolean;
  /** Warmup: pre-allocate this many objects */
  warmupSize?: number;
}

/**
 * Object pool statistics
 */
export interface ObjectPoolStats {
  /** Total number of objects created */
  totalCreated: number;
  /** Number of times an object was acquired from pool */
  hitCount: number;
  /** Number of times a new object had to be created */
  missCount: number;
  /** Current pool size */
  poolSize: number;
  /** Maximum pool size reached */
  maxPoolSizeReached: number;
  /** Hit rate percentage */
  hitRate: number;
}

/**
 * Memory leak detector configuration
 */
export interface MemoryLeakDetectorConfig {
  /** Check interval in milliseconds */
  checkInterval?: number;
  /** Warning threshold for retained objects */
  warningThreshold?: number;
  /** Enable stack trace capture */
  captureStackTrace?: boolean;
}

/**
 * Leak report entry
 */
export interface LeakReportEntry {
  /** Object type/identifier */
  type: string;
  /** Number of retained objects */
  count: number;
  /** Stack trace where objects were allocated */
  stackTraces?: string[];
  /** Timestamp of first allocation */
  firstSeen: number;
  /** Timestamp of last allocation */
  lastSeen: number;
}

/**
 * Memory report
 */
export interface MemoryReport {
  /** Timestamp of report generation */
  timestamp: number;
  /** Total tracked objects */
  totalTracked: number;
  /** Potential leaks */
  potentialLeaks: LeakReportEntry[];
  /** Memory usage estimate (if available) */
  memoryUsage?: {
    used: number;
    total: number;
  };
}

// ==================== Object Pool ====================

/**
 * Generic object pool for reducing GC pressure
 *
 * @example
 * ```ts
 * const pool = new ObjectPool({
 *   maxSize: 100,
 *   create: () => ({ x: 0, y: 0 }),
 *   reset: (obj) => { obj.x = 0; obj.y = 0; }
 * });
 *
 * const obj = pool.acquire();
 * // use obj...
 * pool.release(obj);
 * ```
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private config: Required<ObjectPoolConfig<T>>;
  private stats: Omit<ObjectPoolStats, 'hitRate'>;

  constructor(config: ObjectPoolConfig<T>) {
    this.config = {
      maxSize: config.maxSize,
      create: config.create,
      reset: config.reset || (() => {}),
      validate: config.validate || (() => true),
      warmupSize: config.warmupSize || 0,
    };

    this.stats = {
      totalCreated: 0,
      hitCount: 0,
      missCount: 0,
      poolSize: 0,
      maxPoolSizeReached: 0,
    };

    // Warmup the pool
    if (this.config.warmupSize > 0) {
      this.warmup(this.config.warmupSize);
    }
  }

  /**
   * Pre-allocate objects in the pool
   */
  warmup(count: number): void {
    const toCreate = Math.min(count, this.config.maxSize - this.pool.length);
    for (let i = 0; i < toCreate; i++) {
      const obj = this.config.create();
      this.stats.totalCreated++;
      this.pool.push(obj);
    }
    this.stats.poolSize = this.pool.length;
    this.stats.maxPoolSizeReached = Math.max(this.stats.maxPoolSizeReached, this.pool.length);
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      if (this.config.validate(obj)) {
        this.stats.hitCount++;
        this.stats.poolSize = this.pool.length;
        return obj;
      }
    }

    // Pool is empty or validation failed, create new
    this.stats.missCount++;
    this.stats.totalCreated++;
    return this.config.create();
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    if (!obj) return;

    this.config.reset(obj);

    if (this.pool.length < this.config.maxSize) {
      this.pool.push(obj);
      this.stats.poolSize = this.pool.length;
      this.stats.maxPoolSizeReached = Math.max(this.stats.maxPoolSizeReached, this.pool.length);
    }
  }

  /**
   * Release multiple objects back to the pool
   */
  releaseMany(objs: T[]): void {
    for (const obj of objs) {
      this.release(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): ObjectPoolStats {
    const total = this.stats.hitCount + this.stats.missCount;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hitCount / total) * 100 : 0,
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
    this.stats.poolSize = 0;
  }

  /**
   * Resize the pool
   */
  resize(newMaxSize: number): void {
    this.config.maxSize = newMaxSize;
    while (this.pool.length > newMaxSize) {
      this.pool.pop();
    }
    this.stats.poolSize = this.pool.length;
  }
}

// ==================== Memory Leak Detector ====================

/**
 * Memory leak detector for tracking object retention
 * Only active in development mode
 */
export class MemoryLeakDetector {
  private trackedObjects = new Map<string, {
    count: number;
    firstSeen: number;
    lastSeen: number;
    stackTraces: Set<string>;
  }>();
  private config: Required<MemoryLeakDetectorConfig>;
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;

  constructor(config: MemoryLeakDetectorConfig = {}) {
    this.config = {
      checkInterval: config.checkInterval || 5000,
      warningThreshold: config.warningThreshold || 100,
      captureStackTrace: config.captureStackTrace ?? __DEV__,
    };
  }

  /**
   * Start tracking objects
   */
  start(): void {
    if (!__DEV__) return;

    this.enabled = true;
    this.checkTimer = setInterval(() => {
      this.checkLeaks();
    }, this.config.checkInterval);
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.enabled = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Track an object allocation
   */
  track(type: string, obj: unknown): void {
    if (!this.enabled || !__DEV__) return;

    const existing = this.trackedObjects.get(type);
    const now = Date.now();
    const stackTrace = this.config.captureStackTrace ? new Error().stack || '' : '';

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      if (stackTrace) {
        existing.stackTraces.add(stackTrace);
      }
    } else {
      this.trackedObjects.set(type, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        stackTraces: stackTrace ? new Set([stackTrace]) : new Set(),
      });
    }
  }

  /**
   * Mark an object as released
   */
  release(type: string): void {
    if (!this.enabled || !__DEV__) return;

    const existing = this.trackedObjects.get(type);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  /**
   * Check for potential leaks
   */
  private checkLeaks(): void {
    const leaks: LeakReportEntry[] = [];

    for (const [type, data] of this.trackedObjects.entries()) {
      if (data.count > this.config.warningThreshold) {
        leaks.push({
          type,
          count: data.count,
          stackTraces: Array.from(data.stackTraces).slice(0, 5),
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
        });
      }
    }

    if (leaks.length > 0) {
      console.warn('[LytJS Memory Leak Detector] Potential leaks detected:', leaks);
    }
  }

  /**
   * Generate a memory report
   */
  generateReport(): MemoryReport {
    const potentialLeaks: LeakReportEntry[] = [];
    let totalTracked = 0;

    for (const [type, data] of this.trackedObjects.entries()) {
      totalTracked += data.count;
      if (data.count > this.config.warningThreshold) {
        potentialLeaks.push({
          type,
          count: data.count,
          stackTraces: Array.from(data.stackTraces).slice(0, 5),
          firstSeen: data.firstSeen,
          lastSeen: data.lastSeen,
        });
      }
    }

    const report: MemoryReport = {
      timestamp: Date.now(),
      totalTracked,
      potentialLeaks,
    };

    // Try to get memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mu = process.memoryUsage();
      report.memoryUsage = {
        used: mu.heapUsed,
        total: mu.heapTotal,
      };
    } else if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      report.memoryUsage = {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
      };
    }

    return report;
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.trackedObjects.clear();
  }
}

// ==================== Global Instances ====================

/** Global memory leak detector */
let globalLeakDetector: MemoryLeakDetector | null = null;

/**
 * Get the global memory leak detector
 */
export function getMemoryLeakDetector(): MemoryLeakDetector {
  if (!globalLeakDetector) {
    globalLeakDetector = new MemoryLeakDetector();
  }
  return globalLeakDetector;
}

/**
 * Start memory leak detection
 */
export function startMemoryLeakDetection(config?: MemoryLeakDetectorConfig): void {
  const detector = getMemoryLeakDetector();
  if (config) {
    // Update config
    Object.assign((detector as any).config, config);
  }
  detector.start();
}

/**
 * Stop memory leak detection
 */
export function stopMemoryLeakDetection(): void {
  globalLeakDetector?.stop();
}

/**
 * Track object allocation
 */
export function trackObject(type: string, obj: unknown): void {
  if (__DEV__) {
    getMemoryLeakDetector().track(type, obj);
  }
}

/**
 * Track object release
 */
export function releaseObject(type: string): void {
  if (__DEV__) {
    getMemoryLeakDetector().release(type);
  }
}

// ==================== Utility Functions ====================

/**
 * Estimate memory usage of an object (rough approximation)
 */
export function estimateObjectSize(obj: unknown): number {
  const seen = new Set();
  let size = 0;

  const estimate = (val: unknown): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'boolean') return 4;
    if (typeof val === 'number') return 8;
    if (typeof val === 'string') return val.length * 2;
    if (typeof val === 'symbol') return 0;

    if (typeof val === 'object' || typeof val === 'function') {
      if (seen.has(val)) return 0;
      seen.add(val);

      let objSize = 0;

      if (Array.isArray(val)) {
        objSize += 8; // array header
        for (const item of val) {
          objSize += estimate(item);
        }
      } else if (val instanceof Map) {
        objSize += 8; // map header
        for (const [k, v] of val) {
          objSize += estimate(k) + estimate(v);
        }
      } else if (val instanceof Set) {
        objSize += 8; // set header
        for (const item of val) {
          objSize += estimate(item);
        }
      } else {
        objSize += 8; // object header
        for (const key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key)) {
            objSize += key.length * 2;
            objSize += estimate((val as Record<string, unknown>)[key]);
          }
        }
      }

      return objSize;
    }

    return 0;
  };

  return estimate(obj);
}

/**
 * Force GC if available
 */
export function forceGC(): void {
  if (typeof gc === 'function') {
    gc();
  }
}

/**
 * Memory pressure monitor - alerts when memory usage is high
 */
export class MemoryPressureMonitor {
  private highPressureCallbacks: Array<(usage: { used: number; total: number; percent: number }) => void> = [];
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private thresholdPercent = 80;

  constructor(thresholdPercent: number = 80) {
    this.thresholdPercent = thresholdPercent;
  }

  start(checkInterval = 10000): void {
    this.checkTimer = setInterval(() => {
      const usage = this.getMemoryUsage();
      if (usage) {
        const percent = (usage.used / usage.total) * 100;
        if (percent > this.thresholdPercent) {
          for (const cb of this.highPressureCallbacks) {
            cb({ ...usage, percent });
          }
        }
      }
    }, checkInterval);
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  onHighPressure(callback: (usage: { used: number; total: number; percent: number }) => void): () => void {
    this.highPressureCallbacks.push(callback);
    return () => {
      const idx = this.highPressureCallbacks.indexOf(callback);
      if (idx >= 0) this.highPressureCallbacks.splice(idx, 1);
    };
  }

  private getMemoryUsage(): { used: number; total: number } | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mu = process.memoryUsage();
      return { used: mu.heapUsed, total: mu.heapTotal };
    }
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as any).memory;
      return { used: mem.usedJSHeapSize, total: mem.totalJSHeapSize };
    }
    return null;
  }
}
