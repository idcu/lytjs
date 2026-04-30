// src/ref.ts
// Ref 响应式引用
// 复用 @lytjs/common-is: isObject, hasChanged

import { isObject, hasChanged } from "@lytjs/common-is";
import { track, trigger, activeEffect, shouldTrack } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./constants";
import { toRaw, isRef } from "./shared";
import { reactive } from "./reactive";

// ==================== Ref 类型（内部简化版，避免 unique symbol 在 DTS 中的问题） ====================

export interface Ref<T = any> {
  value: T;
  __v_isRef: true;
}

export interface ShallowRef<T = any> extends Ref<T> {
  __v_isShallow: true;
}

export interface ComputedRef<T = any> extends Ref<T> {
  __v_isComputed: true;
}

// ==================== Ref 类 ====================

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;
  public dep: Set<any> = new Set();
  public readonly __v_isRef = true;

  constructor(value: T, isShallow: boolean) {
    this._rawValue = isShallow ? value : toRaw(value);
    this._value = isShallow ? value : toReactive(value);
  }

  get value(): T {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal: T) {
    const useDirectValue = (this as any).__v_isShallow;
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (hasChanged(newVal, this._rawValue)) {
      const oldVal = this._rawValue;
      this._rawValue = newVal;
      this._value = useDirectValue ? newVal : toReactive(newVal);
      triggerRefValue(this, newVal, oldVal);
    }
  }
}

class ShallowRefImpl<T> {
  private _value: T;
  private _rawValue: T;
  public dep: Set<any> = new Set();
  public readonly __v_isRef = true;
  public readonly __v_isShallow = true as const;

  constructor(value: T) {
    this._rawValue = value;
    this._value = value;
  }

  get value(): T {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal: T) {
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = newVal;
      triggerRefValue(this, newVal);
    }
  }
}

// ==================== 追踪与触发 ====================

export function trackRefValue(ref: any) {
  if (shouldTrack && activeEffect) {
    track(ref, TrackOpTypes.GET, "value");
  }
}

export function triggerRefValue(ref: any, newVal?: any, oldVal?: any) {
  trigger(ref, TriggerOpTypes.SET, "value", newVal, oldVal);
}

// ==================== 公共 API ====================

export function ref<T>(value: T): Ref<T> {
  if (isRef(value)) return value as Ref<T>;
  return new RefImpl(value, false) as unknown as Ref<T>;
}

export function shallowRef<T>(value: T): ShallowRef<T> {
  if (isRef(value)) return value as unknown as ShallowRef<T>;
  return new ShallowRefImpl(value) as unknown as ShallowRef<T>;
}

export function triggerRef<T>(ref: ShallowRef<T>): void {
  triggerRefValue(ref, ref.value);
}

export { isRef } from "./shared";

export function unref<T>(r: T | Ref<T>): T {
  return isRef(r) ? (r as any).value : (r as T);
}

export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K,
): Ref<T[K]> {
  if (isRef(object[key])) return object[key] as Ref<T[K]>;
  return new ObjectRefImpl(object, key) as any;
}

export function toRefs<T extends object>(
  object: any,
): { [K in keyof T]: Ref<T[K]> } {
  const result: any = {};
  for (const key in object) {
    result[key] = toRef(object, key);
  }
  return result;
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any;
}

// ==================== 内部实现类 ====================

class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true;

  constructor(
    private readonly _object: T,
    private readonly _key: K,
  ) {}

  get value(): T[K] {
    return this._object[this._key];
  }

  set value(newVal: T[K]) {
    this._object[this._key] = newVal;
  }
}

class CustomRefImpl<T> {
  public readonly __v_isRef = true;
  private readonly _getter: () => T;
  private readonly _setter: (value: T) => void;

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this as any),
      () => triggerRefValue(this as any),
    );
    this._getter = get;
    this._setter = set;
  }

  get value(): T {
    return this._getter();
  }

  set value(newVal: T) {
    this._setter(newVal);
  }
}

// ==================== 辅助函数 ====================

type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void,
) => { get: () => T; set: (value: T) => void };

function toReactive(value: any): any {
  return isObject(value) ? reactive(value) : value;
}
