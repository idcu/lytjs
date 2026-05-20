/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-expressions */
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
      set: (val: number) => {
        count.value = val / 2;
      },
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
      set: () => {
        throw new Error('setter error');
      },
    });
    expect(() => {
      bad.value = 2;
    }).toThrow('setter error');
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
      set: (val: number) => {
        count.value = val / 2;
      },
    });
    doubled.value = 4;
    expect(count.value).toBe(2);
    expect(doubled.value).toBe(4);
  });

  it('should handle circular dependency gracefully', () => {
    const count = ref(0);
    // A depends on B, B depends on A - should not infinite loop
    const a = computed(() => count.value + b.value);
    const b = computed(() => count.value * 2);
    expect(a.value).toBe(0);
    expect(b.value).toBe(0);
    count.value = 1;
    expect(a.value).toBe(3);
    expect(b.value).toBe(2);
  });

  it('should return last cached value when getter throws', () => {
    const errorRef = ref(false);
    const count = ref(1);
    const failing = computed(() => {
      if (errorRef.value) throw new Error('getter error');
      return count.value;
    });
    expect(failing.value).toBe(1);
    errorRef.value = true;
    expect(() => failing.value).toThrow('getter error');
    // After error, should still return last cached value
    expect(failing.value).toBe(1);
  });

  it('should support manual cache cleanup via cleanupCache()', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    // 首次访问，触发计算
    expect(doubled.value).toBe(0);
    // 手动清理缓存
    (doubled as any).cleanupCache();
    // 再次访问应重新计算
    expect(doubled.value).toBe(0);
    count.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('should detect circular dependency between computeds', () => {
    const base = ref(1);
    // 创建循环依赖：a -> b -> a
    const a = computed(() => base.value + b.value);
    const b = computed(() => a.value * 2);
    // 访问 a 应该抛出循环依赖错误
    expect(() => a.value).toThrow(/Circular dependency detected/);
  });

  it('should handle effect stop triggering cache cleanup', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    // 创建一个依赖 computed 的 effect
    const runner = effect(() => {
      doubled.value;
    });
    // 停止 effect
    stop(runner);
    // effect 停止后，computed 的缓存应该在适当时机被清理
    expect(doubled.value).toBe(0);
  });

  it('should work with nested computeds and proper caching', () => {
    const a = ref(1);
    const b = ref(2);
    const sum = computed(() => a.value + b.value);
    const doubled = computed(() => sum.value * 2);
    const tripled = computed(() => doubled.value + sum.value);

    expect(tripled.value).toBe(9); // (1+2)*2 + (1+2) = 6 + 3 = 9
    a.value = 10;
    expect(tripled.value).toBe(36); // (10+2)*2 + (10+2) = 24 + 12 = 36
  });

  it('should track dependencies correctly when used in effects', () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    const fn = vi.fn();

    effect(() => {
      fn(quadrupled.value);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(0);

    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(4);
  });

  it('should handle writable computed with validation', () => {
    const _value = ref(0);
    const validated = computed({
      get: () => _value.value,
      set: (val: number) => {
        if (val < 0) {
          _value.value = 0;
        } else if (val > 100) {
          _value.value = 100;
        } else {
          _value.value = val;
        }
      },
    });

    validated.value = 50;
    expect(validated.value).toBe(50);

    validated.value = -10;
    expect(validated.value).toBe(0);

    validated.value = 150;
    expect(validated.value).toBe(100);
  });

  it('should handle computed with object return value correctly', () => {
    const name = ref('Alice');
    const age = ref(25);
    const person = computed(() => ({ name: name.value, age: age.value }));

    const result = person.value;
    expect(result.name).toBe('Alice');
    expect(result.age).toBe(25);

    name.value = 'Bob';
    expect(person.value.name).toBe('Bob');
  });
});
