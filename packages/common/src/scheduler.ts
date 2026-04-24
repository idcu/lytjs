/**
 * Lyt.js 公共工具 — 调度器（Scheduler）
 *
 * 基于 Promise 微任务实现异步批量更新队列。
 * 当任务需要批量执行时，可以将任务加入队列，
 * 在下一个微任务中统一批量执行，避免重复执行。
 */

// ======================== 类型定义 ========================

/** 调度任务函数类型 */
export type SchedulerJob = (...args: any[]) => void;

// ======================== 内部状态 ========================

/** 待执行的 job 队列（使用 Set 自动去重） */
const queue: Set<SchedulerJob> = new Set();

/** 正在执行的 job 队列（用于在执行过程中动态添加的 job） */
const pendingPostFlushCbs: SchedulerJob[] = [];

/** 是否正在刷新队列 */
let isFlushing = false;

/** 是否已安排了刷新（防止重复 Promise.resolve） */
let isFlushPending = false;

/** 当前微任务 Promise 的 resolve 引用 */
let currentFlushPromise: Promise<void> | null = null;

/** 队列中正在执行的 job 索引，用于判断是否需要重新遍历 */
let flushIndex = 0;

// ======================== 核心函数 ========================

/**
 * 将一个 job 加入调度队列
 * - 使用 Set 自动去重，同一个 job 只会被执行一次
 * - 如果队列尚未安排刷新，则通过 Promise.resolve 安排微任务
 *
 * @param job - 要调度的任务函数
 */
export function queueJob(job: SchedulerJob): void {
  // 如果队列中没有该 job，且该 job 不是当前正在执行的 job，则加入队列
  if (
    !queue.has(job) ||
    (isFlushing && flushIndex <= [...queue].indexOf(job))
  ) {
    queue.add(job);

    // 如果尚未安排刷新，则安排一个微任务来刷新队列
    if (!isFlushPending) {
      isFlushPending = true;
      currentFlushPromise = Promise.resolve().then(flushJobs);
    }
  }
}

/**
 * 将回调加入 post-flush 队列
 * 这些回调会在主队列刷新完毕后执行
 *
 * @param cb - 要在队列刷新后执行的回调
 */
export function queuePostFlushCb(cb: SchedulerJob): void {
  if (
    !pendingPostFlushCbs.includes(cb)
  ) {
    pendingPostFlushCbs.push(cb);

    if (!isFlushPending) {
      isFlushPending = true;
      currentFlushPromise = Promise.resolve().then(flushJobs);
    }
  }
}

/**
 * 批量刷新队列中的所有 job
 * - 按 id 排序确保执行顺序（较小的 id 先执行）
 * - 执行过程中如果有新的 job 被加入，会重新遍历队列
 * - 执行完毕后刷新 post-flush 回调
 */
function flushJobs(): void {
  isFlushPending = false;
  isFlushing = true;

  // 将 Set 转为数组并排序
  // 如果 job 有 id 属性，按 id 升序排列；没有 id 的排在前面
  const sortedQueue = [...queue].sort((a, b) => {
    const aId = (a as any).id;
    const bId = (b as any).id;
    if (aId !== null && aId !== undefined && bId !== null && bId !== undefined) return aId - bId;
    if (aId !== null && aId !== undefined) return -1;
    if (bId !== null && bId !== undefined) return 1;
    return 0;
  });

  // 清空队列（在执行前清空，这样执行过程中新加入的 job 会触发新的遍历）
  queue.clear();
  flushIndex = 0;

  // 依次执行每个 job
  for (flushIndex = 0; flushIndex < sortedQueue.length; flushIndex++) {
    const job = sortedQueue[flushIndex];
    job();
  }

  // 重置索引
  flushIndex = 0;

  // 执行 post-flush 回调
  flushPostFlushCbs();

  // 重置状态
  isFlushing = false;
  currentFlushPromise = null;
}

/**
 * 刷新 post-flush 回调队列
 */
function flushPostFlushCbs(): void {
  if (pendingPostFlushCbs.length === 0) return;

  // 复制一份再清空，防止回调中又添加新的回调导致无限循环
  const copiedCbs = [...pendingPostFlushCbs];
  pendingPostFlushCbs.length = 0;

  for (let i = 0; i < copiedCbs.length; i++) {
    copiedCbs[i]();
  }
}

/**
 * 获取当前刷新 Promise
 * 可用于等待当前队列刷新完毕
 *
 * @returns 当前微任务的 Promise，如果没有则返回已 resolved 的 Promise
 */
export function nextTick(): Promise<void> {
  const p = currentFlushPromise || Promise.resolve();
  return p.then(() => {});
}

/**
 * 查询队列中是否包含指定的 job
 *
 * @param job - 要查询的 job
 * @returns 是否在队列中
 */
export function hasPendingJob(job: SchedulerJob): boolean {
  return queue.has(job);
}

/**
 * 清空队列中的所有待执行 job（主要用于测试）
 */
export function clearQueue(): void {
  queue.clear();
  pendingPostFlushCbs.length = 0;
  isFlushing = false;
  isFlushPending = false;
  currentFlushPromise = null;
  flushIndex = 0;
}
