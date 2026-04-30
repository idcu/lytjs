/**
 * @lytjs/common-scheduler
 * 任务调度器 - 管理异步任务队列
 */

import { isNode } from "@lytjs/common-env";

// ============================================================
// 调度器类型
// ============================================================

/**
 * 调度器任务类型
 */
export type SchedulerJob = () => void;

// ============================================================
// 调度器状态
// ============================================================

let isFlushing = false;
let isFlushPending = false;

const queue: SchedulerJob[] = [];
const queueSet: Set<SchedulerJob> = new Set();
const postFlushCbs: SchedulerJob[] = [];
const postFlushCbsSet: Set<SchedulerJob> = new Set();

let resolvedPromise: Promise<void> | null = null;

/**
 * 获取当前环境的 resolvedPromise
 */
function getResolvedPromise(): Promise<void> {
  if (!resolvedPromise) {
    resolvedPromise = isNode() ? Promise.resolve() : Promise.resolve();
  }
  return resolvedPromise;
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
 */
export function flushJobs(): void {
  isFlushing = true;
  isFlushPending = false;

  try {
    // 执行所有 job
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i]!;
      queueSet.delete(job);
      job();
    }

    queue.length = 0;

    // 执行所有 post-flush 回调
    for (let i = 0; i < postFlushCbs.length; i++) {
      const cb = postFlushCbs[i]!;
      postFlushCbsSet.delete(cb);
      cb();
    }

    postFlushCbs.length = 0;
  } finally {
    isFlushing = false;

    // 如果在执行过程中有新的 job 被加入，继续刷新
    if (queue.length || postFlushCbs.length) {
      flushJobs();
    }
  }
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
  return queue.length > 0 || postFlushCbs.length > 0;
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
  postFlushCbs.length = 0;
  postFlushCbsSet.clear();
  isFlushing = false;
  isFlushPending = false;
}
