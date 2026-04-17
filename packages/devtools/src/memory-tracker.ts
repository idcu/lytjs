/**
 * Lyt.js DevTools - 内存使用追踪器
 *
 * 追踪内存使用情况，提供内存趋势分析、泄漏检测和内存报告生成。
 * 使用环形缓冲区限制内存占用。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 内存快照 */
export interface MemorySnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 已使用堆大小 (bytes) */
  usedJSHeapSize: number;
  /** 总堆大小 (bytes) */
  totalJSHeapSize: number;
  /** 堆大小上限 (bytes) */
  jsHeapSizeLimit: number;
  /** 快照序号 */
  index: number;
}

/** 内存趋势数据点 */
export interface MemoryTrendPoint {
  /** 时间戳 */
  timestamp: number;
  /** 已使用堆大小 (bytes) */
  usedJSHeapSize: number;
  /** 与前一个快照的变化量 (bytes) */
  delta: number;
  /** 使用率百分比 (0-100) */
  usagePercent: number;
}

/** 内存泄漏检测结果 */
export interface MemoryLeakResult {
  /** 是否存在可能的内存泄漏 */
  hasLeak: boolean;
  /** 泄漏严重程度: 'none' | 'low' | 'medium' | 'high' */
  severity: 'none' | 'low' | 'medium' | 'high';
  /** 泄漏描述 */
  description: string;
  /** 分析的快照数量 */
  snapshotCount: number;
  /** 增长速率 (bytes/s) */
  growthRate: number;
  /** 线性回归 R^2 值（越接近 1 越可能是线性增长） */
  rSquared: number;
}

/** 内存报告 */
export interface MemoryReport {
  /** 报告生成时间 */
  generatedAt: number;
  /** 当前快照 */
  current: MemorySnapshot | null;
  /** 峰值使用量 (bytes) */
  peakUsage: number;
  /** 峰值使用量时间戳 */
  peakTimestamp: number;
  /** 平均使用量 (bytes) */
  averageUsage: number;
  /** 最低使用量 (bytes) */
  minUsage: number;
  /** 总增长量 (bytes)，第一个快照到最后一个快照 */
  totalGrowth: number;
  /** 趋势数据 */
  trend: MemoryTrendPoint[];
  /** 泄漏检测结果 */
  leakDetection: MemoryLeakResult;
  /** 快照总数 */
  snapshotCount: number;
}

/** 内存追踪器配置 */
export interface MemoryTrackerConfig {
  /** 环形缓冲区容量，默认 100 */
  bufferSize?: number;
  /** 泄漏检测的增长速率阈值 (bytes/s)，默认 1024 */
  leakGrowthThreshold?: number;
  /** 泄漏检测的 R^2 阈值，默认 0.7 */
  leakRSquaredThreshold?: number;
  /** 泄漏检测所需最少快照数，默认 5 */
  leakMinSnapshots?: number;
}

// ============================================================
// 环形缓冲区
// ============================================================

/**
 * 环形缓冲区
 *
 * 固定容量的 FIFO 队列，当容量满时自动覆盖最旧的条目。
 */
class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(undefined);
  }

  /** 添加一个条目 */
  push(item: T): void {
    const index = (this.head + this.count) % this.capacity;
    this.buffer[index] = item;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /** 获取所有条目（按时间顺序） */
  getAll(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.head + i) % this.capacity];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /** 当前条目数 */
  get size(): number {
    return this.count;
  }

  /** 是否为空 */
  get isEmpty(): boolean {
    return this.count === 0;
  }

  /** 清空缓冲区 */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.count = 0;
  }
}

// ============================================================
// MemoryTracker 类
// ============================================================

/** 默认配置 */
const DEFAULT_BUFFER_SIZE = 100;
const DEFAULT_LEAK_GROWTH_THRESHOLD = 1024;
const DEFAULT_LEAK_R_SQUARED_THRESHOLD = 0.7;
const DEFAULT_LEAK_MIN_SNAPSHOTS = 5;

/**
 * 内存使用追踪器
 *
 * 追踪内存使用情况，提供趋势分析、泄漏检测和报告生成。
 */
export class MemoryTracker {
  /** 内存快照缓冲区 */
  private snapshots: RingBuffer<MemorySnapshot>;
  /** 快照计数器（单调递增） */
  private counter: number = 0;
  /** 配置 */
  private readonly config: Required<MemoryTrackerConfig>;

  constructor(config?: MemoryTrackerConfig) {
    this.config = {
      bufferSize: config?.bufferSize ?? DEFAULT_BUFFER_SIZE,
      leakGrowthThreshold: config?.leakGrowthThreshold ?? DEFAULT_LEAK_GROWTH_THRESHOLD,
      leakRSquaredThreshold: config?.leakRSquaredThreshold ?? DEFAULT_LEAK_R_SQUARED_THRESHOLD,
      leakMinSnapshots: config?.leakMinSnapshots ?? DEFAULT_LEAK_MIN_SNAPSHOTS,
    };
    this.snapshots = new RingBuffer(this.config.bufferSize);
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 记录内存快照
   *
   * 如果浏览器支持 performance.memory，则自动采集；
   * 否则使用传入的值或返回 null。
   *
   * @param usedJSHeapSize - 已使用堆大小 (bytes)，可选
   * @param totalJSHeapSize - 总堆大小 (bytes)，可选
   * @param jsHeapSizeLimit - 堆大小上限 (bytes)，可选
   * @returns 记录的快照，如果无法获取内存信息则返回 null
   */
  trackMemoryUsage(
    usedJSHeapSize?: number,
    totalJSHeapSize?: number,
    jsHeapSizeLimit?: number,
    timestamp?: number,
  ): MemorySnapshot | null {
    // 尝试从 performance.memory 获取
    if (usedJSHeapSize === undefined) {
      const perfMemory = (performance as any).memory;
      if (perfMemory) {
        usedJSHeapSize = perfMemory.usedJSHeapSize;
        totalJSHeapSize = perfMemory.totalJSHeapSize;
        jsHeapSizeLimit = perfMemory.jsHeapSizeLimit;
      }
    }

    if (usedJSHeapSize === undefined) {
      return null;
    }

    const snapshot: MemorySnapshot = {
      timestamp: timestamp ?? Date.now(),
      usedJSHeapSize,
      totalJSHeapSize: totalJSHeapSize ?? 0,
      jsHeapSizeLimit: jsHeapSizeLimit ?? 0,
      index: this.counter++,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * 获取内存趋势数据
   *
   * @returns 趋势数据点数组
   */
  getMemoryTrend(): MemoryTrendPoint[] {
    const all = this.snapshots.getAll();
    if (all.length === 0) return [];

    return all.map((snapshot, i) => {
      const prev = i > 0 ? all[i - 1] : null;
      const delta = prev ? snapshot.usedJSHeapSize - prev.usedJSHeapSize : 0;
      const usagePercent =
        snapshot.jsHeapSizeLimit > 0
          ? (snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit) * 100
          : 0;

      return {
        timestamp: snapshot.timestamp,
        usedJSHeapSize: snapshot.usedJSHeapSize,
        delta,
        usagePercent,
      };
    });
  }

  /**
   * 检测可能的内存泄漏
   *
   * 使用线性回归分析内存增长趋势，结合增长速率判断是否存在泄漏。
   *
   * @returns 泄漏检测结果
   */
  detectMemoryLeak(): MemoryLeakResult {
    const all = this.snapshots.getAll();

    if (all.length < this.config.leakMinSnapshots) {
      return {
        hasLeak: false,
        severity: 'none',
        description: `快照数量不足（需要至少 ${this.config.leakMinSnapshots} 个，当前 ${all.length} 个）`,
        snapshotCount: all.length,
        growthRate: 0,
        rSquared: 0,
      };
    }

    // 线性回归：y = a + b*x
    // x = 时间索引, y = usedJSHeapSize
    const n = all.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = all[i].usedJSHeapSize;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denominator = n * sumX2 - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

    // R^2 计算
    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < n; i++) {
      const y = all[i].usedJSHeapSize;
      const predicted = slope * i + (sumY - slope * sumX) / n;
      ssTot += (y - meanY) * (y - meanY);
      ssRes += (y - predicted) * (y - predicted);
    }
    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    // 计算增长速率 (bytes/s)
    const timeSpan = (all[n - 1].timestamp - all[0].timestamp) / 1000;
    const growthRate = timeSpan > 0 ? slope / timeSpan : 0;

    // 判断泄漏
    const hasLeak =
      rSquared >= this.config.leakRSquaredThreshold &&
      growthRate >= this.config.leakGrowthThreshold;

    let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
    let description = '未检测到内存泄漏';

    if (hasLeak) {
      if (growthRate >= this.config.leakGrowthThreshold * 10) {
        severity = 'high';
        description = `检测到严重内存泄漏，增长速率 ${Math.round(growthRate)} bytes/s，R²=${rSquared.toFixed(3)}`;
      } else if (growthRate >= this.config.leakGrowthThreshold * 3) {
        severity = 'medium';
        description = `检测到中等内存泄漏，增长速率 ${Math.round(growthRate)} bytes/s，R²=${rSquared.toFixed(3)}`;
      } else {
        severity = 'low';
        description = `检测到轻微内存泄漏，增长速率 ${Math.round(growthRate)} bytes/s，R²=${rSquared.toFixed(3)}`;
      }
    }

    return {
      hasLeak,
      severity,
      description,
      snapshotCount: n,
      growthRate,
      rSquared,
    };
  }

  /**
   * 生成内存报告
   *
   * @returns 内存报告
   */
  getMemoryReport(): MemoryReport {
    const all = this.snapshots.getAll();
    const trend = this.getMemoryTrend();
    const leakDetection = this.detectMemoryLeak();

    let current: MemorySnapshot | null = null;
    let peakUsage = 0;
    let peakTimestamp = 0;
    let totalUsage = 0;
    let minUsage = Infinity;

    for (const snapshot of all) {
      if (!current || snapshot.timestamp > current.timestamp) {
        current = snapshot;
      }
      if (snapshot.usedJSHeapSize > peakUsage) {
        peakUsage = snapshot.usedJSHeapSize;
        peakTimestamp = snapshot.timestamp;
      }
      totalUsage += snapshot.usedJSHeapSize;
      if (snapshot.usedJSHeapSize < minUsage) {
        minUsage = snapshot.usedJSHeapSize;
      }
    }

    const averageUsage = all.length > 0 ? totalUsage / all.length : 0;
    if (minUsage === Infinity) minUsage = 0;

    const totalGrowth =
      all.length >= 2
        ? all[all.length - 1].usedJSHeapSize - all[0].usedJSHeapSize
        : 0;

    return {
      generatedAt: Date.now(),
      current,
      peakUsage,
      peakTimestamp,
      averageUsage,
      minUsage,
      totalGrowth,
      trend,
      leakDetection,
      snapshotCount: all.length,
    };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 获取所有快照
   *
   * @returns 快照数组
   */
  getSnapshots(): MemorySnapshot[] {
    return this.snapshots.getAll();
  }

  /**
   * 获取快照数量
   *
   * @returns 快照数量
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * 清除所有快照
   */
  clear(): void {
    this.snapshots.clear();
    this.counter = 0;
  }

  /**
   * 销毁追踪器
   */
  destroy(): void {
    this.clear();
  }
}
