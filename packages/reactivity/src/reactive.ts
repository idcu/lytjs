/**
 * Lyt.js 响应式系统 — 响应式代理（Reactive）
 *
 * 基于 ES6 Proxy 实现的深层响应式代理。
 * - 拦截 get 进行依赖收集，并对嵌套对象递归代理
 * - 拦截 set 进行值比较后触发更新
 * - 拦截 deleteProperty 处理属性删除
 * - 支持 readonly 和 shallow 模式
 */

import { track, trigger, ITERATE_KEY, ReactiveEffect, pauseTracking, resetTracking } from './effect';

// ======================== 类型定义 ========================

/** reactive 配置选项 */
export interface ReactiveOptions {
  /** 是否深层响应式（默认 true） */
  deep?: boolean;
  /** 是否只读（默认 false） */
  readonly?: boolean;
}

/** 只读标记 Symbol */
export const readonlyFlag = Symbol('readonly');

/** 原始对象标记 Symbol（存储在代理对象上，指向原始对象） */
export const rawSymbol = Symbol('raw');

/** 响应式标记 Symbol（存储在原始对象上，标记已被代理） */
export const reactiveFlag = Symbol('reactive');

/** 跳过代理标记 Symbol */
export const skipFlag = Symbol('skip');

// ======================== 内部状态 ========================

/**
 * 代理缓存 Map
 * WeakMap<原始对象, Proxy代理对象>
 * 确保同一个原始对象始终返回同一个代理对象
 */
const proxyMap = new WeakMap<object, Record<string, unknown>>();

/**
 * 只读代理缓存 Map
 * 与 proxyMap 分开存储，因为同一个对象可以有 reactive 和 readonly 两个代理
 */
const readonlyMap = new WeakMap<object, Record<string, unknown>>();

/**
 * 浅层代理缓存 Map
 */
const shallowReactiveMap = new WeakMap<object, Record<string, unknown>>();

// ======================== 工具函数 ========================

/**
 * 判断值是否为对象（非 null）
 */
export function isObject(val: unknown): val is object {
  return val !== null && typeof val === 'object';
}

/**
 * 判断两个值是否相等（使用 Object.is）
 * Object.is 与 === 的区别：
 * - Object.is(NaN, NaN) === true
 * - Object.is(+0, -0) === false
 */
function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue);
}

/**
 * 判断 key 是否为对象自身属性（非继承）
 */
function hasOwn(target: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

// ======================== 数组方法拦截 ========================

/**
 * 数组方法拦截映射表
 * 对搜索类方法和变异类方法进行特殊处理
 */
const arrayInstrumentations: Record<string, (...args: unknown[]) => unknown> = {};

// 搜索类方法：需要追踪每个元素的依赖
// includes/indexOf/lastIndexOf 内部会遍历数组元素，
// 必须对每个索引进行 track，否则依赖收集不完整
['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  arrayInstrumentations[method] = function(this: any[], ...args: any[]) {
    const arr = toRaw(this);
    // 追踪每个元素的依赖
    for (let i = 0; i < arr.length; i++) {
      track(arr, String(i));
    }
    // 追踪 length 依赖
    track(arr, 'length');
    // 在原始数组上执行方法
    return (arr as any)[method](...args);
  };
});

// 变异类方法：push/pop/shift/unshift/splice/sort/reverse
// 这些方法内部会读取数组属性（如 length），但我们不需要收集这些内部读取的依赖
// 从原始对象获取方法，但在代理对象（this）上调用，这样 set 拦截器才能正常触发更新
// 注意：某些数组方法（如 push）内部通过 [[DefineOwnProperty]] 修改 length，
// 不会触发 Proxy 的 set 拦截器，因此需要手动触发 length 依赖
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
  arrayInstrumentations[method] = function(this: any[], ...args: any[]) {
    // 暂停依赖收集，避免在方法内部重复收集
    pauseTracking();
    const res = (Array.prototype as any)[method].apply(this, args);
    resetTracking();
    // 手动触发 length 依赖更新
    // 因为数组变异方法可能通过 [[DefineOwnProperty]] 修改 length，
    // 不会经过 Proxy 的 set 拦截器
    trigger(toRaw(this), 'length', 'set', toRaw(this).length);
    return res;
  };
});

// ======================== Proxy Handlers ========================

/**
 * 可变（mutable）代理的 handler
 * 支持 get/set/deleteProperty/has/ownKeys
 */
const mutableHandlers: ProxyHandler<object> = {
  /**
   * get 拦截器
   * 1. 如果访问的是特殊 Symbol（raw/readonly/reactive），直接返回对应值
   * 2. 对数组特殊方法（includes/indexOf/lastIndexOf/push/pop/shift/unshift/splice）进行特殊处理
   * 3. 依赖收集 track
   * 4. 如果值是对象且需要深层代理，递归返回代理
   */
  get(target: object, key: string | symbol, receiver: object): any {
    // 处理特殊 Symbol
    if (key === rawSymbol) {
      return target;
    }
    if (key === reactiveFlag) {
      return true;
    }

    // 如果是数组，检查是否是特殊方法
    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return arrayInstrumentations[key as string];
    }

    // 依赖收集
    track(target, key);

    const res = Reflect.get(target, key, receiver);

    // 如果访问的是只读标记，返回 true
    if (key === readonlyFlag) {
      return (target as any)[readonlyFlag] === true;
    }

    // 如果值不是对象，直接返回（基本类型不需要代理）
    if (!isObject(res)) {
      return res;
    }

    // 如果目标对象标记了跳过代理，直接返回原始值
    if ((target as any)[skipFlag]) {
      return res;
    }

    // 深层代理：对嵌套对象递归代理
    return reactive(res);
  },

  /**
   * set 拦截器
   * 1. 获取旧值
   * 2. 比较新旧值，如果相同则不触发更新
   * 3. 判断是新增属性还是修改已有属性
   * 4. 设置新值
   * 5. 触发更新 trigger
   */
  set(
    target: object,
    key: string | symbol,
    value: any,
    receiver: object
  ): boolean {
    // 获取旧值
    const oldValue = (target as any)[key];

    // 判断属性是否已存在（排除原型链上的属性）
    const hadKey =
      Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);

    // 设置新值
    const result = Reflect.set(target, key, value, receiver);

    // 只有当目标对象是原始对象时才触发更新
    // （避免在代理对象上设置属性时，receiver 不是原始对象导致的重复触发）
    if (target === (receiver as any)?.[rawSymbol] || target === toRaw(receiver)) {
      if (hadKey) {
        // 修改已有属性
        if (hasChanged(value, oldValue)) {
          trigger(target, key, 'set', value);
        }
      } else {
        // 新增属性
        trigger(target, key, 'add', value);
      }
    }

    return result;
  },

  /**
   * deleteProperty 拦截器
   * 删除属性后触发更新
   */
  deleteProperty(target: object, key: string | symbol): boolean {
    // 检查属性是否存在
    const hadKey = hasOwn(target, key);

    // 执行删除
    const result = Reflect.deleteProperty(target, key);

    // 只有属性确实存在且删除成功时才触发更新
    if (result && hadKey) {
      trigger(target, key, 'delete');
    }

    return result;
  },

  /**
   * has 拦截器
   * 用于 'key' in obj 操作符的依赖收集
   */
  has(target: object, key: string | symbol): boolean {
    track(target, key);
    return Reflect.has(target, key);
  },

  /**
   * ownKeys 拦截器
   * 用于 for...in 循环、Object.keys()、Object.getOwnPropertyNames() 等的依赖收集
   * 依赖 ITERATE_KEY，当新增或删除属性时会触发
   */
  ownKeys(target: object): (string | symbol)[] {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};

/**
 * 只读代理的 handler
 * 与 mutableHandlers 类似，但 set 和 deleteProperty 会抛出警告
 */
const readonlyHandlers: ProxyHandler<object> = {
  get(target: object, key: string | symbol, receiver: object): any {
    if (key === rawSymbol) {
      return target;
    }
    if (key === reactiveFlag) {
      return true;
    }
    if (key === readonlyFlag) {
      return true;
    }

    track(target, key);

    const res = Reflect.get(target, key, receiver);

    if (!isObject(res)) {
      return res;
    }

    // 只读代理的嵌套对象也应该是只读的
    return readonly(res);
  },

  set(
    target: object,
    key: string | symbol,
    value: any,
    receiver: object
  ): boolean {
    // 只读模式下不允许设置属性
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return false;
  },

  deleteProperty(target: object, key: string | symbol): boolean {
    // 只读模式下不允许删除属性
    console.warn(
      `Delete operation on key "${String(key)}" failed: target is readonly.`,
      target
    );
    return false;
  },

  has(target: object, key: string | symbol): boolean {
    track(target, key);
    return Reflect.has(target, key);
  },

  ownKeys(target: object): (string | symbol)[] {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};

/**
 * 浅层响应式代理的 handler
 * 不对嵌套对象进行递归代理
 */
const shallowReactiveHandlers: ProxyHandler<object> = {
  get(target: object, key: string | symbol, receiver: object): any {
    if (key === rawSymbol) {
      return target;
    }
    if (key === reactiveFlag) {
      return true;
    }

    track(target, key);

    const res = Reflect.get(target, key, receiver);
    return res;
  },

  set(
    target: object,
    key: string | symbol,
    value: any,
    receiver: object
  ): boolean {
    const oldValue = (target as any)[key];
    const hadKey =
      Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);

    const result = Reflect.set(target, key, value, receiver);

    if (target === (receiver as any)?.[rawSymbol] || target === toRaw(receiver)) {
      if (hadKey) {
        if (hasChanged(value, oldValue)) {
          trigger(target, key, 'set', value);
        }
      } else {
        trigger(target, key, 'add', value);
      }
    }

    return result;
  },

  deleteProperty(target: object, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key);
    const result = Reflect.deleteProperty(target, key);

    if (result && hadKey) {
      trigger(target, key, 'delete');
    }

    return result;
  },

  has(target: object, key: string | symbol): boolean {
    track(target, key);
    return Reflect.has(target, key);
  },

  ownKeys(target: object): (string | symbol)[] {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};

/**
 * 判断 key 是否为整数（用于数组索引判断）
 */
function isIntegerKey(key: string | symbol): key is string {
  return typeof key === 'string' && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;
}

// ======================== 公共 API ========================

/**
 * 创建深层响应式代理
 *
 * @param target - 要代理的目标对象（必须是对象类型）
 * @param options - 配置选项
 * @returns 响应式代理对象
 *
 * @example
 * ```ts
 * const state = reactive({ count: 0, nested: { foo: 'bar' } })
 * effect(() => console.log(state.count))  // 0
 * state.count++  // 触发 effect，输出 1
 * ```
 */
export function reactive<T extends object>(
  target: T,
  options: ReactiveOptions = {}
): T {
  // 如果目标不是对象，直接返回（只支持对象类型）
  if (!isObject(target)) {
    return target;
  }

  // 如果已经是代理对象，直接返回
  if ((target as any)[reactiveFlag]) {
    return target;
  }

  // 如果目标被标记为只读，返回只读代理
  if ((target as any)[readonlyFlag]) {
    return readonly(target);
  }

  // 检查缓存，确保同一个原始对象返回同一个代理
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // 创建代理
  const proxy = new Proxy(target, mutableHandlers) as T;
  proxyMap.set(target, proxy);

  return proxy;
}

/**
 * 创建只读响应式代理
 * 所有修改操作都会被阻止并发出警告
 *
 * @param target - 要代理的目标对象
 * @returns 只读代理对象
 */
export function readonly<T extends object>(target: T): T {
  if (!isObject(target)) {
    return target;
  }

  // 检查缓存
  const existingProxy = readonlyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // 标记原始对象为只读
  (target as any)[readonlyFlag] = true;

  // 创建只读代理
  const proxy = new Proxy(target, readonlyHandlers) as T;
  readonlyMap.set(target, proxy);

  return proxy;
}

/**
 * 创建浅层响应式代理
 * 只有第一层属性是响应式的，嵌套对象不会被代理
 *
 * @param target - 要代理的目标对象
 * @returns 浅层响应式代理对象
 */
export function shallowReactive<T extends object>(target: T): T {
  if (!isObject(target)) {
    return target;
  }

  // 检查缓存
  const existingProxy = shallowReactiveMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // 创建浅层代理
  const proxy = new Proxy(target, shallowReactiveHandlers) as T;
  shallowReactiveMap.set(target, proxy);

  return proxy;
}

/**
 * 获取代理对象对应的原始对象
 * 如果传入的不是代理对象，则原样返回
 *
 * @param observed - 代理对象或普通对象
 * @returns 原始对象
 */
export function toRaw<T>(observed: T): T {
  // 递归获取，直到找到原始对象
  const raw = observed && (observed as any)[rawSymbol];
  return raw ? toRaw(raw) : observed;
}

/**
 * 判断一个值是否是响应式代理对象
 *
 * @param value - 要检查的值
 * @returns 是否是响应式代理
 */
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    // 如果是只读代理，检查其原始对象
    return isReactive((value as any)[rawSymbol]);
  }
  return !!(value && (value as any)[reactiveFlag]);
}

/**
 * 判断一个值是否是只读代理对象
 *
 * @param value - 要检查的值
 * @returns 是否是只读代理
 */
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as any)[readonlyFlag]);
}

/**
 * 标记一个对象为只读
 * 用于在 reactive 内部标记嵌套对象
 *
 * @param obj - 要标记的对象
 * @returns 标记后的对象
 */
export function markReadOnly(obj: object): object {
  (obj as any)[readonlyFlag] = true;
  return obj;
}

/**
 * 标记一个对象跳过代理
 * 当 reactive 遇到标记了 skip 的对象时，不会对其子属性进行代理
 *
 * @param obj - 要标记的对象
 * @returns 标记后的对象
 */
export function markSkip(obj: object): object {
  (obj as any)[skipFlag] = true;
  return obj;
}
