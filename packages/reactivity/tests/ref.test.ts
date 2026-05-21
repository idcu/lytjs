/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe, it, expect, vi } from 'vitest';
import {
  ref,
  shallowRef,
  triggerRef,
  isRef,
  unref,
  toRefs,
  toRef,
  customRef,
  reactive,
  effect,
  isShallowRef,
  isComputedRef,
  toValue,
} from '../src/index';

describe('ref', () => {
  it('should create a ref with initial value', () => {
    const r = ref(0);
    expect(r.value).toBe(0);
  });

  it('should trigger when ref value changes', () => {
    const r = ref(0);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = r.value;
      fn();
    });
    expect(dummy).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not trigger when setting the same value (primitive)', () => {
    const r = ref(0);
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    r.value = 0;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should unwrap nested refs', () => {
    const inner = ref(0);
    const r = ref({ count: inner });
    expect(r.value.count).toBe(0);
  });

  it('should correctly identify refs with isRef', () => {
    expect(isRef(ref(0))).toBe(true);
    expect(isRef(0)).toBe(false);
    expect(isRef({ value: 0 })).toBe(false);
  });

  it('should unwrap ref with unref', () => {
    const r = ref(10);
    expect(unref(r)).toBe(10);
    expect(unref(20)).toBe(20);
  });

  it('should convert reactive object to refs with toRefs', () => {
    const obj = reactive({ a: 1, b: 2 });
    const refs = toRefs(obj);
    expect(isRef(refs.a)).toBe(true);
    expect(isRef(refs.b)).toBe(true);
    expect(refs.a.value).toBe(1);
    expect(refs.b.value).toBe(2);
  });

  it('should keep toRefs in sync with reactive object', () => {
    const obj = reactive({ a: 1 });
    const refs = toRefs(obj);
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = refs.a.value;
      fn();
    });
    obj.a = 2;
    expect(dummy).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should create a ref for a single property with toRef', () => {
    const obj = { a: 1 };
    const aRef = toRef(obj, 'a');
    expect(aRef.value).toBe(1);
    obj.a = 2;
    expect(aRef.value).toBe(2);
  });

  it('should not deeply unwrap with shallowRef', () => {
    const r = shallowRef({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    r.value.count = 1; // 不应触发
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = { count: 1 }; // 应触发
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should manually trigger with triggerRef', () => {
    const r = shallowRef({ count: 0 });
    const fn = vi.fn();
    effect(() => {
      r.value;
      fn();
    });
    r.value.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    triggerRef(r);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should create custom ref with customRef', () => {
    let value = 1;
    const r = customRef((track, trigger) => ({
      get() {
        track();
        return value;
      },
      set(newVal: number) {
        value = newVal;
        trigger();
      },
    }));
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = r.value;
      fn();
    });
    expect(dummy).toBe(1);
    r.value = 2;
    expect(dummy).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should work with reactive objects containing refs', () => {
    const r = ref(1);
    const obj = reactive({ r });
    const fn = vi.fn();
    let dummy: number;
    effect(() => {
      dummy = obj.r;
      fn();
    });
    expect(dummy).toBe(1);
    r.value = 2;
    expect(dummy).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle refs in arrays', () => {
    const r = ref(0);
    const arr = reactive([r]);
    const fn = vi.fn();
    let dummy: any;
    effect(() => {
      dummy = arr[0].value; // 数组整数索引不解包 ref，需手动 .value
      fn();
    });
    expect(dummy).toBe(0);
    r.value = 1;
    expect(dummy).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle null and undefined ref values', () => {
    const nullRef = ref(null);
    expect(nullRef.value).toBe(null);
    const undefinedRef = ref(undefined);
    expect(undefinedRef.value).toBe(undefined);
  });

  // ==================== 新增测试用例 ====================

  it('should identify shallowRef with isShallowRef', () => {
    const r = shallowRef(0);
    expect(isShallowRef(r)).toBe(true);
    expect(isShallowRef(ref(0))).toBe(false);
  });

  it('should identify computedRef with isComputedRef', () => {
    // computed 返回的是 ComputedRef
    const c = { value: 0, __v_isRef: true, __v_isComputed: true };
    expect(isComputedRef(c)).toBe(true);
    expect(isComputedRef(ref(0))).toBe(false);
  });

  it('should normalize value with toValue for ref', () => {
    const r = ref(42);
    expect(toValue(r)).toBe(42);
  });

  it('should normalize value with toValue for function', () => {
    const fn = () => 42;
    expect(toValue(fn)).toBe(42);
  });

  it('should normalize value with toValue for plain value', () => {
    expect(toValue(42)).toBe(42);
  });

  it('should handle string ref values', () => {
    const r = ref('hello');
    expect(r.value).toBe('hello');
    r.value = 'world';
    expect(r.value).toBe('world');
  });

  it('should handle boolean ref values', () => {
    const r = ref(true);
    expect(r.value).toBe(true);
    r.value = false;
    expect(r.value).toBe(false);
  });

  it('should handle array ref values', () => {
    const r = ref([1, 2, 3]);
    expect(r.value).toEqual([1, 2, 3]);
    r.value.push(4);
    expect(r.value).toEqual([1, 2, 3, 4]);
  });

  it('should handle object ref values with deep reactivity', () => {
    const r = ref({ name: 'test' });
    const fn = vi.fn();
    effect(() => {
      r.value.name;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    r.value.name = 'changed';
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should return existing ref when calling ref on a ref', () => {
    const r = ref(0);
    const r2 = ref(r);
    expect(r2).toBe(r);
  });

  it('should warn when passing ShallowRef to ref() in dev mode', () => {
    const sr = shallowRef(0);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = ref(sr);
    expect(r).toBe(sr);
    // 在测试环境中 __DEV__ 为 true，应该会有警告
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
