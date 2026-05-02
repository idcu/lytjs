/**
 * @lytjs/common-scheduler
 * 任务调度器 - 管理异步任务队列
 * 支持 pre-flush 和 post-flush 两种队列
 */

// ============================================================
// 调度器类型
// ============================================================

/**
 * 调度器任务类型
 */
export type SchedulerJob = () => void;

/**
 * 带优先级的调度器任务类型
 */
export interface SchedulerJobWithPriority extends SchedulerJob {
  /** 优先级，数值越小优先级越高 */
  priority?: number;
}

/**
 * 优先级常量
 */
export const Priority = {
  IDLE: 1000,       // 空闲任务
  LOW: 500,         // 低优先级
  NORMAL: 0,        // 普通优先级（默认）
  HIGH: -500,       // 高优先级
  CRITICAL: -1000,  // 关键任务
} as const;

// ============================================================
// 全局错误处理
// ============================================================

let globalErrorHandler: ((error: Error, info: string) => void) | null = null;
export function setErrorHandler(handler: ((error: Error, info: string) => void) | null): void {
  globalErrorHandler = handler;
}

// ============================================================
// 调度器状态
// ============================================================

let isFlushing = false;
let isFlushPending = false;

/** Default maximum iterations for flushJobs loop to prevent infinite update loops. */
const DEFAULT_MAX_ITERATIONS = 100;

let maxIterations = DEFAULT_MAX_ITERATIONS;

/**
 * 设置 flushJobs 的最大迭代次数
 * 用于自定义调度器在复杂场景下的循环上限
 */
export function setMaxIterations(n: number): void {
  if (typeof n === 'number' && n > 0) {
    maxIterations = n;
  }
}

const queue: SchedulerJob[] = [];
const queueSet: Set<SchedulerJob> = new Set();
const preFlushCbs: SchedulerJob[] = [];
const preFlushCbsSet: Set<SchedulerJob> = new Set();
const postFlushCbs: SchedulerJob[] = [];
const postFlushCbsSet: Set<SchedulerJob> = new Set();

let resolvedPromise: Promise<void> | null = null;

/**
 * 获取当前环境的 resolvedPromise
 */
function getResolvedPromise(): Promise<void> {
  return (resolvedPromise ??= Promise.resolve());
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 将任务加入队列
 * 同一个任务（引用相同）只会被加入一次
 */
export function queueJob(job: SchedulerJob): void {
  if (!queueSet.has(job)) {
    queueSet.add(job);
    queue.push(job);
    queueFlush();
  }
}

/**
 * 将带优先级的任务加入队列
 * 按优先级插入（优先级高的在前），相同优先级保持插入顺序（稳定排序）
 */
export function queueJobWithPriority(job: SchedulerJobWithPriority): void {
  if (!queueSet.has(job)) {
    queueSet.add(job);
    const priority = job.priority ?? Priority.NORMAL;
    // 找到第一个优先级大于等于当前 job 的位置（即当前 job 应该插入的位置）
    // 这样优先级高的（数值小的）排在前面，相同优先级的保持插入顺序
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      const existingJob = queue[i] as SchedulerJobWithPriority | undefined;
      const existingPriority = existingJob?.priority ?? Priority.NORMAL;
      if (existingPriority > priority) {
        insertIndex = i;
        break;
      }
    }
    queue.splice(insertIndex, 0, job);
    queueFlush();
  }
}

/**
 * 将回调加入 pre-flush 队列
 * 在主 job 队列之前执行（用于 watch 的 "pre" 模式）
 */
export function queuePreFlushCb(cb: SchedulerJob): void {
  if (!preFlushCbsSet.has(cb)) {
    preFlushCbsSet.add(cb);
    preFlushCbs.push(cb);
    queueFlush();
  }
}

/**
 * 将回调加入 post-flush 队列
 * 在所有 job 执行完毕后执行
 */
export function queuePostFlushCb(cb: SchedulerJob): void {
  if (!postFlushCbsSet.has(cb)) {
    postFlushCbsSet.add(cb);
    postFlushCbs.push(cb);
    queueFlush();
  }
}

/**
 * 在下一个 tick 执行回调
 */
export function nextTick(cb?: SchedulerJob): Promise<void> {
  const p = getResolvedPromise();
  return cb ? p.then(cb) : p;
}

/**
 * 刷新所有待执行的任务
 * 执行顺序：pre-flush 回调 -> 主 job 队列（按优先级） -> post-flush 回调
 * 支持循环处理：执行期间新增的回调也会被处理
 * 优先级策略：每轮先执行 CRITICAL/HIGH，再 NORMAL，最后 LOW/IDLE
 */
export function flushJobs(): void {
  isFlushing = true;
  isFlushPending = false;

  let iterations = 0;

  try {
    // 循环处理：执行期间新增的回调也会被处理
    while (
      (preFlushCbs.length > 0 || queue.length > 0 || postFlushCbs.length > 0) &&
      iterations < maxIterations
    ) {
      iterations++;

      // 1. 执行 pre-flush 队列（watch pre 模式回调）
      for (let i = 0; i < preFlushCbs.length; i++) {
        const cb = preFlushCbs[i]!;
        preFlushCbsSet.delete(cb);
        try {
          cb();
        } catch (e) {
          if (globalErrorHandler) globalErrorHandler(e as Error, 'pre-flush callback');
          if (__DEV__) {
            console.error('[LytJS] pre-flush callback failed:', e);
          }
        }
      }
      preFlushCbs.length = 0;

      // 2. 执行主 job 队列（按优先级分组执行）
      flushQueueByPriority();

      // 3. 执行 post-flush 回调
      for (let i = 0; i < postFlushCbs.length; i++) {
        const cb = postFlushCbs[i]!;
        postFlushCbsSet.delete(cb);
        try {
          cb();
        } catch (e) {
          if (globalErrorHandler) globalErrorHandler(e as Error, 'post-flush callback');
          if (__DEV__) {
            console.error('[LytJS] post-flush callback failed:', e);
          }
        }
      }
      postFlushCbs.length = 0;
    }

    if (iterations >= maxIterations) {
      const remainingJobs = queue.length + preFlushCbs.length + postFlushCbs.length;
      const msg =
        `[LytJS] flushJobs exceeded ${maxIterations} iterations. ` +
        `Possible infinite update loop detected.` +
        (remainingJobs > 0 ? ` ${remainingJobs} job(s) were discarded.` : '');
      if (__DEV__) {
        console.warn(msg);
      } else {
        console.error(msg);
      }
      // Clear all queues to prevent re-triggering
      queue.length = 0;
      queueSet.clear();
      preFlushCbs.length = 0;
      preFlushCbsSet.clear();
      postFlushCbs.length = 0;
      postFlushCbsSet.clear();
    }
  } finally {
    isFlushing = false;

    // If new jobs were queued during flush, schedule next flush via nextTick
    // instead of recursive call to avoid stack overflow
    if (preFlushCbs.length || queue.length || postFlushCbs.length) {
      isFlushPending = true;
      nextTick(flushJobs);
    }
  }
}

/**
 * 按优先级分组执行队列中的任务
 * 执行顺序：CRITICAL/HIGH -> NORMAL -> LOW/IDLE
 * 如果某轮执行中新增了高优先级任务，优先执行它们
 */
function flushQueueByPriority(): void {
  // 优先级阈值定义
  const HIGH_THRESHOLD = Priority.NORMAL; // <= 0 视为高优先级（CRITICAL: -1000, HIGH: -500）

  // 分组执行，每执行一组后检查是否有新的高优先级任务加入
  const executeBatch = (minPriority: number, maxPriority: number): void => {
    let i = 0;
    while (i < queue.length) {
      const job = queue[i] as SchedulerJobWithPriority | undefined;
      const priority = job?.priority ?? Priority.NORMAL;
      if (priority >= minPriority && priority <= maxPriority) {
        // 移除并执行
        queue.splice(i, 1);
        queueSet.delete(job!);
        try {
          job!();
        } catch (e) {
          if (globalErrorHandler) globalErrorHandler(e as Error, 'job execution');
          if (__DEV__) {
            console.error('[LytJS] job execution failed:', e);
          }
        }
        // 不递增 i，因为 splice 后下一个元素移到了当前位置
      } else {
        i++;
      }
    }
  };

  // 第一轮：执行 CRITICAL 和 HIGH 任务（priority <= 0）
  executeBatch(Priority.CRITICAL, HIGH_THRESHOLD);

  // 第二轮：执行 NORMAL 任务（priority >= 0 && priority < 500）
  executeBatch(Priority.NORMAL, Priority.LOW - 1);

  // 第三轮：执行 LOW 和 IDLE 任务（priority >= 500）
  executeBatch(Priority.LOW, Priority.IDLE);
}

/**
 * 同步刷新所有任务
 */
export function flushSync(): void {
  if (isFlushing) return;
  flushJobs();
}

/**
 * 检查是否有待执行的任务
 */
export function hasPendingJobs(): boolean {
  return preFlushCbs.length > 0 || queue.length > 0 || postFlushCbs.length > 0;
}

/**
 * 获取待执行的 job 数量
 */
export function getPendingJobCount(): number {
  return queue.length;
}

/**
 * 调度一次 flush
 */
function queueFlush(): void {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    nextTick(flushJobs);
  }
}

/**
 * 重置调度器状态（用于测试）
 */
export function resetSchedulerState(): void {
  queue.length = 0;
  queueSet.clear();
  preFlushCbs.length = 0;
  preFlushCbsSet.clear();
  postFlushCbs.length = 0;
  postFlushCbsSet.clear();
  isFlushing = false;
  isFlushPending = false;
  maxIterations = DEFAULT_MAX_ITERATIONS;
}
