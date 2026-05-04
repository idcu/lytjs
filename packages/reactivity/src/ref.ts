// src/ref.ts
// Ref 响应式引用
// 复用 @lytjs/common-is: isObject, hasChanged

import { isObject, hasChanged } from '@lytjs/common-is';
import { track, trigger, getActiveEffect, getShouldTrack, createDep } from './effect';
import type { Dep } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './constants';
import { toRaw, isRef } from './shared';
import { reactive } from './reactive';

// ==================== Ref 类型 ====================

/** Internal interface for ref-like objects used in track/trigger */
export interface RefLike<T = unknown> {
  dep: Dep;
  __v_isRef?: boolean;
  value: T;
}

/** Minimal interface required by trackRefValue/triggerRefValue */
interface TrackableRef {
  dep: Dep;
}

export interface Ref<T = unknown> {
  value: T;
  __v_isRef: true;
}

export interface ShallowRef<T = unknown> extends Ref<T> {
  __v_isShallow: true;
}

export interface ComputedRef<T = unknown> extends Ref<T> {
  __v_isComputed: true;
}

// ==================== Ref 类 ====================

class RefImpl<T> {
  private _value: T;
  private _rawValue: T;
  // 使用 Dep 类型替代 Set<any>，提供更精确的类型约束
  public dep: Dep = createDep();
  public readonly __v_isRef = true;
  public readonly __v_isShallow?: boolean;

  constructor(value: T, isShallow: boolean) {
    this.__v_isShallow = isShallow || undefined;
    this._rawValue = isShallow ? value : toRaw(value);
    // toReactive 仅对对象类型生效，非对象值直接赋值。
    // 此处的 as object 断言是安全的，因为 toReactive 内部会先做 isObject 检查。
    this._value = isShallow ? value : (toReactive(value as object) as T);
  }

  get value(): T {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal: T) {
    const useDirectValue = this.__v_isShallow;
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (hasChanged(newVal, this._rawValue)) {
      const oldVal = this._rawValue;
      this._rawValue = newVal;
      // toReactive 仅对对象类型生效，非对象值直接赋值。
      // 此处的 as object 断言是安全的，因为 toReactive 内部会先做 isObject 检查。
      this._value = useDirectValue ? newVal : (toReactive(newVal as object) as T);
      triggerRefValue(this, newVal, oldVal);
    }
  }
}

class ShallowRefImpl<T> {
  private _value: T;
  private _rawValue: T;
  // 使用 Dep 类型替代 Set<any>，提供更精确的类型约束
  public dep: Dep = createDep();
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
      const oldVal = this._rawValue;
      this._rawValue = newVal;
      this._value = newVal;
      triggerRefValue(this, newVal, oldVal);
    }
  }
}

// ==================== 追踪与触发 ====================

export function trackRefValue(ref: TrackableRef): void {
  if (getShouldTrack() && getActiveEffect()) {
    track(ref, TrackOpTypes.GET, 'value');
  }
}

export function triggerRefValue(ref: TrackableRef, newVal?: unknown, oldVal?: unknown): void {
  trigger(ref, TriggerOpTypes.SET, 'value', newVal, oldVal);
}

// ==================== 公共 API ====================

export function ref<T>(value: T): Ref<T> {
  if (isRef(value)) return value as Ref<T>;
  // 双重断言是必要的：RefImpl 实现了 Ref 接口所需的 value/__v_isRef 属性，
  // 但 TypeScript 无法自动推断类实例满足接口（私有成员导致结构不兼容）。
  return new RefImpl(value, false) as unknown as Ref<T>;
}

export function shallowRef<T>(value: T): ShallowRef<T> {
  if (isRef(value)) return value as unknown as ShallowRef<T>;
  return new ShallowRefImpl(value) as unknown as ShallowRef<T>;
}

export function triggerRef<T>(ref: ShallowRef<T>): void {
  triggerRefValue(ref as unknown as TrackableRef, ref.value);
}

export { isRef } from './shared';

export function unref<T>(r: T | Ref<T>): T {
  return isRef(r) ? (r as Ref<T>).value : (r as T);
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K): Ref<T[K]> {
  if (isRef(object[key])) return object[key] as Ref<T[K]>;
  return new ObjectRefImpl(object, key) as unknown as Ref<T[K]>;
}

export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const result = {} as { [K in keyof T]: Ref<T[K]> };
  for (const key in object) {
    result[key] = toRef(object, key);
  }
  return result;
}

export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as unknown as Ref<T>;
}

/**
 * 将值规范化为非 ref 值。
 * 如果是 Ref 则返回 .value，如果是函数则调用并返回结果，否则直接返回。
 * Vue 3.3+ 新增工具函数。
 */
export function toValue<T>(source: T | Ref<T> | (() => T)): T {
  if (isRef(source)) return (source as Ref<T>).value;
  if (typeof source === 'function') return (source as () => T)();
  return source as T;
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
  public dep: Dep = createDep();
  private readonly _getter: () => T;
  private readonly _setter: (value: T) => void;

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this),
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

function toReactive<T>(value: T): T {
  return isObject(value) ? (reactive(value as object) as T) : value;
}
