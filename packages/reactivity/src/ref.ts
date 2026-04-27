/**
 * Lyt.js 响应式系统 — Ref（引用类型响应式）
 *
 * Ref 用于将基本类型值（string/number/boolean）变为响应式。
 * 也可以包装对象，此时行为类似 reactive。
 *
 * 实现方式：
 * - 使用一个普通对象 { _value, __v_isRef } 存储值
 * - 通过 Proxy 拦截 get/set 来实现依赖收集和触发更新
 * - 当值是对象时，自动用 reactive 进行深层代理
 */

import { track, trigger, ReactiveEffect } from './effect';
import { reactive, isObject } from './reactive';
import { isObject as isObjectVal } from '@lytjs/common';

// ======================== 类型定义 ========================

/** Ref 标记 Symbol */
export const refSymbol = Symbol('ref');

/** ShallowRef 标记 Symbol */
export const shallowRefSymbol = Symbol('shallowRef');

/** Ref 接口 */
export interface Ref<T = any> {
  /** 存储的值 */
  value: T;
  /** Ref 标记 */
  [refSymbol]: true;
}

/** Ref 类型守卫 */
export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;

// ======================== 内部工具 ========================

/**
 * Ref Proxy 到内部存储对象的映射
 * 用于 triggerRef 等需要直接访问内部 target 的场景
 */
const refToRaw = new WeakMap<object, object>();

/**
 * 获取 Ref 的内部存储对象
 * @param ref - Ref 对象（Proxy）
 * @returns 内部存储对象
 */
function getRefRaw(ref: Ref): object {
  return refToRaw.get(ref as object) || (ref as object);
}

// ======================== Ref 实现 ========================

/**
 * 创建一个 Ref
 *
 * - 如果传入的值已经是 Ref，直接返回
 * - 如果传入的是对象，内部用 reactive 包装
 * - 返回一个 Proxy，拦截 .value 的读写
 *
 * @param value - 初始值
 * @returns Ref 对象
 *
 * @example
 * ```ts
 * const count = ref(0)
 * effect(() => console.log(count.value))  // 0
 * count.value++  // 触发 effect，输出 1
 *
 * const obj = ref({ name: 'lyt' })
 * effect(() => console.log(obj.value.name))  // 'lyt'
 * obj.value.name = 'new'  // 触发 effect（深层响应式）
 * ```
 */
export function ref<T = any>(value: T): Ref<T> {
  // 如果已经是 Ref，直接返回
  if (isRef(value)) {
    return value;
  }

  // 创建 Ref 内部存储对象
  const r = {
    _value: convert(value),
    _rawValue: value,
    __v_isRef: true,
    [refSymbol]: true,
  } as unknown as Ref<T>;

  // 使用 Proxy 拦截 .value 的访问
  const proxy = new Proxy(r, refHandlers as any) as Ref<T>;
  refToRaw.set(proxy as object, r);
  return proxy;
}

/**
 * 将值转换为响应式形式
 * - 如果是对象，用 reactive 包装
 * - 如果是基本类型，直接返回
 */
function convert(value: any): any {
  return isObjectVal(value) ? reactive(value) : value;
}

/**
 * Ref 的 Proxy handler
 * 拦截 get 和 set 来实现 .value 的响应式
 */
/** Ref 内部存储对象类型 */
interface RefInternal<T = unknown> {
  _value: T;
  _rawValue: unknown;
  __v_isRef: true;
  [refSymbol]: true;
}

const refHandlers: ProxyHandler<RefInternal> = {
  get(target: RefInternal, key: string | symbol, receiver: unknown): unknown {
    // 访问 .value 时进行依赖收集
    if (key === 'value') {
      track(target, 'value');
      return target._value;
    }

    // 访问其他属性直接返回
    if (key === refSymbol) {
      return true;
    }
    if (key === '__v_isRef') {
      return true;
    }
    if (key === '_rawValue') {
      return target._rawValue;
    }

    return Reflect.get(target, key, receiver);
  },

  set(target: RefInternal, key: string | symbol, value: unknown, receiver: unknown): boolean {
    if (key === 'value') {
      // 获取原始值（用于比较）
      const oldValue = target._rawValue;

      // 如果值没有变化，不触发更新
      if (Object.is(oldValue, value)) {
        return true;
      }

      // 更新原始值和响应式值
      target._rawValue = value;
      target._value = convert(value) as typeof target._value;

      // 触发更新
      trigger(target, 'value', 'set', value);
      return true;
    }

    return Reflect.set(target, key, value, receiver);
  },
};

// ======================== ShallowRef ========================

/**
 * 创建一个浅层 Ref
 * 与 ref 的区别：当值是对象时，不会用 reactive 包装
 * 只有 .value 本身的替换会触发更新，对象内部的变化不会触发
 *
 * @param value - 初始值
 * @returns ShallowRef 对象
 *
 * @example
 * ```ts
 * const state = shallowRef({ count: 0 })
 * effect(() => console.log(state.value.count))  // 0
 * state.value.count++  // 不会触发 effect（浅层）
 * state.value = { count: 1 }  // 触发 effect（替换了 .value）
 * ```
 */
export function shallowRef<T = any>(value: T): Ref<T> {
  // 如果已经是 Ref，直接返回
  if (isRef(value)) {
    return value;
  }

  const r = {
    _value: value,
    _rawValue: value,
    __v_isRef: true,
    __v_isShallow: true,
    [refSymbol]: true,
    [shallowRefSymbol]: true,
  } as unknown as Ref<T>;

  const proxy = new Proxy(r, shallowRefHandlers as any) as Ref<T>;
  refToRaw.set(proxy as object, r);
  return proxy;
}

/**
 * ShallowRef 的 Proxy handler
 * 与 refHandlers 类似，但不调用 convert（不深层代理）
 */
/** ShallowRef 内部存储对象类型 */
interface ShallowRefInternal<T = unknown> {
  _value: T;
  _rawValue: unknown;
  __v_isRef: true;
  __v_isShallow: true;
  [refSymbol]: true;
  [shallowRefSymbol]: true;
}

const shallowRefHandlers: ProxyHandler<ShallowRefInternal> = {
  get(target: ShallowRefInternal, key: string | symbol, receiver: unknown): unknown {
    if (key === 'value') {
      track(target, 'value');
      return target._value;
    }

    if (key === refSymbol || key === '__v_isRef' || key === '__v_isShallow') {
      return true;
    }
    if (key === '_rawValue') {
      return target._rawValue;
    }

    return Reflect.get(target, key, receiver);
  },

  set(target: ShallowRefInternal, key: string | symbol, value: unknown, receiver: unknown): boolean {
    if (key === 'value') {
      const oldValue = target._rawValue;

      if (Object.is(oldValue, value)) {
        return true;
      }

      // 浅层 Ref：直接存储原始值，不调用 convert
      target._rawValue = value;
      target._value = value as typeof target._value;

      trigger(target, 'value', 'set', value);
      return true;
    }

    return Reflect.set(target, key, value, receiver);
  },
};

// ======================== 工具函数 ========================

/**
 * 判断一个值是否是 Ref
 *
 * @param value - 要检查的值
 * @returns 是否是 Ref
 */
export function isRef(value: unknown): value is Ref {
  return !!(value && (value as any).__v_isRef === true);
}

/**
 * 如果值是 Ref，返回 .value；否则返回值本身
 * 用于在模板或函数中自动解包 Ref
 *
 * @param value - Ref 或普通值
 * @returns 解包后的值
 *
 * @example
 * ```ts
 * const count = ref(5)
 * unref(count)  // 5
 * unref(10)     // 10
 * ```
 */
export function unref<T>(value: T | Ref<T>): T {
  return isRef(value) ? value.value : value;
}

/**
 * 为响应式对象的某个属性创建一个 Ref
 * 创建的 Ref 与原始对象的属性保持双向同步
 *
 * @param object - 响应式对象
 * @param key - 属性名
 * @returns 与属性关联的 Ref
 *
 * @example
 * ```ts
 * const state = reactive({ count: 0 })
 * const countRef = toRef(state, 'count')
 * countRef.value++  // state.count 也变为 1
 * state.count++     // countRef.value 也变为 2
 * ```
 */
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  // 如果属性已经是 Ref，直接返回
  const val = object[key];
  if (isRef(val)) {
    return val;
  }

  return new Proxy({ _obj: object, _key: key, __v_isRef: true } as any, {
    get(target, prop, receiver) {
      if (prop === 'value') {
        return target._obj[target._key];
      }
      if (prop === '__v_isRef') {
        return true;
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (prop === 'value') {
        target._obj[target._key] = value;
        return true;
      }
      return Reflect.set(target, prop, value, receiver);
    },
  }) as Ref<T[K]>;
}

/**
 * 将响应式对象的所有属性转换为 Ref
 * 返回一个与原始对象结构相同的普通对象，每个属性都是 Ref
 *
 * @param object - 响应式对象
 * @returns 属性全部为 Ref 的普通对象
 *
 * @example
 * ```ts
 * const state = reactive({ count: 0, name: 'lyt' })
 * const refs = toRefs(state)
 * refs.count.value++  // state.count 也变为 1
 * refs.name.value = 'new'  // state.name 也变为 'new'
 * ```
 */
export function toRefs<T extends object>(object: T): {
  [K in keyof T]: Ref<T[K]>
} {
  const result: any = {};

  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      result[key] = toRef(object, key);
    }
  }

  return result;
}

/**
 * 触发 Ref 的更新（手动触发）
 * 主要用于 shallowRef 中修改对象内部属性后手动触发更新
 *
 * @param ref - 要触发的 Ref
 */
export function triggerRef(ref: Ref): void {
  // 获取 Ref 的内部存储对象（track/trigger 都是基于这个对象进行的）
  const raw = getRefRaw(ref);
  trigger(raw, 'value', 'set', (raw as any)._rawValue);
}
