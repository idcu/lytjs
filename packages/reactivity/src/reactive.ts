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

// ==================== 类型 ====================

type Target = object;

// ==================== 辅助常量 ====================

// ==================== 数组方法拦截 ====================

const arrayInstrumentations: Record<string | symbol, Function> = {};

(["includes", "indexOf", "lastIndexOf"] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as Function;
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
  const originMethod = Array.prototype[method] as Function;
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
    .map((key) => (Symbol as any)[key])
    .filter(isSymbol),
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
  proxyMap: WeakMap<Target, any>,
) {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }

  // markRaw 标记的对象不代理
  if ((target as any)[ReactiveFlags.SKIP]) {
    return target;
  }

  if (
    (target as any)[ReactiveFlags.RAW] &&
    !(isReadonlyFlag && (target as any)[ReactiveFlags.IS_REACTIVE])
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

      const res = Reflect.get(target, key, target);

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
          console.warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target,
          );
        }
        return true;
      }

      let oldValue = (target as any)[key];
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
          console.warn(
            `Delete operation on key "${String(key)}" failed: target is readonly.`,
            target,
          );
        }
        return true;
      }

      const hadKey = hasOwn(target, key);
      const oldValue = (target as any)[key];
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
      if (key === "size" || key === "get") {
        track(target, TrackOpTypes.GET, ITERATE_KEY_COL);
      }

      const res = Reflect.get(target, key, target);
      if (typeof res === "function") {
        if (!isReadonly) {
          const mutatingMethods = new Set(["set", "add", "delete", "clear"]);
          if (mutatingMethods.has(key as string)) {
            return (...args: any[]) => {
              const result = res.apply(target, args);
              trigger(target, TriggerOpTypes.ADD, ITERATE_KEY_COL);
              return result;
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

// ==================== 公共 API ====================

const reactiveMap = new WeakMap<Target, any>();
const shallowReactiveMap = new WeakMap<Target, any>();
const readonlyMap = new WeakMap<Target, any>();
const shallowReadonlyMap = new WeakMap<Target, any>();

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T> {
  if (isReadonly(target)) return target as UnwrapNestedRefs<T>;
  return createReactiveObject(
    target,
    false,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap,
  );
}

export function shallowReactive<T extends object>(target: T): T {
  return createReactiveObject(
    target,
    false,
    true,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap,
  );
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
  );
}

export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    true,
    shallowReadonlyHandlers,
    shallowCollectionHandlers,
    shallowReadonlyMap,
  );
}

export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as any)[ReactiveFlags.RAW]);
  }
  return !!(value && (value as any)[ReactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_READONLY]);
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value);
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

export function markRaw<T extends object>(value: T): T {
  Object.defineProperty(value, ReactiveFlags.SKIP, { value: true });
  return value;
}

// isRef 在 reactive handler getter 中使用，通过 __v_isRef 属性直接判断
function isRef(r: any): r is any {
  return !!(r && r.__v_isRef === true);
}
