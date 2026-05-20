 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { raf, caf, nextFrame, rafThrottle, rafDebounce } from '../src/index';

describe('@lytjs/common-raf', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // raf
  describe('raf', () => {
    it('should call callback via requestAnimationFrame', () => {
      const cb = vi.fn();
      const id = raf(cb);
      expect(id).toBeDefined();
      // In fake timers, raf falls back to setTimeout(fn, 16)
      expect(cb).not.toHaveBeenCalled();
      vi.advanceTimersByTime(16);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should return a unique id', () => {
      const id1 = raf(vi.fn());
      const id2 = raf(vi.fn());
      expect(id1).not.toBe(id2);
    });
  });

  // caf
  describe('caf', () => {
    it('should cancel a pending raf callback', () => {
      const cb = vi.fn();
      const id = raf(cb);
      caf(id);
      vi.advanceTimersByTime(100);
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not throw when cancelling an already executed callback', () => {
      const cb = vi.fn();
      const id = raf(cb);
      vi.advanceTimersByTime(16);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(() => caf(id)).not.toThrow();
    });
  });

  // nextFrame
  describe('nextFrame', () => {
    it('should resolve after one frame', async () => {
      const promise = nextFrame();
      vi.advanceTimersByTime(16);
      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should return a promise', () => {
      const result = nextFrame();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // rafThrottle
  describe('rafThrottle', () => {
    it('should throttle calls to once per frame', () => {
      const fn = vi.fn();
      const throttled = rafThrottle(fn);

      throttled('a');
      throttled('b');
      throttled('c');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c'); // last call wins
    });

    it('should allow new calls after frame completes', () => {
      const fn = vi.fn();
      const throttled = rafThrottle(fn);

      throttled('first');
      vi.advanceTimersByTime(16);
      expect(fn).toHaveBeenCalledTimes(1);

      throttled('second');
      vi.advanceTimersByTime(16);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should preserve this context', () => {
      const obj = {
        value: 42,
        fn: function (this: { value: number }) {
          return this.value;
        },
      };
      const spy = vi.spyOn(obj, 'fn');
      const throttled = rafThrottle(spy.bind(obj));
      throttled();
      vi.advanceTimersByTime(16);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // rafDebounce
  describe('rafDebounce', () => {
    it('should debounce calls to next frame by default', () => {
      const fn = vi.fn();
      const debounced = rafDebounce(fn);

      debounced('a');
      debounced('b');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('b');
    });

    it('should support custom delay (number of frames)', () => {
      const fn = vi.fn();
      const debounced = rafDebounce(fn, 3);

      debounced('test');

      vi.advanceTimersByTime(16);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('test');
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = rafDebounce(fn, 2);

      debounced('first');
      vi.advanceTimersByTime(16);
      expect(fn).not.toHaveBeenCalled();

      debounced('second');
      vi.advanceTimersByTime(16);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });

    it('should handle delay of 1 (single frame)', () => {
      const fn = vi.fn();
      const debounced = rafDebounce(fn, 1);

      debounced('test');
      vi.advanceTimersByTime(16);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
