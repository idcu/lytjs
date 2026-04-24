/**
 * Lyt.js Core Shared - Timing Utilities
 *
 * 定时工具函数
 * 纯原生零依赖实现
 */

/**
 * 防抖函数
 * 频繁调用时，只有等待时间内没有再次调用才会执行
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 带立即执行的防抖函数
 */
export function debounceImmediate<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  let called = false;

  return (...args: Parameters<T>) => {
    if (!called) {
      fn(...args);
      called = true;
    }

    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      called = false;
    }, delay);
  };
}

/**
 * 节流函数
 * 频繁调用时，在指定时间内只会执行一次
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

/**
 * 带尾部执行的节流函数
 */
export function throttleWithTrailing<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const execute = () => {
    fn(...lastArgs!);
    lastTime = Date.now();
    lastArgs = null;
  };

  return (...args: Parameters<T>) => {
    lastArgs = args;
    const now = Date.now();

    if (now - lastTime >= delay) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      execute();
    } else if (timer === null) {
      timer = setTimeout(execute, delay - (now - lastTime));
    }
  };
}

/**
 * 延迟执行函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let retries = 0;

  const attempt = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        await delay(delayMs);
        return attempt();
      }
      throw error;
    }
  };

  return attempt();
}

/**
 * 异步超时函数
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error?: Error
): Promise<T> {
  return Promise.race([
    promise,
    delay(ms).then(() => {
      throw error || new Error('Operation timed out');
    }),
  ]);
}

/**
 * 轮询函数
 */
export function poll(
  fn: () => boolean | Promise<boolean>,
  interval: number = 1000,
  maxAttempts: number = Infinity
): Promise<void> {
  let attempts = 0;

  const execute = (): Promise<void> => {
    return Promise.resolve(fn()).then((result) => {
      if (result) {
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Polling exceeded max attempts');
      }

      return delay(interval).then(execute);
    });
  };

  return execute();
}

/**
 * 任务队列
 */
export class TaskQueue {
  private queue: (() => Promise<any>)[] = [];
  private running: boolean = false;
  private concurrency: number;
  private activeCount: number = 0;

  constructor(concurrency: number = 1) {
    this.concurrency = concurrency;
  }

  /**
   * 添加任务
   */
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.run();
    });
  }

  private async run(): Promise<void> {
    if (this.running || this.activeCount >= this.concurrency) return;

    this.running = true;

    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const task = this.queue.shift();
      if (task) {
        this.activeCount++;
        task().finally(() => {
          this.activeCount--;
          this.run();
        });
      }
    }

    this.running = false;
  }

  /**
   * 获取队列大小
   */
  get size(): number {
    return this.queue.length + this.activeCount;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }
}
