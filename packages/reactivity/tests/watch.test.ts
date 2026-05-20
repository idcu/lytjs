/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, reactive, computed, watch, watchEffect } from '../src/index';
import { nextTick } from '@lytjs/common-scheduler';

describe('watch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should watch a ref', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1, 0, expect.any(Function));
  });

  it('should support immediate option', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { immediate: true });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(0, undefined, expect.any(Function));
  });

  it('should watch deeply with deep option', async () => {
    const obj = reactive({ nested: { count: 0 } });
    const fn = vi.fn();
    watch(obj, fn, { deep: true });
    obj.nested.count = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should watch a getter function', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(() => count.value * 2, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(2, 0, expect.any(Function));
  });

  it('should watch multiple sources', async () => {
    const a = ref(1);
    const b = ref(2);
    const fn = vi.fn();
    watch([a, b], fn);
    a.value = 10;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith([10, 2], [1, 2], expect.any(Function));
    b.value = 20;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should stop watching when handle is called', async () => {
    const count = ref(0);
    const fn = vi.fn();
    const stop = watch(count, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    stop();
    count.value = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onCleanup when watch re-triggers', async () => {
    const count = ref(0);
    const cleanupFn = vi.fn();
    const fn = vi.fn((_, __, onCleanup) => {
      onCleanup(cleanupFn);
    });
    watch(count, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 2;
    await nextTick();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should stop after first trigger with once option', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { once: true });
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should support flush sync', () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { flush: 'sync' });
    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should support flush post', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { flush: 'post' });
    count.value = 1;
    expect(fn).not.toHaveBeenCalled();
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should watch a computed ref', async () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const fn = vi.fn();
    watch(doubled, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(2, 0, expect.any(Function));
  });

  it('should watch a single property of reactive object', async () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    watch(() => obj.count, fn);
    obj.count = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(1, 0, expect.any(Function));
  });

  it('should provide correct old value for primitive refs', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(1, 0, expect.any(Function));
    count.value = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(2, 1, expect.any(Function));
  });

  it('should have same reference for object old/new values', async () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    watch(obj, fn, { deep: true });
    obj.count = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(obj, obj, expect.any(Function));
  });

  it('should support custom scheduler', async () => {
    const count = ref(0);
    const fn = vi.fn();
    let jobFn: (() => void) | undefined;
    const schedulerFn = vi.fn((job: () => void) => {
      jobFn = job;
    });
    watch(count, fn, { scheduler: schedulerFn });
    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(0);
    expect(schedulerFn).toHaveBeenCalledTimes(1);
    // 手动执行 job
    if (jobFn) jobFn();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should not track nested changes in reactive object without deep option', async () => {
    const obj = reactive({ nested: { value: 1 } });
    const fn = vi.fn();
    watch(() => obj.nested.value, fn);
    obj.nested.value = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('watchEffect', () => {
  it('should auto-track dependencies', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watchEffect(() => {
      fn(count.value);
    });
    expect(fn).toHaveBeenCalledWith(0);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('should stop watchEffect', async () => {
    const count = ref(0);
    const fn = vi.fn();
    const stop = watchEffect(() => {
      fn(count.value);
    });
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2);
    stop();
    count.value = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should support onCleanup in watchEffect', async () => {
    const count = ref(0);
    const cleanupFn = vi.fn();
    watchEffect((onCleanup) => {
      onCleanup(cleanupFn);
      count.value;
    });
    count.value = 1;
    await nextTick();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });
});
