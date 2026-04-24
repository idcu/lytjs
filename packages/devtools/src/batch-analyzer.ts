/**
 * Lyt.js DevTools - 批量操作分析器
 *
 * 追踪批量操作的执行时间和频率，提供统计分析和异常检测。
 * 使用环形缓冲区限制内存占用。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 批量操作记录 */
export interface BatchRecord {
  /** 操作名称 */
  name: string;
  /** 开始时间戳 */
  startTime: number;
  /** 结束时间戳 */
  endTime: number;
  /** 持续时间 (ms) */
  duration: number;
  /** 操作序号 */
  index: number;
}

/** 批量操作统计（按名称分组） */
export interface BatchNameStats {
  /** 操作名称 */
  name: string;
  /** 执行次数 */
  count: number;
  /** 平均持续时间 (ms) */
  avgDuration: number;
  /** 最大持续时间 (ms) */
  maxDuration: number;
  /** 最小持续时间 (ms) */
  minDuration: number;
  /** 总持续时间 (ms) */
  totalDuration: number;
  /** 标准差 (ms) */
  stdDev: number;
}

/** 整体批量操作统计 */
export interface BatchStats {
  /** 总操作次数 */
  totalBatches: number;
  /** 总持续时间 (ms) */
  totalDuration: number;
  /** 平均持续时间 (ms) */
  avgDuration: number;
  /** 最大持续时间 (ms) */
  maxDuration: number;
  /** 最小持续时间 (ms) */
  minDuration: number;
  /** 按名称分组的统计 */
  byName: BatchNameStats[];
}

/** 异常批量操作条目 */
export interface AnomalousBatch {
  /** 操作名称 */
  name: string;
  /** 持续时间 (ms) */
  duration: number;
  /** 时间戳 */
  timestamp: number;
  /** 异常类型 */
  anomalyType: 'slow' | 'fast' | 'outlier';
  /** 异常描述 */
  description: string;
  /** 偏离平均值的标准差倍数 */
  deviationSigma: number;
}

/** 批量操作分析器配置 */
export interface BatchAnalyzerConfig {
  /** 环形缓冲区容量，默认 100 */
  bufferSize?: number;
  /** 异常检测的慢操作阈值 (ms)，默认 1000 */
  slowThreshold?: number;
  /** 异常检测的标准差倍数阈值，默认 2 */
  outlierSigmaThreshold?: number;
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
// BatchAnalyzer 类
// ============================================================

/** 默认配置 */
const DEFAULT_BUFFER_SIZE = 100;
const DEFAULT_SLOW_THRESHOLD = 1000;
const DEFAULT_OUTLIER_SIGMA_THRESHOLD = 2;

/**
 * 批量操作分析器
 *
 * 追踪批量操作的执行时间和频率，提供统计分析和异常检测。
 */
export class BatchAnalyzer {
  /** 批量操作记录缓冲区 */
  private records: RingBuffer<BatchRecord>;
  /** 正在进行的操作映射 */
  private pending: Map<string, number> = new Map();
  /** 记录计数器（单调递增） */
  private counter: number = 0;
  /** 配置 */
  private readonly config: Required<BatchAnalyzerConfig>;

  constructor(config?: BatchAnalyzerConfig) {
    this.config = {
      bufferSize: config?.bufferSize ?? DEFAULT_BUFFER_SIZE,
      slowThreshold: config?.slowThreshold ?? DEFAULT_SLOW_THRESHOLD,
      outlierSigmaThreshold: config?.outlierSigmaThreshold ?? DEFAULT_OUTLIER_SIGMA_THRESHOLD,
    };
    this.records = new RingBuffer(this.config.bufferSize);
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 开始一个批量操作
   *
   * @param name - 操作名称
   * @returns 是否成功开始（如果同名操作已在进行中，返回 false）
   */
  startBatch(name: string): boolean {
    if (this.pending.has(name)) {
      return false;
    }
    this.pending.set(name, Date.now());
    return true;
  }

  /**
   * 结束一个批量操作
   *
   * @param name - 操作名称
   * @returns 操作记录，如果操作未开始则返回 null
   */
  endBatch(name: string): BatchRecord | null {
    const startTime = this.pending.get(name);
    if (startTime === undefined) {
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    this.pending.delete(name);

    const record: BatchRecord = {
      name,
      startTime,
      endTime,
      duration,
      index: this.counter++,
    };

    this.records.push(record);
    return record;
  }

  /**
   * 获取批量操作统计
   *
   * @returns 批量操作统计信息
   */
  getBatchStats(): BatchStats {
    const all = this.records.getAll();

    if (all.length === 0) {
      return {
        totalBatches: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        byName: [],
      };
    }

    let totalDuration = 0;
    let maxDuration = -Infinity;
    let minDuration = Infinity;

    // 按名称分组
    const nameMap = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        maxDuration: number;
        minDuration: number;
        durations: number[];
      }
    >();

    for (const record of all) {
      totalDuration += record.duration;
      if (record.duration > maxDuration) maxDuration = record.duration;
      if (record.duration < minDuration) minDuration = record.duration;

      let entry = nameMap.get(record.name);
      if (!entry) {
        entry = {
          count: 0,
          totalDuration: 0,
          maxDuration: -Infinity,
          minDuration: Infinity,
          durations: [],
        };
        nameMap.set(record.name, entry);
      }
      entry.count++;
      entry.totalDuration += record.duration;
      if (record.duration > entry.maxDuration) entry.maxDuration = record.duration;
      if (record.duration < entry.minDuration) entry.minDuration = record.duration;
      entry.durations.push(record.duration);
    }

    const byName: BatchNameStats[] = Array.from(nameMap.entries()).map(
      ([name, stats]) => {
        const avg = stats.totalDuration / stats.count;
        // 计算标准差
        let variance = 0;
        for (const d of stats.durations) {
          variance += (d - avg) * (d - avg);
        }
        variance /= stats.count;
        const stdDev = Math.sqrt(variance);

        return {
          name,
          count: stats.count,
          avgDuration: avg,
          maxDuration: stats.maxDuration === -Infinity ? 0 : stats.maxDuration,
          minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
          totalDuration: stats.totalDuration,
          stdDev,
        };
      },
    );

    return {
      totalBatches: all.length,
      totalDuration,
      avgDuration: totalDuration / all.length,
      maxDuration: maxDuration === -Infinity ? 0 : maxDuration,
      minDuration: minDuration === Infinity ? 0 : minDuration,
      byName,
    };
  }

  /**
   * 检测异常批量操作
   *
   * 基于以下规则检测异常：
   * - 慢操作：持续时间超过慢操作阈值
   * - 离群值：持续时间偏离同组平均值超过指定标准差倍数
   *
   * @returns 异常批量操作数组
   */
  detectAnomalousBatches(): AnomalousBatch[] {
    const all = this.records.getAll();
    if (all.length === 0) return [];

    const stats = this.getBatchStats();
    const anomalies: AnomalousBatch[] = [];

    // 构建按名称分组的统计信息映射
    const nameStatsMap = new Map<string, BatchNameStats>();
    for (const ns of stats.byName) {
      nameStatsMap.set(ns.name, ns);
    }

    for (const record of all) {
      const ns = nameStatsMap.get(record.name);

      // 检查慢操作
      if (record.duration > this.config.slowThreshold) {
        anomalies.push({
          name: record.name,
          duration: record.duration,
          timestamp: record.endTime,
          anomalyType: 'slow',
          description: `操作 "${record.name}" 耗时 ${record.duration.toFixed(1)}ms，超过慢操作阈值 ${this.config.slowThreshold}ms`,
          deviationSigma: ns && ns.stdDev > 0 ? (record.duration - ns.avgDuration) / ns.stdDev : 0,
        });
        continue; // 避免重复标记
      }

      // 检查离群值（需要至少 2 条同组记录且标准差 > 0）
      if (ns && ns.count >= 2 && ns.stdDev > 0) {
        const sigma = (record.duration - ns.avgDuration) / ns.stdDev;
        if (Math.abs(sigma) > this.config.outlierSigmaThreshold) {
          const anomalyType = sigma > 0 ? 'slow' : 'fast';
          anomalies.push({
            name: record.name,
            duration: record.duration,
            timestamp: record.endTime,
            anomalyType,
            description: `操作 "${record.name}" 耗时 ${record.duration.toFixed(1)}ms，偏离平均值 ${sigma.toFixed(1)} 个标准差`,
            deviationSigma: sigma,
          });
        }
      }
    }

    // 按时间排序
    anomalies.sort((a, b) => a.timestamp - b.timestamp);
    return anomalies;
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 获取所有批量操作记录
   *
   * @returns 批量操作记录数组
   */
  getRecords(): BatchRecord[] {
    return this.records.getAll();
  }

  /**
   * 获取记录数量
   *
   * @returns 记录数量
   */
  getRecordCount(): number {
    return this.records.size;
  }

  /**
   * 获取正在进行的操作名称列表
   *
   * @returns 正在进行的操作名称数组
   */
  getPendingBatches(): string[] {
    return Array.from(this.pending.keys());
  }

  /**
   * 清除所有记录和进行中的操作
   */
  clear(): void {
    this.records.clear();
    this.pending.clear();
    this.counter = 0;
  }

  /**
   * 销毁分析器
   */
  destroy(): void {
    this.clear();
  }
}
