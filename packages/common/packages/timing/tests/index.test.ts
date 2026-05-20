 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  debounceImmediate,
  throttle,
  throttleWithTrailing,
  delay,
  retry,
  timeout,
  poll,
  TaskQueue,
} from '../src/index';

describe('@lytjs/common-timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // debounce
  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only call once for rapid invocations', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced();
      debounced();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on each call', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced('arg1', 'arg2');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should support cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // debounceImmediate
  describe('debounceImmediate', () => {
    it('should call function immediately on first invocation', () => {
      const fn = vi.fn();
      const debounced = debounceImmediate(fn, 100);
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not call again within wait period', () => {
      const fn = vi.fn();
      const debounced = debounceImmediate(fn, 100);
      debounced();
      debounced();
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow call after wait period', () => {
      const fn = vi.fn();
      const debounced = debounceImmediate(fn, 100);
      debounced();
      vi.advanceTimersByTime(100);
      debounced();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // throttle
  describe('throttle', () => {
    it('should call function immediately', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not call again within wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow call after wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support cancel', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      throttled.cancel();
      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // throttleWithTrailing
  describe('throttleWithTrailing', () => {
    it('should call immediately and after wait period', () => {
      const fn = vi.fn();
      const throttled = throttleWithTrailing(fn, 100);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass last arguments to trailing call', () => {
      const fn = vi.fn();
      const throttled = throttleWithTrailing(fn, 100);
      throttled('first');
      throttled('last');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenLastCalledWith('last');
    });
  });

  // delay
  describe('delay', () => {
    it('should resolve after specified time', async () => {
      const promise = delay(100);
      vi.advanceTimersByTime(100);
      await promise;
    });

    it('should resolve with value', async () => {
      const promise = delay(100, 'hello');
      vi.advanceTimersByTime(100);
      const result = await promise;
      expect(result).toBe('hello');
    });
  });

  // retry
  describe('retry', () => {
    it('should resolve on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, 3, 100);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('success');
      const promise = retry(fn, 3, 100);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const promise = retry(fn, 3, 100);
      const assertion = expect(promise).rejects.toThrow('fail');
      await vi.advanceTimersByTimeAsync(300);
      await assertion;
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should support custom retry condition', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('retryable'))
        .mockResolvedValueOnce('success');
      const promise = retry(fn, 3, 100, (err) => err.message === 'retryable');
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;
      expect(result).toBe('success');
    });
  });

  // timeout
  describe('timeout', () => {
    it('should resolve if promise completes in time', async () => {
      const promise = Promise.resolve('result');
      const result = await timeout(promise, 1000);
      expect(result).toBe('result');
    });

    it('should reject if promise times out', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 2000));
      const timedPromise = timeout(promise, 100);
      const assertion = expect(timedPromise).rejects.toThrow('Timeout');
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    });
  });

  // poll
  describe('poll', () => {
    it('should poll until condition is met', async () => {
      let count = 0;
      const promise = poll(
        () => ++count,
        (val) => val >= 3,
        50,
        1000,
      );
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;
      expect(result).toBe(3);
    });

    it('should throw if timeout is reached', async () => {
      const promise = poll(
        () => false,
        (val) => val === true,
        50,
        200,
      );
      const assertion = expect(promise).rejects.toThrow('Polling timeout');
      await vi.advanceTimersByTimeAsync(250);
      await assertion;
    });
  });

  // TaskQueue
  describe('TaskQueue', () => {
    it('should execute tasks in order', async () => {
      const queue = new TaskQueue();
      const results: number[] = [];
      queue.add(() => Promise.resolve(1).then((v) => results.push(v)));
      queue.add(() => Promise.resolve(2).then((v) => results.push(v)));
      queue.add(() => Promise.resolve(3).then((v) => results.push(v)));
      await queue.wait();
      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle empty queue', async () => {
      const queue = new TaskQueue();
      await queue.wait();
    });

    it('should support concurrent limit', async () => {
      const queue = new TaskQueue(2);
      let running = 0;
      let maxRunning = 0;

      const createTask = () => () =>
        new Promise<void>((resolve) => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          setTimeout(() => {
            running--;
            resolve();
          }, 50);
        });

      queue.add(createTask());
      queue.add(createTask());
      queue.add(createTask());
      await vi.advanceTimersByTimeAsync(100);
      await queue.wait();
      expect(maxRunning).toBe(2);
    });

    it('should support clear', () => {
      const queue = new TaskQueue();
      queue.add(() => Promise.resolve());
      queue.add(() => Promise.resolve());
      queue.clear();
      expect(queue.size).toBe(0);
    });
  });
});
