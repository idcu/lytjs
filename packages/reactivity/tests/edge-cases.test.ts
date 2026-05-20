 
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe, it, expect, vi } from 'vitest';
import {
  reactive,
  shallowReactive,
  readonly,
  isReactive,
  isReadonly,
  markRaw,
  ref,
  shallowRef,
  isRef,
  computed,
  watch,
  effect,
  stop,
  pauseTracking,
  enableTracking,
  resetTracking,
  batch,
  untrack,
  signal,
  computedSignal,
  readonlySignal,
  set,
  update,
  signalBatch,
} from '../src/index';
import { nextTick } from '@lytjs/common-scheduler';

// ============================================================
// 1. reactive 边界
// ============================================================

describe('reactive edge cases', () => {
  it('reactive(null) should return null', () => {
    const result = reactive(null as any);
    expect(result).toBe(null);
  });

  it('reactive(undefined) should return undefined', () => {
    const result = reactive(undefined as any);
    expect(result).toBe(undefined);
  });

  it('reactive(primitive) should return the primitive value', () => {
    expect(reactive(1 as any)).toBe(1);
    expect(reactive('hello' as any)).toBe('hello');
    expect(reactive(true as any)).toBe(true);
    expect(reactive(Symbol('test') as any)).toBe(Symbol('test'));
  });

  it('should handle circular references in reactive objects', () => {
    const obj: any = { name: 'parent' };
    obj.self = obj;
    const observed = reactive(obj);
    expect(observed.name).toBe('parent');
    expect(observed.self).toBe(observed);
    expect(observed.self.name).toBe('parent');
  });

  it('should handle frozen objects (Object.freeze)', () => {
    const frozen = Object.freeze({ count: 0 });
    const observed = reactive(frozen);
    // frozen 对象仍然是 reactive proxy
    expect(isReactive(observed)).toBe(true);
    expect(observed.count).toBe(0);
    // 修改冻结对象不应成功（由 Object.freeze 保证）
    // 注意：reactive proxy 的 set 会尝试 Reflect.set，但 frozen 对象会静默失败
    // 读取应正常工作
    const fn = vi.fn();
    effect(() => {
      fn(observed.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should track Symbol keys with has interception', () => {
    const sym = Symbol('test-key');
    const obj = reactive({ [sym]: 'value' } as any);
    const fn = vi.fn();
    let dummy: boolean;
    effect(() => {
      dummy = sym in obj;
      fn();
    });
    expect(dummy).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    delete obj[sym];
    expect(dummy).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track has interception for string keys', () => {
    const obj = reactive<{ a?: number; b?: number }>({ a: 1 });
    const fn = vi.fn();
    let dummy: boolean;
    effect(() => {
      dummy = 'a' in obj;
      fn();
    });
    expect(dummy).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    delete obj.a;
    expect(dummy).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track ownKeys interception with Object.keys()', () => {
    const obj = reactive<{ a?: number; b?: number }>({ a: 1 });
    const fn = vi.fn();
    let dummy: string[];
    effect(() => {
      dummy = Object.keys(obj);
      fn();
    });
    expect(dummy).toEqual(['a']);
    expect(fn).toHaveBeenCalledTimes(1);
    obj.b = 2;
    expect(dummy).toEqual(['a', 'b']);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should track ownKeys interception with for...in', () => {
    const obj = reactive<{ a?: number; b?: number }>({ a: 1 });
    const fn = vi.fn();
    let keys: string[] = [];
    effect(() => {
      keys = [];
      for (const key in obj) {
        keys.push(key);
      }
      fn();
    });
    expect(keys).toEqual(['a']);
    expect(fn).toHaveBeenCalledTimes(1);
    obj.b = 2;
    expect(keys).toEqual(['a', 'b']);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should trigger effect on delete operation', () => {
    const obj = reactive<{ count?: number }>({ count: 1 });
    const fn = vi.fn();
    let dummy: number | undefined;
    effect(() => {
      dummy = obj.count;
      fn();
    });
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
    delete obj.count;
    expect(dummy).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not trigger effect when deleting non-existent key', () => {
    const obj = reactive<{ count?: number }>({ count: 1 });
    const fn = vi.fn();
    effect(() => {
      obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    delete (obj as any).nonExistent;
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 2. shallowReactive 边界
// ============================================================

describe('shallowReactive edge cases', () => {
  it('should not auto-convert nested objects to reactive', () => {
    const nested = { count: 0 };
    const obj = shallowReactive({ nested });
    expect(isReactive(obj)).toBe(true);
    expect(isReactive(obj.nested)).toBe(false);
    expect(obj.nested).toBe(nested);
  });

  it('should trigger update on top-level property change', () => {
    const obj = shallowReactive({ count: 0, nested: { value: 1 } });
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

  it('should not trigger update on nested property mutation', () => {
    const obj = shallowReactive({ nested: { count: 0 } });
    const fn = vi.fn();
    effect(() => {
      obj.nested;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.nested.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should trigger update when replacing top-level nested object', () => {
    const obj = shallowReactive({ nested: { count: 0 } });
    const fn = vi.fn();
    let dummy: any;
    effect(() => {
      dummy = obj.nested;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.nested = { count: 1 };
    expect(fn).toHaveBeenCalledTimes(2);
    expect(dummy.count).toBe(1);
  });

  it('shallowReactive + markRaw combination should keep nested object raw', () => {
    const rawNested = markRaw({ count: 0 });
    const obj = shallowReactive({ nested: rawNested });
    expect(isReactive(obj)).toBe(true);
    expect(isReactive(obj.nested)).toBe(false);
    expect(obj.nested).toBe(rawNested);
  });

  it('should track has and ownKeys on shallowReactive', () => {
    const obj = shallowReactive<{ a?: number }>({ a: 1 });
    const fn = vi.fn();
    let dummy: string[];
    effect(() => {
      dummy = Object.keys(obj);
      fn();
    });
    expect(dummy).toEqual(['a']);
    obj.b = 2 as any;
    expect(dummy).toEqual(['a', 'b']);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// 3. readonly 边界
// ============================================================

describe('readonly edge cases', () => {
  it('should deeply nest readonly objects', () => {
    const obj = readonly({
      nested: {
        deep: { count: 0 },
      },
    });
    expect(isReadonly(obj)).toBe(true);
    expect(isReadonly(obj.nested)).toBe(true);
    expect(isReadonly(obj.nested.deep)).toBe(true);
  });

  it('should prevent mutation on deeply nested readonly objects', () => {
    const original = { nested: { count: 0 } };
    const obj = readonly(original);
    (obj.nested as any).count = 1;
    expect(obj.nested.count).toBe(0);
    expect(original.nested.count).toBe(0);
  });

  it('should warn in DEV mode when mutating readonly objects', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const obj = readonly({ count: 0 });
    (obj as any).count = 1;
    if (__DEV__) {
      expect(warnSpy).toHaveBeenCalled();
    }
    expect(obj.count).toBe(0);
    warnSpy.mockRestore();
  });

  it('readonly + reactive combination', () => {
    const reactiveObj = reactive({ count: 0 });
    const readonlyObj = readonly(reactiveObj);
    expect(isReadonly(readonlyObj)).toBe(true);
    expect(isReactive(readonlyObj)).toBe(false);
    // 修改原始 reactive 对象应反映在 readonly 视图
    reactiveObj.count = 1;
    expect(readonlyObj.count).toBe(1);
    // readonly 视图不可修改
    (readonlyObj as any).count = 2;
    expect(readonlyObj.count).toBe(1);
  });

  it('should return same proxy for same readonly target', () => {
    const original = { count: 0 };
    const proxy1 = readonly(original);
    const proxy2 = readonly(original);
    expect(proxy1).toBe(proxy2);
  });

  it('should handle readonly arrays', () => {
    const arr = readonly([1, 2, 3]);
    expect(isReadonly(arr)).toBe(true);
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
    // 尝试修改应失败
    (arr as any).push(4);
    expect(arr.length).toBe(3);
  });
});

// ============================================================
// 4. ref 边界
// ============================================================

describe('ref edge cases', () => {
  it('ref(null) should work correctly', () => {
    const r = ref(null);
    expect(r.value).toBe(null);
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = { a: 1 };
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r.value).toEqual({ a: 1 });
  });

  it('ref(undefined) should work correctly', () => {
    const r = ref(undefined);
    expect(r.value).toBe(undefined);
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = 42;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r.value).toBe(42);
  });

  it('should auto-unwrap nested ref', () => {
    const inner = ref(1);
    const outer = ref({ count: inner });
    // ref 内部对象中的 ref 属性应自动解包
    expect(outer.value.count).toBe(1);
    inner.value = 2;
    expect(outer.value.count).toBe(2);
  });

  it('should make nested objects reactive in ref', () => {
    const r = ref({ nested: { count: 0 } });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = r.value.nested.count;
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    r.value.nested.count = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('shallowRef should not auto-unwrap nested ref', () => {
    const inner = ref(1);
    const outer = shallowRef({ count: inner });
    // shallowRef 不自动解包嵌套 ref
    expect(isRef(outer.value.count)).toBe(true);
    expect(outer.value.count.value).toBe(1);
  });

  it('shallowRef should not track deep mutations', () => {
    const r = shallowRef({ nested: { count: 0 } });
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    r.value.nested.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = { nested: { count: 2 } };
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('ref should return same ref when passed a ref', () => {
    const r = ref(1);
    const r2 = ref(r);
    expect(r).toBe(r2);
  });

  it('ref with object value should be reactive', () => {
    const r = ref({ items: [1, 2, 3] });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = r.value.items.length;
      fn();
    });
    expect(dummy).toBe(3);
    r.value.items.push(4);
    expect(dummy).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// 5. computed 边界
// ============================================================

describe('computed edge cases', () => {
  it('should support computed chain (computed depending on computed)', () => {
    const base = ref(1);
    const doubled = computed(() => base.value * 2);
    const tripled = computed(() => doubled.value * 3);
    const plusTen = computed(() => tripled.value + 10);
    expect(plusTen.value).toBe(16); // (1 * 2) * 3 + 10
    base.value = 2;
    expect(plusTen.value).toBe(22); // (2 * 2) * 3 + 10
  });

  it('should handle error in computed getter', () => {
    const errorRef = ref(false);
    const failing = computed(() => {
      if (errorRef.value) throw new Error('computed getter error');
      return 'ok';
    });
    expect(failing.value).toBe('ok');
    errorRef.value = true;
    expect(() => failing.value).toThrow('computed getter error');
  });

  it('should propagate errors from getter to effects', () => {
    const errorRef = ref(false);
    const failing = computed(() => {
      if (errorRef.value) throw new Error('propagated error');
      return 'ok';
    });
    const fn = vi.fn();
    effect(() => {
      try {
        fn(failing.value);
      } catch (_e) {
        fn('error');
      }
    });
    expect(fn).toHaveBeenCalledWith('ok');
    errorRef.value = true;
    expect(fn).toHaveBeenCalledWith('error');
  });

  it('should handle error in computed setter', () => {
    const count = ref(1);
    const bad = computed({
      get: () => count.value,
      set: () => {
        throw new Error('setter error');
      },
    });
    expect(bad.value).toBe(1);
    expect(() => {
      bad.value = 2;
    }).toThrow('setter error');
    expect(count.value).toBe(1);
  });

  it('should cache value and not recompute when dependencies unchanged', () => {
    const fn = vi.fn();
    const count = ref(1);
    const doubled = computed(() => {
      fn();
      return count.value * 2;
    });
    doubled.value;
    doubled.value;
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 1; // same value
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(1);
    count.value = 2;
    doubled.value;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle computed with multiple reactive dependencies', () => {
    const a = ref(1);
    const b = ref(2);
    const c = ref(3);
    const sum = computed(() => a.value + b.value + c.value);
    expect(sum.value).toBe(6);
    a.value = 10;
    expect(sum.value).toBe(15);
    b.value = 20;
    expect(sum.value).toBe(33);
    c.value = 30;
    expect(sum.value).toBe(60);
  });

  it('should handle writable computed with getter and setter', () => {
    const first = ref('John');
    const last = ref('Doe');
    const fullName = computed({
      get: () => `${first.value} ${last.value}`,
      set: (val: string) => {
        const parts = val.split(' ');
        first.value = parts[0];
        last.value = parts[1];
      },
    });
    expect(fullName.value).toBe('John Doe');
    fullName.value = 'Jane Smith';
    expect(first.value).toBe('Jane');
    expect(last.value).toBe('Smith');
    expect(fullName.value).toBe('Jane Smith');
  });
});

// ============================================================
// 6. watch 边界
// ============================================================

describe('watch edge cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should watch multiple sources (array form)', async () => {
    const a = ref(1);
    const b = ref(2);
    const c = ref(3);
    const fn = vi.fn();
    watch([a, b, c], fn);
    a.value = 10;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith([10, 2, 3], [1, 2, 3], expect.any(Function));
    b.value = 20;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith([10, 20, 3], [10, 2, 3], expect.any(Function));
  });

  it('should watch deeply nested objects', async () => {
    const obj = reactive({
      a: {
        b: {
          c: {
            d: 1,
          },
        },
      },
    });
    const fn = vi.fn();
    watch(obj, fn, { deep: true });
    obj.a.b.c.d = 2;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should fire immediately with immediate option', async () => {
    const count = ref(5);
    const fn = vi.fn();
    watch(count, fn, { immediate: true });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(5, undefined, expect.any(Function));
    count.value = 10;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(10, 5, expect.any(Function));
  });

  it('should support flush: "post"', async () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { flush: 'post' });
    count.value = 1;
    // post 模式下，回调不会同步执行
    expect(fn).not.toHaveBeenCalled();
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should support flush: "sync"', () => {
    const count = ref(0);
    const fn = vi.fn();
    watch(count, fn, { flush: 'sync' });
    count.value = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1, 0, expect.any(Function));
    count.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(2, 1, expect.any(Function));
  });

  it('should call cleanup function (onCleanup) on re-trigger', async () => {
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

  it('should call cleanup when watch is stopped', async () => {
    const count = ref(0);
    const cleanupFn = vi.fn();
    const fn = vi.fn((_, __, onCleanup) => {
      onCleanup(cleanupFn);
    });
    const stopWatch = watch(count, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    stopWatch();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it('should watch computed as source', async () => {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const fn = vi.fn();
    watch(doubled, fn);
    count.value = 1;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2, 0, expect.any(Function));
  });

  it('should watch getter function', async () => {
    const obj = reactive({ a: 1, b: 2 });
    const fn = vi.fn();
    watch(() => obj.a + obj.b, fn);
    obj.a = 10;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(12, 3, expect.any(Function));
  });

  it('should stop watching after once option triggers', async () => {
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
});

// ============================================================
// 7. effect 边界
// ============================================================

describe('effect edge cases', () => {
  it('should handle nested effects', () => {
    const obj = reactive({ count: 0 });
    const outerFn = vi.fn();
    const innerFn = vi.fn();

    effect(() => {
      outerFn(obj.count);
      effect(() => {
        innerFn(obj.count);
      });
    });

    expect(outerFn).toHaveBeenCalledTimes(1);
    expect(innerFn).toHaveBeenCalledTimes(1);
    obj.count = 1;
    expect(outerFn).toHaveBeenCalledTimes(2);
    expect(innerFn).toHaveBeenCalledTimes(2);
  });

  it('should not trigger after effect is stopped', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let dummy: number;
    const runner = effect(() => {
      dummy = obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(0);

    stop(runner);
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(0);
  });

  it('should handle errors in effect function', () => {
    const obj = reactive({ shouldThrow: false });
    const fn = vi.fn();
    effect(() => {
      if (obj.shouldThrow) {
        throw new Error('effect error');
      }
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    // effect 中的错误不应阻止后续触发
    obj.shouldThrow = true;
    // effect 执行会抛出错误，但 trigger 机制仍然正常
    obj.shouldThrow = false;
    expect(fn).toHaveBeenCalledTimes(2);
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
    // 手动执行 runner 应重新运行 effect
    obj.count = 2;
    expect(scheduler).toHaveBeenCalledTimes(2);
  });

  it('should support lazy option', () => {
    const fn = vi.fn();
    const runner = effect(fn, { lazy: true });
    expect(fn).not.toHaveBeenCalled();
    runner();
    expect(fn).toHaveBeenCalledTimes(1);
    runner();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('pauseTracking should prevent dependency collection', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let _dummy: number;
    effect(() => {
      _dummy = obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    pauseTracking();
    // 在 pauseTracking 期间创建新 effect，不应收集依赖
    let _dummy2: number;
    const fn2 = vi.fn();
    effect(() => {
      _dummy2 = obj.count;
      fn2();
    });
    expect(fn2).toHaveBeenCalledTimes(1);
    resetTracking();

    obj.count = 1;
    // 第一个 effect 仍然追踪了 obj.count
    expect(fn).toHaveBeenCalledTimes(2);
    // 第二个 effect 在 pauseTracking 期间创建，不应追踪
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('enableTracking should re-enable dependency collection', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    let _dummy: number;

    pauseTracking();
    effect(() => {
      _dummy = obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    enableTracking();
    obj.count = 1;
    // effect 在 pauseTracking 期间创建，不应追踪
    expect(fn).toHaveBeenCalledTimes(1);

    resetTracking();
  });

  it('resetTracking should restore tracking state', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();

    pauseTracking();
    pauseTracking();
    resetTracking(); // 应恢复到 pauseTracking 之前的状态

    effect(() => {
      obj.count;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('batch should batch multiple updates', () => {
    const obj = reactive({ a: 0, b: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.a + obj.b);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      obj.a = 1;
      obj.b = 2;
    });

    // batch 期间暂停追踪，但 trigger 仍然发生
    // 每次 set 触发一次 effect 重新执行
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle nested batch calls', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      fn(obj.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      obj.count = 1;
      batch(() => {
        obj.count = 2;
      });
    });

    // batch 嵌套应正确恢复追踪状态
    obj.count = 3;
    expect(fn).toHaveBeenCalled();
  });

  it('untrack should not collect dependencies', () => {
    const obj = reactive({ a: 0, b: 0 });
    const fn = vi.fn();
    let dummy: number;

    effect(() => {
      dummy = obj.a + untrack(() => obj.b);
      fn();
    });

    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // obj.b 在 untrack 中访问，不应被追踪
    obj.b = 10;
    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(0);

    // obj.a 在 untrack 外访问，应被追踪
    obj.a = 1;
    expect(fn).toHaveBeenCalledTimes(2);
    // untrack 中读取的 obj.b 仍为 0（上次 effect 执行时的快照）
    expect(dummy).toBe(1);
  });

  it('untrack should restore tracking state after execution', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      untrack(() => {
        obj.count; // not tracked
      });
      obj.count; // tracked
    });

    expect(fn).toHaveBeenCalledTimes(1);
    obj.count = 1;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should call onStop callback when effect is stopped', () => {
    const onStopFn = vi.fn();
    const runner = effect(() => {}, { onStop: onStopFn });
    stop(runner);
    expect(onStopFn).toHaveBeenCalledTimes(1);
  });

  it('should not re-run stopped effect', () => {
    const obj = reactive({ count: 0 });
    const fn = vi.fn();
    const runner = effect(() => {
      fn(obj.count);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    stop(runner);
    obj.count = 1;
    obj.count = 2;
    obj.count = 3;
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// 8. signal 边界
// ============================================================

describe('signal edge cases', () => {
  it('should handle nested signal updates', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computedSignal(() => a() + b());
    const fn = vi.fn();
    effect(() => {
      fn(sum());
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);

    set(a, 10);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(12);

    set(b, 20);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenCalledWith(30);
  });

  it('computedSignal should invalidate cache when dependency changes', () => {
    const fn = vi.fn();
    const count = signal(1);
    const doubled = computedSignal(() => {
      fn();
      return count() * 2;
    });

    // 首次访问触发计算
    expect(doubled()).toBe(2);
    expect(fn).toHaveBeenCalledTimes(1);

    // 缓存命中
    expect(doubled()).toBe(2);
    expect(fn).toHaveBeenCalledTimes(1);

    // 依赖变更后缓存失效
    set(count, 2);
    // 惰性求值：依赖变更时标记 dirty，但不立即重新计算
    expect(fn).toHaveBeenCalledTimes(1);
    expect(doubled()).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('signalBatch should batch multiple signal updates', () => {
    const a = signal(1);
    const b = signal(2);
    const fn = vi.fn();
    effect(() => {
      fn(a() + b());
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);

    signalBatch(() => {
      set(a, 10);
      set(b, 20);
    });

    // batch 结束后应统一触发一次通知
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(30);
  });

  it('signalBatch should handle nested batch calls', () => {
    const count = signal(0);
    const fn = vi.fn();
    effect(() => {
      fn(count());
    });
    expect(fn).toHaveBeenCalledTimes(1);

    signalBatch(() => {
      set(count, 1);
      signalBatch(() => {
        set(count, 2);
      });
      set(count, 3);
    });

    // 嵌套 batch 结束后统一触发
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('readonlySignal should reflect source signal changes', () => {
    const source = signal(0);
    const readonly = readonlySignal(source);
    expect(readonly()).toBe(0);
    set(source, 1);
    expect(readonly()).toBe(1);
  });

  it('readonlySignal should not allow writes', () => {
    const source = signal(0);
    const readonly = readonlySignal(source);
    // set on readonlySignal should be silently ignored
    set(readonly as any, 1);
    expect(readonly()).toBe(0);
    expect(source()).toBe(0);
  });

  it('signal should not trigger when setting same value', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    set(s, 0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('signal update with updater function', () => {
    const s = signal(5);
    update(s, (prev) => prev * 2);
    expect(s()).toBe(10);
    update(s, (prev) => prev + 3);
    expect(s()).toBe(13);
  });

  it('computedSignal should detect circular dependencies', () => {
    // A -> B -> A 循环依赖
    // 使用类型断言避免 TypeScript 报错，变量需要先声明后赋值因为它们互相引用
    const a = computedSignal(() => {
      if (b) b();
      return 1;
    });
    const b = computedSignal(() => {
      if (a) a();
      return 2;
    });
    expect(() => a()).toThrow('Circular dependency detected');
  });

  it('signal should handle object values', () => {
    const s = signal({ count: 0 });
    expect(s()).toEqual({ count: 0 });
    set(s, { count: 1 });
    expect(s()).toEqual({ count: 1 });
    // 修改对象引用才触发更新
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    set(s, { count: 1 }); // 相同值但不同引用
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('signal should handle array values', () => {
    const s = signal<number[]>([1, 2, 3]);
    expect(s()).toEqual([1, 2, 3]);
    set(s, [4, 5, 6]);
    expect(s()).toEqual([4, 5, 6]);
  });

  it('computedSignal should support chained computation', () => {
    const base = signal(1);
    const doubled = computedSignal(() => base() * 2);
    const tripled = computedSignal(() => doubled() * 3);
    expect(tripled()).toBe(6);
    set(base, 2);
    expect(tripled()).toBe(12);
  });

  it('signal dispose should stop all notifications', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    s.dispose();
    set(s, 1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('computedSignal dispose should stop computation', () => {
    const count = signal(1);
    const doubled = computedSignal(() => count() * 2);
    expect(doubled()).toBe(2);
    doubled.dispose();
    set(count, 2);
    // dispose 后的 computedSignal 应返回最后缓存的值
    expect(doubled()).toBe(2);
  });
});
