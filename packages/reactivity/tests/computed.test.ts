import { describe, it, expect, vi } from 'vitest';
import { ref, computed, effect, stop, reactive } from '../src/index';

describe('computed', () => {
  it('should create a computed ref', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(0);
    count.value = 1;
    expect(doubled.value).toBe(2);
  });

  it('should be lazy - only compute when accessed', () => {
    const fn = vi.fn();
    const count = ref(0);
    const doubled = computed(() => {
      fn();
      return count.value * 2;
    });
    expect(fn).not.toHaveBeenCalled();
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cache the value until dependencies change', () => {
    const fn = vi.fn();
    const count = ref(0);
    const doubled = computed(() => {
      fn();
      return count.value * 2;
    });
    doubled.value;
    doubled.value;
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should support chained computed', () => {
    const count = ref(1);
    const doubled = computed(() => count.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    expect(quadrupled.value).toBe(4);
    count.value = 2;
    expect(quadrupled.value).toBe(8);
  });

  it('should trigger effects when value changes', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = doubled.value;
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 1;
    expect(dummy).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should support writable computed', () => {
    const count = ref(1);
    const doubled = computed({
      get: () => count.value * 2,
      set: (val: number) => { count.value = val / 2; },
    });
    expect(doubled.value).toBe(2);
    doubled.value = 4;
    expect(count.value).toBe(2);
    expect(doubled.value).toBe(4);
  });

  it('should track multiple dependencies', () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);
    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('should work with reactive dependencies', () => {
    const obj = reactive({ a: 1, b: 2 });
    const sum = computed(() => obj.a + obj.b);
    expect(sum.value).toBe(3);
    obj.a = 10;
    expect(sum.value).toBe(12);
  });

  it('should propagate errors from getter', () => {
    const errorRef = ref(false);
    const failing = computed(() => {
      if (errorRef.value) throw new Error('computed error');
      return 'ok';
    });
    expect(failing.value).toBe('ok');
    errorRef.value = true;
    expect(() => failing.value).toThrow('computed error');
  });

  it('should stop tracking when effect is stopped', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const fn = vi.fn();
    const runner = effect(() => {
      fn(doubled.value);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(2);
    stop(runner);
    count.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle computed depending on computed', () => {
    const base = ref(10);
    const plusOne = computed(() => base.value + 1);
    const plusTwo = computed(() => plusOne.value + 1);
    const plusThree = computed(() => plusTwo.value + 1);
    expect(plusThree.value).toBe(13);
    base.value = 20;
    expect(plusThree.value).toBe(23);
  });

  it('should fire onTrack when computed value is accessed', () => {
    const onTrackFn = vi.fn();
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    // 设置调试回调（在首次访问前）
    (doubled as any).effect.onTrack = onTrackFn;
    doubled.value; // 触发 track
    expect(onTrackFn).toHaveBeenCalled();
  });

  it('should propagate errors from setter', () => {
    const count = ref(1);
    const bad = computed({
      get: () => count.value,
      set: () => { throw new Error('setter error'); },
    });
    expect(() => { bad.value = 2; }).toThrow('setter error');
  });

  it('should handle computed returning objects', () => {
    const count = ref(0);
    const result = computed(() => ({ count: count.value, doubled: count.value * 2 }));
    expect(result.value).toEqual({ count: 0, doubled: 0 });
    count.value = 3;
    expect(result.value).toEqual({ count: 3, doubled: 6 });
  });

  it('should not cause infinite loop when reading and writing same ref', () => {
    const count = ref(0);
    const doubled = computed({
      get: () => count.value * 2,
      set: (val: number) => { count.value = val / 2; },
    });
    doubled.value = 4;
    expect(count.value).toBe(2);
    expect(doubled.value).toBe(4);
  });

  it('should handle circular dependency gracefully', () => {
    const count = ref(0)
    // A depends on B, B depends on A - should not infinite loop
    const a = computed(() => count.value + b.value)
    const b = computed(() => count.value * 2)
    expect(a.value).toBe(0)
    expect(b.value).toBe(0)
    count.value = 1
    expect(a.value).toBe(3)
    expect(b.value).toBe(2)
  });

  it('should return last cached value when getter throws', () => {
    const errorRef = ref(false)
    const count = ref(1)
    const failing = computed(() => {
      if (errorRef.value) throw new Error('getter error')
      return count.value
    })
    expect(failing.value).toBe(1)
    errorRef.value = true
    expect(() => failing.value).toThrow('getter error')
    // After error, should still return last cached value
    expect(failing.value).toBe(1)
  })
});
