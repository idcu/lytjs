/**
 * @lytjs/common-timing
 * 定时与调度工具函数
 */

/**
 * 防抖函数返回类型
 */
interface DebouncedFn<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

/**
 * 防抖 - 延迟执行，在最后一次调用后等待指定时间
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number,
): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, waitMs);
  }) as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

/**
 * 立即防抖 - 立即执行一次，然后在等待期间不再执行
 */
export function debounceImmediate<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number,
): DebouncedFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isWaiting = false;

  const debounced = ((...args: Parameters<T>) => {
    if (!isWaiting) {
      fn(...args);
      isWaiting = true;
      timer = setTimeout(() => {
        isWaiting = false;
        timer = null;
      }, waitMs);
    }
  }) as DebouncedFn<T>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    isWaiting = false;
  };

  return debounced;
}

/**
 * 节流函数返回类型
 */
interface ThrottledFn<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

/**
 * 节流 - 在指定时间内最多执行一次
 *
 * @note 由于浏览器 setTimeout 的最小延迟通常为 4ms（嵌套调用时），
 * 且在后台标签页中可能被进一步节流至 1000ms，实际节流间隔
 * 可能略大于指定的 waitMs。对于高精度定时需求，请考虑使用
 * requestAnimationFrame 或 Web Worker。
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number,
): ThrottledFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let cancelled = false;

  const throttled = ((...args: Parameters<T>) => {
    if (cancelled) return;

    const now = Date.now();
    const elapsed = now - lastCallTime;

    if (elapsed >= waitMs) {
      lastCallTime = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
        timer = null;
      }, waitMs - elapsed);
    }
  }) as ThrottledFn<T>;

  throttled.cancel = () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled;
}

/**
 * 带尾调的节流 - 立即执行 + 等待结束后再执行最后一次
 */
export function throttleWithTrailing<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number,
): ThrottledFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let isThrottled = false;

  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (!isThrottled) {
      isThrottled = true;
      fn(...args);
      timer = setTimeout(() => {
        isThrottled = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
        timer = null;
      }, waitMs);
    }
  }) as ThrottledFn<T>;

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    isThrottled = false;
    lastArgs = null;
  };

  return throttled;
}

/**
 * 延迟指定时间
 */
export function delay<T = void>(ms: number, value?: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value as T), ms);
  });
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  retryCondition?: (error: Error) => boolean,
): Promise<T> {
  // maxRetries=0 表示不重试，直接执行一次
  if (maxRetries <= 0) {
    return fn();
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries - 1) {
        if (retryCondition && !retryCondition(lastError)) {
          throw lastError;
        }
        await delay(retryDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * 超时包装
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = 'Timeout',
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * 轮询直到条件满足
 */
export async function poll<T>(
  fn: () => T | Promise<T>,
  condition: (value: T) => boolean,
  interval: number = 1000,
  timeoutMs: number = 30000,
): Promise<T> {
  const startTime = Date.now();
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 10;

  while (true) {
    try {
      const value = await fn();
      consecutiveErrors = 0;
      if (condition(value)) {
        return value;
      }
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(
          `Polling aborted after ${MAX_CONSECUTIVE_ERRORS} consecutive errors: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (Date.now() - startTime >= timeoutMs) {
      throw new Error('Polling timeout exceeded');
    }

    await delay(interval);
  }
}

/**
 * 任务队列 - 控制并发执行的任务队列
 */
export class TaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private running: number = 0;
  private concurrency: number;
  private resolvers: Array<() => void> = [];

  constructor(concurrency: number = 1) {
    if (concurrency < 1) {
      throw new Error('TaskQueue concurrency must be at least 1');
    }
    this.concurrency = concurrency;
  }

  get size(): number {
    return this.queue.length;
  }

  add(task: () => Promise<void>): void {
    this.queue.push(task);
    this.run();
  }

  private async run(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) return;

    this.running++;
    const task = this.queue.shift()!;

    try {
      await task();
    } catch (err) {
      console.error('TaskQueue task error:', err);
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        this.run();
      } else if (this.running === 0) {
        this.resolvers.forEach((resolve) => resolve());
        this.resolvers = [];
      }
    }
  }

  /**
   * 等待所有任务完成
   */
  async wait(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) return;
    return new Promise<void>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  /**
   * 清空待执行的任务队列
   */
  clear(): void {
    this.queue = [];
  }
}
