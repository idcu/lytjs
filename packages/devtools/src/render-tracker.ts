/**
 * Lyt.js DevTools - 组件渲染追踪器
 *
 * 追踪组件渲染耗时，提供慢渲染检测、渲染统计和渲染时间线。
 * 使用环形缓冲区限制内存占用。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 渲染记录 */
export interface RenderRecord {
  /** 组件名称 */
  componentName: string;
  /** 渲染耗时 (ms) */
  duration: number;
  /** 渲染时间戳 */
  timestamp: number;
  /** 记录序号 */
  index: number;
}

/** 慢渲染条目 */
export interface SlowRenderEntry {
  /** 组件名称 */
  componentName: string;
  /** 渲染耗时 (ms) */
  duration: number;
  /** 渲染时间戳 */
  timestamp: number;
  /** 超出阈值的量 (ms) */
  overThreshold: number;
}

/** 渲染统计（按组件分组） */
export interface RenderComponentStats {
  /** 组件名称 */
  componentName: string;
  /** 渲染次数 */
  renderCount: number;
  /** 平均渲染耗时 (ms) */
  avgDuration: number;
  /** 最大渲染耗时 (ms) */
  maxDuration: number;
  /** 最小渲染耗时 (ms) */
  minDuration: number;
  /** 总渲染耗时 (ms) */
  totalDuration: number;
  /** 慢渲染次数 */
  slowCount: number;
}

/** 整体渲染统计 */
export interface RenderStats {
  /** 总渲染次数 */
  totalRenders: number;
  /** 总渲染耗时 (ms) */
  totalDuration: number;
  /** 平均渲染耗时 (ms) */
  avgDuration: number;
  /** 最大渲染耗时 (ms) */
  maxDuration: number;
  /** 最小渲染耗时 (ms) */
  minDuration: number;
  /** 慢渲染次数 */
  slowRenderCount: number;
  /** 慢渲染占比 (0-1) */
  slowRenderRatio: number;
  /** 按组件分组的统计 */
  byComponent: RenderComponentStats[];
}

/** 渲染时间线条目 */
export interface RenderTimelineEntry {
  /** 组件名称 */
  componentName: string;
  /** 渲染耗时 (ms) */
  duration: number;
  /** 渲染时间戳 */
  timestamp: number;
  /** 是否为慢渲染 */
  isSlow: boolean;
  /** 与前一次渲染的间隔 (ms)，第一条为 -1 */
  gap: number;
}

/** 渲染追踪器配置 */
export interface RenderTrackerConfig {
  /** 环形缓冲区容量，默认 200 */
  bufferSize?: number;
  /** 慢渲染阈值 (ms)，默认 16 */
  slowThreshold?: number;
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
// RenderTracker 类
// ============================================================

/** 默认配置 */
const DEFAULT_BUFFER_SIZE = 200;
const DEFAULT_SLOW_THRESHOLD = 16;

/**
 * 组件渲染追踪器
 *
 * 追踪组件渲染耗时，提供慢渲染检测、渲染统计和渲染时间线。
 */
export class RenderTracker {
  /** 渲染记录缓冲区 */
  private records: RingBuffer<RenderRecord>;
  /** 记录计数器（单调递增） */
  private counter: number = 0;
  /** 配置 */
  private readonly config: Required<RenderTrackerConfig>;

  constructor(config?: RenderTrackerConfig) {
    this.config = {
      bufferSize: config?.bufferSize ?? DEFAULT_BUFFER_SIZE,
      slowThreshold: config?.slowThreshold ?? DEFAULT_SLOW_THRESHOLD,
    };
    this.records = new RingBuffer(this.config.bufferSize);
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 记录一次渲染
   *
   * @param componentName - 组件名称
   * @param duration - 渲染耗时 (ms)
   */
  trackRender(componentName: string, duration: number): void {
    this.records.push({
      componentName,
      duration,
      timestamp: Date.now(),
      index: this.counter++,
    });
  }

  /**
   * 获取慢渲染组件列表
   *
   * @param threshold - 慢渲染阈值 (ms)，默认使用配置值
   * @returns 慢渲染条目数组，按耗时降序排列
   */
  getSlowRenderers(threshold?: number): SlowRenderEntry[] {
    const th = threshold ?? this.config.slowThreshold;
    const all = this.records.getAll();

    return all
      .filter((r) => r.duration > th)
      .map((r) => ({
        componentName: r.componentName,
        duration: r.duration,
        timestamp: r.timestamp,
        overThreshold: r.duration - th,
      }))
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * 获取渲染统计
   *
   * @returns 渲染统计信息
   */
  getRenderStats(): RenderStats {
    const all = this.records.getAll();
    const th = this.config.slowThreshold;

    if (all.length === 0) {
      return {
        totalRenders: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowRenderCount: 0,
        slowRenderRatio: 0,
        byComponent: [],
      };
    }

    let totalDuration = 0;
    let maxDuration = -Infinity;
    let minDuration = Infinity;
    let slowCount = 0;

    // 按组件分组统计
    const componentMap = new Map<
      string,
      {
        renderCount: number;
        totalDuration: number;
        maxDuration: number;
        minDuration: number;
        slowCount: number;
      }
    >();

    for (const record of all) {
      totalDuration += record.duration;
      if (record.duration > maxDuration) maxDuration = record.duration;
      if (record.duration < minDuration) minDuration = record.duration;
      if (record.duration > th) slowCount++;

      let entry = componentMap.get(record.componentName);
      if (!entry) {
        entry = {
          renderCount: 0,
          totalDuration: 0,
          maxDuration: -Infinity,
          minDuration: Infinity,
          slowCount: 0,
        };
        componentMap.set(record.componentName, entry);
      }
      entry.renderCount++;
      entry.totalDuration += record.duration;
      if (record.duration > entry.maxDuration) entry.maxDuration = record.duration;
      if (record.duration < entry.minDuration) entry.minDuration = record.duration;
      if (record.duration > th) entry.slowCount++;
    }

    const byComponent: RenderComponentStats[] = Array.from(componentMap.entries())
      .map(([componentName, stats]) => ({
        componentName,
        renderCount: stats.renderCount,
        avgDuration: stats.totalDuration / stats.renderCount,
        maxDuration: stats.maxDuration === -Infinity ? 0 : stats.maxDuration,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
        totalDuration: stats.totalDuration,
        slowCount: stats.slowCount,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    return {
      totalRenders: all.length,
      totalDuration,
      avgDuration: totalDuration / all.length,
      maxDuration: maxDuration === -Infinity ? 0 : maxDuration,
      minDuration: minDuration === Infinity ? 0 : minDuration,
      slowRenderCount: slowCount,
      slowRenderRatio: slowCount / all.length,
      byComponent,
    };
  }

  /**
   * 获取渲染时间线
   *
   * @returns 渲染时间线条目数组
   */
  getRenderTimeline(): RenderTimelineEntry[] {
    const all = this.records.getAll();
    const th = this.config.slowThreshold;

    return all.map((record, i) => ({
      componentName: record.componentName,
      duration: record.duration,
      timestamp: record.timestamp,
      isSlow: record.duration > th,
      gap: i > 0 ? record.timestamp - all[i - 1].timestamp : -1,
    }));
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 获取所有渲染记录
   *
   * @returns 渲染记录数组
   */
  getRecords(): RenderRecord[] {
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
   * 清除所有记录
   */
  clear(): void {
    this.records.clear();
    this.counter = 0;
  }

  /**
   * 销毁追踪器
   */
  destroy(): void {
    this.clear();
  }
}
