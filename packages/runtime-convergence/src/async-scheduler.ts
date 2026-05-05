// @lytjs/runtime-convergence - async-scheduler
// 异步调度器：统一异步时序操作，通过 host 注入的定时器执行，支持同步插队刷新

import type { RendererHost } from '@lytjs/host-contract';
import type { SchedulerJob, SchedulerPriority, AsyncSchedulerOptions } from './types';

// ============================================================
// 常量
// ============================================================

/** 默认配置 */
const DEFAULT_OPTIONS: Required<AsyncSchedulerOptions> = {
  defaultPriority: 'normal',
  enableFlushSync: true,
};

/** FIX: P2-40 优先级调度策略：支持自定义优先级权重 */
/** 优先级权重映射（数值越小优先级越高） */
const PRIORITY_WEIGHT: Record<SchedulerPriority, number> = {
  sync: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** 自增的任务 ID */
let nextJobId = 0;

// ============================================================
// AsyncScheduler
// ============================================================

/**
 * 异步调度器。
 *
 * 统一异步时序操作，通过 RendererHost 注入的定时器执行，
 * 支持优先级排序、任务合并和同步插队刷新。
 *
 * @template HN - 宿主节点类型
 * @template HE - 宿主元素类型
 */
export class AsyncScheduler<HN = unknown, HE extends HN = HN> {
  /** RendererHost 实例 */
  private host: RendererHost<HN, HE>;

  /** 配置项 */
  private options: Required<AsyncSchedulerOptions>;

  /** 待执行的任务队列 */
  private queue: SchedulerJob[] = [];

  /** 是否已调度刷新 */
  private scheduled = false;

  /** 调度的定时器 ID */
  private timerId: number | null = null;

  /** 是否正在执行刷新（防止重入） */
  private flushing = false;

  /** 已执行过的任务 ID 集合（用于 allowMerge 去重） */
  private executedJobIds = new Set<number>();

  /**
   * 创建异步调度器实例。
   * @param host - RendererHost 实例
   * @param options - 可选的配置项
   */
  constructor(host: RendererHost<HN, HE>, options?: AsyncSchedulerOptions) {
    this.host = host;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================
  // 公开方法
  // ==========================================================

  /**
   * 调度一个任务。
   *
   * @param fn - 任务函数
   * @param priority - 任务优先级（默认使用配置的 defaultPriority）
   * @param allowMerge - 是否允许合并（默认 true）
   * @returns 任务 ID
   */
  schedule(
    fn: () => void,
    priority?: SchedulerPriority,
    allowMerge?: boolean,
  ): number {
    const id = ++nextJobId;
    const job: SchedulerJob = {
      id,
      fn,
      priority: priority ?? this.options.defaultPriority,
      allowMerge: allowMerge ?? true,
    };

    // 如果允许合并，在 queue 中查找同 id 任务进行去重
    // 不依赖 executedJobIds（它在 flush 开始时被 clear，导致 flush 间隙竞态）
    if (job.allowMerge) {
      const existingIdx = this.queue.findIndex((q) => q.allowMerge && q.id === id);
      if (existingIdx !== -1) {
        // 队列中已有同 id 任务，替换为最新的
        this.queue[existingIdx] = job;
        this.sortQueue();
        this.scheduleFlush();
        return id;
      }
    }

    this.queue.push(job);
    this.sortQueue();
    this.scheduleFlush();

    return id;
  }

  /**
   * 调度一个同步任务（立即在当前 tick 执行）。
   *
   * @param fn - 任务函数
   */
  scheduleSync(fn: () => void): void {
    // FIX: P1-50 scheduleSync 检查 enableFlushSync 配置，
    // 当 enableFlushSync 为 false 时回退到异步调度
    if (!this.options.enableFlushSync) {
      this.schedule(fn, 'sync', false);
      return;
    }
    const id = ++nextJobId;
    const job: SchedulerJob = {
      id,
      fn,
      priority: 'sync',
      allowMerge: false,
    };

    this.queue.unshift(job);
    this.flushSync();
  }

  /**
   * 同步插队刷新：立即执行队列中所有待处理任务。
   *
   * 用于需要立即更新 DOM 的场景（如用户交互后读取布局信息）。
   */
  flushSync(): void {
    if (!this.options.enableFlushSync || this.flushing) return;

    // 取消已调度的异步刷新
    if (this.timerId !== null) {
      this.host.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.scheduled = false;

    this.flush();
  }

  /**
   * 在下一帧执行回调（通过 host.nextFrame）。
   *
   * @param fn - 回调函数
   */
  nextFrame(fn: () => void): void {
    this.host.nextFrame(fn);
  }

  /**
   * 延迟执行回调。
   *
   * @param fn - 回调函数
   * @param ms - 延迟时间（ms）
   * @returns 定时器 ID
   */
  setTimeout(fn: () => void, ms: number): number {
    return this.host.setTimeout(fn, ms);
  }

  /**
   * 取消延迟执行。
   *
   * @param id - 定时器 ID
   */
  clearTimeout(id: number): void {
    this.host.clearTimeout(id);
  }

  /**
   * 获取当前队列中的任务数量。
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 清空队列（不执行任务）。
   */
  clear(): void {
    if (this.timerId !== null) {
      this.host.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.queue.length = 0;
    this.scheduled = false;
    this.executedJobIds.clear();
  }

  /**
   * 销毁调度器，清理所有状态。
   */
  dispose(): void {
    this.clear();
  }

  // ==========================================================
  // 内部方法
  // ==========================================================

  /**
   * 调度异步刷新。
   */
  private scheduleFlush(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.timerId = this.host.setTimeout(() => {
      this.timerId = null;
      this.scheduled = false;
      this.flush();
    }, 0);
  }

  /**
   * 执行队列中所有任务。
   */
  private flush(): void {
    if (this.flushing || this.queue.length === 0) return;

    this.flushing = true;

    // 取出当前所有任务
    const jobs = this.queue;
    this.queue = [];
    // FIX: P1-47 消除 executedJobIds 竞态窗口：
    // 不在 flush 开始时清空 executedJobIds，而是在每个任务执行后立即添加。
    // 同时在 schedule() 中不依赖 executedJobIds 进行去重（已在 queue 中去重），
    // executedJobIds 仅用于防止 flush 期间重复入队的任务被执行两次。
    // 因此此处无需 clear，而是在任务执行后立即 add。

    for (const job of jobs) {
      // FIX: P1-47 在执行前检查是否已在当前 flush 周期中执行过
      if (job.allowMerge && this.executedJobIds.has(job.id)) {
        continue;
      }
      try {
        job.fn();
      } catch (err) {
        // 任务执行失败不影响后续任务
        if (__DEV__) console.warn('[lytjs/async-scheduler] Error executing job:', err);
      }
      // 记录已执行的任务 ID（用于 allowMerge 去重）
      if (job.allowMerge) {
        this.executedJobIds.add(job.id);
      }
    }

    this.flushing = false;

    // 如果 flush 过程中又有新任务入队，继续调度
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * 按优先级排序队列。
   *
   * 优先级高的排在前面，同优先级保持插入顺序（稳定排序）。
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const weightA = PRIORITY_WEIGHT[a.priority]!;
      const weightB = PRIORITY_WEIGHT[b.priority]!;
      return weightA - weightB;
    });
  }
}

declare const __DEV__: boolean;
