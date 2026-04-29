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
    effect(() => { r.value; fn(); });
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
    effect(() => { r.value; fn(); });
    r.value.count = 1; // 不应触发
    expect(fn).toHaveBeenCalledTimes(1);
    r.value = { count: 1 }; // 应触发
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should manually trigger with triggerRef', () => {
    const r = shallowRef({ count: 0 });
    const fn = vi.fn();
    effect(() => { r.value; fn(); });
    r.value.count = 1;
    expect(fn).toHaveBeenCalledTimes(1);
    triggerRef(r);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should create custom ref with customRef', () => {
    let value = 1;
    const r = customRef((track, trigger) => ({
      get() { track(); return value; },
      set(newVal: number) { value = newVal; trigger(); },
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
});
