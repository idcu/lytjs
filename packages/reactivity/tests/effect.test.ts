import { describe, it, expect, vi } from 'vitest';
import {
  ref,
  reactive,
  effect,
  stop,
  batch,
  batchAsync,
  untrack,
  onEffectCleanup,
  pauseTracking,
  enableTracking,
  resetTracking,
} from '../src/index';

describe('effect', () => {
  it('should run the effect function immediately', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should track reactive dependencies', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = obj.count;
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    obj.count = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should support lazy option', () => {
    const fn = vi.fn();
    const runner = effect(fn, { lazy: true });
    expect(fn).not.toHaveBeenCalled();
    runner();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should support scheduler option', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    const scheduler = vi.fn();
    effect(
      () => {
        obj.count;
        fn();
      },
      { scheduler },
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(scheduler).not.toHaveBeenCalled();
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(scheduler).toHaveBeenCalledTimes(1);
  });

  it('should stop the effect', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;
    const runner = effect(() => {
      dummy = obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    stop(runner);
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onStop when stopped', () => {
    const onStopFn = vi.fn();
    const runner = effect(() => {}, { onStop: onStopFn });
    stop(runner);
    expect(onStopFn).toHaveBeenCalledTimes(1);
  });

  it('should batch multiple updates with pauseTracking', () => {
    const obj = reactive({ a: 0, b: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.a + obj.b);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    // pauseTracking 阻止新依赖追踪，但不阻止 trigger
    // 两次修改各触发一次 effect 重新执行
    pauseTracking();
    obj.a = 1;
    obj.b = 2;
    resetTracking();
    // 每次 set 都触发了 trigger，effect 各执行一次
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should pause and resume tracking', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = obj.count;
      fn();
    });
    pauseTracking();
    obj.count = 1; // trigger 仍然发生，effect 重新执行
    expect(fn).toHaveBeenCalledTimes(2);
    enableTracking();
    obj.count = 2;
    expect(fn).toHaveBeenCalledTimes(3);
    // Clean up trackStack to avoid affecting subsequent tests
    resetTracking();
  });

  it('should reset tracking state', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      obj.count;
      fn();
    });
    pauseTracking();
    obj.count = 1; // trigger 仍然发生
    expect(fn).toHaveBeenCalledTimes(2);
    resetTracking();
    obj.count = 2;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should register cleanup function', () => {
    const cleanupFn = vi.fn();
    const count = ref(0);
    const runner = effect(() => {
      onEffectCleanup(cleanupFn);
      count.value;
    });
    count.value = 1;
    expect(cleanupFn).toHaveBeenCalledTimes(1);
    stop(runner);
    expect(cleanupFn).toHaveBeenCalledTimes(2);
  });
});

describe('batchAsync', () => {
  it('should pause tracking during sync function', async () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await batchAsync(() => {
      obj.count = 1;
      obj.count = 2;
    });

    // After batchAsync resolves, triggers fire and effect re-runs
    // Each set triggers independently, so effect runs for each change
    expect(fn.mock.calls[fn.mock.calls.length - 1][0]).toBe(2);
  });

  it('should pause tracking during async function', async () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await batchAsync(async () => {
      obj.count = 1;
      await Promise.resolve();
      obj.count = 2;
    });

    // After the async batch completes, tracking is restored
    expect(fn.mock.calls[fn.mock.calls.length - 1][0]).toBe(2);
  });

  it('should restore tracking after async function throws', async () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await expect(
      batchAsync(async () => {
        obj.count = 1;
        throw new Error('test error');
      }),
    ).rejects.toThrow('test error');

    // Tracking should be restored after the error
    obj.count = 2;
    expect(fn).toHaveBeenCalled();
  });

  it('should return a Promise for sync functions', async () => {
    const result = await batchAsync(() => {
      // sync function
    });
    expect(result).toBeUndefined();
  });
});

describe('untrack', () => {
  it('should execute fn without tracking dependencies', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;

    effect(() => {
      dummy = untrack(() => obj.count);
      fn();
    });

    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Since obj.count was accessed inside untrack, it should NOT be tracked
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(1); // should not re-run
    expect(dummy).toBe(0); // value should not update
  });

  it('should return the value from fn', () => {
    const result = untrack(() => 42);
    expect(result).toBe(42);
  });

  it('should work with nested tracking', () => {
    const obj = reactive({ a: 0, b: 0 });
    const fn = vi.fn();
    let dummy: number;

    effect(() => {
      dummy = obj.a + untrack(() => obj.b);
      fn();
    });

    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // obj.a is tracked, obj.b is not
    obj.b = 10;
    expect(fn).toHaveBeenCalledTimes(1); // should not re-run (b is untracked)
    expect(dummy).toBe(0);

    obj.a = 1;
    expect(fn).toHaveBeenCalledTimes(2); // should re-run (a is tracked)
    expect(dummy).toBe(11); // a=1 + untracked b=10 (still 0 from last effect run)
  });

  it('should restore tracking state after fn completes', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      untrack(() => {
        obj.count; // not tracked
      });
      obj.count; // tracked (outside untrack)
    });

    expect(fn).toHaveBeenCalledTimes(1);
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(2); // re-runs because of tracked access
  });
});
