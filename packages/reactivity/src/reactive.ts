// src/reactive.ts
// 响应式对象（Proxy 实现）
// 复用 @lytjs/common-is: isObject, hasChanged, hasOwn, isSymbol, isMap, isSet

import {
  isObject,
  hasChanged,
  hasOwn,
  isSymbol,
  isMap,
  isSet,
} from "@lytjs/common-is";
import { warn } from "@lytjs/common-error";
import {
  ReactiveFlags,
  TrackOpTypes,
  TriggerOpTypes,
  ITERATE_KEY,
} from "./constants";
import {
  track,
  trigger,
  pauseTracking,
  resetTracking,
  isIntegerKey,
} from "./effect";
import type { UnwrapNestedRefs, DeepReadonly } from "./types";
import { toRaw, isRef } from "./shared";

// ==================== 类型 ====================

type Target = object;
type ReactiveProxy<T extends object = object> = { [K in keyof T]: T[K] };

/**
 * Internal interface for objects with reactive flags
 */
interface ReactiveTarget {
  [ReactiveFlags.RAW]?: unknown;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.IS_REF]?: boolean;
}

// ==================== 辅助常量 ====================

const MUTATING_METHODS = new Set<string>(["set", "add", "delete", "clear"]);

// ==================== 数组方法拦截 ====================

const arrayInstrumentations: Record<
  string | symbol,
  (...args: unknown[]) => unknown
> = {};

(["includes", "indexOf", "lastIndexOf"] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as (
    ...args: unknown[]
  ) => unknown;
  arrayInstrumentations[method] = function (
    this: unknown[],
    ...args: unknown[]
  ) {
    const arr = toRaw(this);
    for (let i = 0; i < arr.length; i++) {
      track(arr, TrackOpTypes.GET, i + "");
    }
    const result = originMethod.apply(arr, args);
    if (result === -1 || result === false) {
      return originMethod.apply(
        arr,
        args.map((a) => toRaw(a)),
      );
    }
    return result;
  };
});

(["push", "pop", "shift", "unshift", "splice"] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as (
    ...args: unknown[]
  ) => unknown;
  arrayInstrumentations[method] = function (
    this: unknown[],
    ...args: unknown[]
  ) {
    pauseTracking();
    try {
      const result = originMethod.apply(this, args);
      return result;
    } finally {
      resetTracking();
    }
  };
});

// ==================== 辅助常量 ====================

const builtInSymbols = new Set<symbol>(
  Object.getOwnPropertyNames(Symbol)
    .filter((key) => key !== "arguments" && key !== "caller")
    .map(
      (key) => (Symbol as unknown as Record<string, symbol | undefined>)[key],
    )
    .filter((sym): sym is symbol => isSymbol(sym)),
);

function isNonTrackableKey(key: string | symbol): boolean {
  return key === "__proto__" || key === "__v_isRef";
}

// ==================== createReactiveObject ====================

function createReactiveObject(
  target: Target,
  isReadonlyFlag: boolean,
  _isShallow: boolean,
  baseHandlers: ProxyHandler<Target>,
  collectionHandlers: ProxyHandler<Target>,
  proxyMap: WeakMap<Target, ReactiveProxy<Target>>,
) {
  if (!isObject(target)) {
    if (__DEV__) {
      warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }

  // markRaw 标记的对象不代理
  if ((target as Record<string | symbol, unknown>)[ReactiveFlags.SKIP]) {
    return target;
  }

  if (
    (target as Record<string | symbol, unknown>)[ReactiveFlags.RAW] &&
    !(
      isReadonlyFlag &&
      (target as Record<string | symbol, unknown>)[ReactiveFlags.IS_REACTIVE]
    )
  ) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const handlers =
    isMap(target) || isSet(target) ? collectionHandlers : baseHandlers;

  const proxy = new Proxy(target, handlers);
  proxyMap.set(target, proxy);
  return proxy;
}

// ==================== Mutable Handlers ====================

function createMutableHandler(
  isReadonly: boolean,
  isShallow: boolean,
): ProxyHandler<Target> {
  return {
    get(target, key, _receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly;
      if (key === ReactiveFlags.IS_READONLY) return isReadonly;
      if (key === ReactiveFlags.IS_SHALLOW) return isShallow;
      if (key === ReactiveFlags.RAW) return target;

      const targetIsArray = Array.isArray(target);
      if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, _receiver);
      }

      const res = Reflect.get(target, key, _receiver);

      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKey(key)) {
        return res;
      }

      if (!isReadonly) {
        track(target, TrackOpTypes.GET, key);
      }

      if (isShallow) {
        return res;
      }

      if (isRef(res)) {
        return targetIsArray && isIntegerKey(key) ? res : res.value;
      }

      if (isObject(res)) {
        return isReadonly ? readonly(res) : reactive(res);
      }

      return res;
    },

    set(target, key, value, receiver) {
      if (isReadonly) {
        if (__DEV__) {
          warn(
            `Set operation on key "${String(key)}" failed: target is readonly. Target: ${JSON.stringify(target)}`,
          );
        }
        return true;
      }

      let oldValue = Reflect.get(target, key);
      if (!isShallow) {
        value = toRaw(value);
        oldValue = toRaw(oldValue);
        if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
        }
      }

      const hadKey =
        Array.isArray(target) && isIntegerKey(key)
          ? Number(key) < target.length
          : hasOwn(target, key);

      const result = Reflect.set(target, key, value, receiver);

      if (target === toRaw(receiver)) {
        if (!hadKey) {
          trigger(target, TriggerOpTypes.ADD, key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, TriggerOpTypes.SET, key, value, oldValue);
        }
      }

      return result;
    },

    deleteProperty(target, key) {
      if (isReadonly) {
        if (__DEV__) {
          warn(
            `Delete operation on key "${String(key)}" failed: target is readonly. Target: ${JSON.stringify(target)}`,
          );
        }
        return true;
      }

      const hadKey = hasOwn(target, key);
      const oldValue = Reflect.get(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
        trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
      }
      return result;
    },

    has(target, key) {
      const result = Reflect.has(target, key);
      if (!isSymbol(key) || !builtInSymbols.has(key)) {
        if (!isReadonly) {
          track(target, TrackOpTypes.HAS, key);
        }
      }
      return result;
    },

    ownKeys(target) {
      if (!isReadonly) {
        track(
          target,
          TrackOpTypes.ITERATE,
          Array.isArray(target) ? "length" : ITERATE_KEY,
        );
      }
      return Reflect.ownKeys(target);
    },
  };
}

// ==================== Collection Handlers ====================

function createCollectionHandler(
  isReadonly: boolean,
  isShallow: boolean,
): ProxyHandler<Target> {
  // Map/Set 的迭代 key
  const ITERATE_KEY_COL = Symbol("collection_iterate");

  return {
    get(target, key, _receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly;
      if (key === ReactiveFlags.IS_READONLY) return isReadonly;
      if (key === ReactiveFlags.IS_SHALLOW) return isShallow;
      if (key === ReactiveFlags.RAW) return target;

      // 追踪 size 属性和 get 调用
      // 对于 readonly collection，额外追踪 has 和 forEach
      if (
        key === "size" ||
        key === "get" ||
        (isReadonly && (key === "has" || key === "forEach"))
      ) {
        track(target, TrackOpTypes.GET, ITERATE_KEY_COL);
      }

      const res = Reflect.get(target, key, _receiver);
      if (typeof res === "function") {
        if (!isReadonly) {
          if (MUTATING_METHODS.has(key as string)) {
            return (...args: unknown[]) => {
              const rawTarget = toRaw(target) as Map<unknown, unknown>;
              if (key === "set") {
                // Map.set: 检查值是否实际改变
                const oldValue = rawTarget.get(args[0]);
                const hadKey = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (!hadKey || !Object.is(toRaw(oldValue), toRaw(args[1]))) {
                  trigger(
                    target,
                    TriggerOpTypes.SET,
                    args[0] as string | symbol,
                    args[1],
                    oldValue,
                  );
                }
                return result;
              } else if (key === "add") {
                // Set.add: 利用返回值判断是否新增
                const had = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (!had) {
                  trigger(
                    target,
                    TriggerOpTypes.ADD,
                    args[0] as string | symbol,
                    args[0],
                  );
                }
                return result;
              } else if (key === "delete") {
                // Map/Set.delete: 已有 hadKey 检查
                const hadKey = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (hadKey) {
                  trigger(
                    target,
                    TriggerOpTypes.DELETE,
                    args[0] as string | symbol,
                    undefined,
                    undefined,
                  );
                }
                return result;
              } else if (key === "clear") {
                const hadItems = rawTarget.size > 0;
                const result = res.apply(target, args);
                if (hadItems) {
                  trigger(
                    target,
                    TriggerOpTypes.CLEAR,
                    undefined,
                    undefined,
                    undefined,
                  );
                }
                return result;
              }
              // 其他变异方法
              const result = res.apply(target, args);
              trigger(target, TriggerOpTypes.ADD, ITERATE_KEY_COL);
              return result;
            };
          }
        } else if (isShallow) {
          // Shallow readonly: block mutating methods with warnings
          if (MUTATING_METHODS.has(key as string)) {
            return (..._args: unknown[]) => {
              if (__DEV__) {
                warn(
                  `Operation "${String(key)}" failed: target is shallow readonly.`,
                );
              }
              if (key === "delete") return false;
              return undefined;
            };
          }
        }
        return res.bind(target);
      }
      return res;
    },
  };
}

// ==================== Handler 实例 ====================

const mutableHandlers = createMutableHandler(false, false);
const readonlyHandlers = createMutableHandler(true, false);
const shallowReactiveHandlers = createMutableHandler(false, true);
const shallowReadonlyHandlers = createMutableHandler(true, true);

const mutableCollectionHandlers = createCollectionHandler(false, false);
const readonlyCollectionHandlers = createCollectionHandler(true, false);
const shallowCollectionHandlers = createCollectionHandler(false, true);
const shallowReadonlyCollectionHandlers = createCollectionHandler(true, true);

// ==================== 公共 API ====================

const reactiveMap = new WeakMap<Target, ReactiveProxy<Target>>();
const shallowReactiveMap = new WeakMap<Target, ReactiveProxy<Target>>();
const readonlyMap = new WeakMap<Target, ReactiveProxy<Target>>();
const shallowReadonlyMap = new WeakMap<Target, ReactiveProxy<Target>>();

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  if (isReadonly(target)) return target as UnwrapNestedRefs<T>;
  return createReactiveObject(
    target,
    false,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap,
  ) as UnwrapNestedRefs<T>;
}

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target,
    false,
    true,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap,
  ) as T;
}

export function readonly<T extends object>(
  target: T,
): DeepReadonly<UnwrapNestedRefs<T>> {
  return createReactiveObject(
    target,
    true,
    false,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap,
  ) as DeepReadonly<UnwrapNestedRefs<T>>;
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap,
  ) as Readonly<T>;
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as ReactiveTarget)[ReactiveFlags.RAW]);
  }
  return !!(value && (value as ReactiveTarget)[ReactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as ReactiveTarget)[ReactiveFlags.IS_READONLY]);
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value);
}

export { toRaw } from "./shared";

export function markRaw<T extends object>(value: T): T {
  Object.defineProperty(value, ReactiveFlags.SKIP, { value: true });
  return value;
}
