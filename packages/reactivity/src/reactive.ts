// src/reactive.ts
// 响应式对象（Proxy 实现）
// 复用 @lytjs/common-is: isObject, hasChanged, hasOwn, isSymbol, isMap, isSet

import { isObject, hasChanged, hasOwn, isSymbol, isMap, isSet } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { unsafeCast } from '@lytjs/common-assertions';
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes, ITERATE_KEY } from './constants';
import { track, trigger, pauseTracking, resetTracking, isIntegerKey } from './effect';
import type { UnwrapNestedRefs, DeepReadonly } from './types';
import { toRaw, isRef } from './shared';

// ==================== 类型 ====================

type Target = object;
type ReactiveProxy<T extends object = object> = { [K in keyof T]: T[K] };

/**
 * 带有响应式标志的对象的内部接口
 */
interface ReactiveTarget {
  [ReactiveFlags.RAW]?: unknown;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.IS_REF]?: boolean;
}

// ==================== 辅助常量 ====================

const MUTATING_METHODS = new Set<string>(['set', 'add', 'delete', 'clear']);

// FIX: P2-3 使用 WeakMap 缓存 Collection 迭代方法的绑定函数，避免每次访问都创建新函数
const collectionMethodCache = new WeakMap<
  object,
  Map<string | symbol, (...args: unknown[]) => unknown>
>();

// ==================== 数组方法拦截 ====================

const arrayInstrumentations: Record<string | symbol, (...args: unknown[]) => unknown> = {};

(['includes', 'indexOf', 'lastIndexOf'] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as (...args: unknown[]) => unknown;
  arrayInstrumentations[method] = function (this: unknown[], ...args: unknown[]) {
    const arr = toRaw(this);
    // 只追踪数组长度变化，避免大数组时逐索引创建大量依赖
    track(arr, TrackOpTypes.HAS, 'length');
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

(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as (...args: unknown[]) => unknown;
  arrayInstrumentations[method] = function (this: unknown[], ...args: unknown[]) {
    pauseTracking();
    try {
      const result = originMethod.apply(this, args);
      return result;
    } finally {
      resetTracking();
    }
  };
});

// FIX: P1-L5 响应式数组方法未处理 - 添加 sort, reverse, fill, copyWithin 的处理
(['sort', 'reverse', 'fill', 'copyWithin'] as const).forEach((method) => {
  const originMethod = Array.prototype[method] as (...args: unknown[]) => unknown;
  arrayInstrumentations[method] = function (this: unknown[], ...args: unknown[]) {
    const arr = toRaw(this);
    pauseTracking();
    try {
      const result = originMethod.apply(arr, args);
      // 这些方法会修改数组，需要触发更新
      trigger(arr, TriggerOpTypes.SET, 'length');
      return result;
    } finally {
      resetTracking();
    }
  };
});

// ==================== 辅助常量 ====================

const builtInSymbols = new Set<symbol>(
  Object.getOwnPropertyNames(Symbol)
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => {
      // Object.getOwnPropertyNames 返回 string[]，而 Symbol 的属性值类型为 symbol，
      // 但 TypeScript 将 Symbol 视为 Function，其索引签名为 unknown。
      // 使用索引签名访问 Symbol[key] 返回 unknown，需要类型断言。
      const value = unsafeCast<symbol>((Symbol as unknown as Record<string, unknown>)[key]);
      return isSymbol(value) ? value : undefined;
    })
    .filter((sym): sym is symbol => sym !== undefined),
);

function isNonTrackableKey(key: string | symbol): boolean {
  return key === '__proto__' || key === '__v_isRef';
}

/**
 * 将 unknown 值安全地转换为 trigger key (string | symbol)。
 * 如果值不是 string 或 symbol 类型，返回 undefined。
 */
function toTriggerKey(value: unknown): string | symbol | undefined {
  if (typeof value === 'string' || typeof value === 'symbol') {
    return value;
  }
  return undefined;
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
    !(isReadonlyFlag && (target as Record<string | symbol, unknown>)[ReactiveFlags.IS_REACTIVE])
  ) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const handlers = isMap(target) || isSet(target) ? collectionHandlers : baseHandlers;

  const proxy = new Proxy(target, handlers);
  proxyMap.set(target, proxy);
  return proxy;
}

// ==================== Mutable Handlers ====================

function createMutableHandler(isReadonly: boolean, isShallow: boolean): ProxyHandler<Target> {
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
            `Set operation on key "${String(key)}" failed: target is readonly. Target: ${(() => {
              try {
                return JSON.stringify(target);
              } catch {
                return '[object Object]';
              }
            })()}`,
          );
        }
        return true;
      }

      let oldValue = Reflect.get(target, key);
      if (!isShallow) {
        value = toRaw(value);
        // FIX: P1-03 oldValue 也需要 toRaw()，确保新旧值比较时使用原始值，
        // 避免响应式代理对象与原始对象比较时 hasChanged 始终返回 true
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
          // FIX: P2-03 readonly 深层警告：区分浅层 readonly 和深层 readonly
          warn(
            `Delete operation on key "${String(key)}" failed: target is readonly.` +
              (isShallow ? ' (shallow readonly)' : ' (deep readonly)') +
              ` Target: ${(() => {
                try {
                  return JSON.stringify(target);
                } catch {
                  return '[object Object]';
                }
              })()}`,
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

    // FIX: P2-08 ownKeys 属性枚举顺序一致：
    // 返回 Reflect.ownKeys 结果，确保与原生 Object.keys() 枚举顺序一致
    ownKeys(target) {
      if (!isReadonly) {
        track(target, TrackOpTypes.ITERATE, Array.isArray(target) ? 'length' : ITERATE_KEY);
      }
      return Reflect.ownKeys(target);
    },
  };
}

// ==================== Collection Handlers ====================

// Map/Set 的迭代 key（复用 ITERATE_KEY 以保持一致性）
// 使用与 mutable handler 相同的 ITERATE_KEY，确保 collection 和 object 的迭代追踪行为一致。

function createCollectionHandler(isReadonly: boolean, isShallow: boolean): ProxyHandler<Target> {
  return {
    get(target, key, _receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly;
      if (key === ReactiveFlags.IS_READONLY) return isReadonly;
      if (key === ReactiveFlags.IS_SHALLOW) return isShallow;
      if (key === ReactiveFlags.RAW) return target;

      // 追踪 size 属性和 get 调用
      // FIX: P2-4 移除 get handler 中对 ITERATE_KEY 的重复追踪。
      // 之前对 'get' key 同时在 get handler 入口处和包装函数中追踪 ITERATE_KEY，
      // 导致 Map.get() 调用时产生双重依赖追踪。现在仅在包装函数中追踪具体 key，
      // ITERATE_KEY 的追踪由变异方法（set/add/delete/clear）的 trigger 覆盖。
      // has/forEach/entries/keys/values/Symbol.iterator 在所有模式下都追踪
      if (
        key === 'size' ||
        key === 'has' ||
        key === 'forEach' ||
        key === 'entries' ||
        key === 'keys' ||
        key === 'values' ||
        key === Symbol.iterator
      ) {
        track(target, TrackOpTypes.GET, ITERATE_KEY);
      }

      const res = Reflect.get(target, key, target);
      if (typeof res === 'function') {
        // 对迭代方法进行包装以追踪依赖
        if (
          !isReadonly &&
          (key === 'entries' || key === 'keys' || key === 'values' || key === Symbol.iterator)
        ) {
          // FIX: P2-3 使用缓存避免每次访问都创建新函数
          let methodCache = collectionMethodCache.get(target);
          if (!methodCache) {
            methodCache = new Map();
            collectionMethodCache.set(target, methodCache);
          }
          let cachedFn = methodCache.get(key);
          if (!cachedFn) {
            cachedFn = (...args: unknown[]) => {
              track(target, TrackOpTypes.GET, ITERATE_KEY);
              return res.apply(target, args);
            };
            methodCache.set(key, cachedFn);
          }
          return cachedFn;
        }
        if (!isReadonly) {
          // key as string: MUTATING_METHODS 只包含字符串方法名（"set"/"add"/"delete"/"clear"），
          // 而 Proxy handler 的 key 参数类型为 string | symbol。对于 Map/Set 的变异方法，
          // key 始终是字符串，symbol 类型的 key（如 Symbol.iterator）不会匹配 MUTATING_METHODS，
          // 因此 Set.has(key as string) 对 symbol 返回 false 是安全的。
          if (MUTATING_METHODS.has(key as string)) {
            return (...args: unknown[]) => {
              const rawTarget = toRaw(target) as Map<unknown, unknown>;
              if (key === 'set') {
                // Map.set: 检查值是否实际改变
                const oldValue = rawTarget.get(args[0]);
                const hadKey = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (!hadKey || !Object.is(toRaw(oldValue), toRaw(args[1]))) {
                  const triggerKey = toTriggerKey(args[0]);
                  if (triggerKey !== undefined) {
                    trigger(target, TriggerOpTypes.SET, triggerKey, args[1], oldValue);
                  }
                }
                return result;
              } else if (key === 'add') {
                // Set.add: 利用返回值判断是否新增
                const had = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (!had) {
                  const triggerKey = toTriggerKey(args[0]);
                  if (triggerKey !== undefined) {
                    trigger(target, TriggerOpTypes.ADD, triggerKey, args[0]);
                  }
                  // size 变化，触发 ITERATE_KEY 依赖
                  trigger(target, TriggerOpTypes.ADD, ITERATE_KEY);
                }
                return result;
              } else if (key === 'delete') {
                // Map/Set.delete: 已有 hadKey 检查
                const hadKey = rawTarget.has(args[0]);
                const result = res.apply(target, args);
                if (hadKey) {
                  const triggerKey = toTriggerKey(args[0]);
                  if (triggerKey !== undefined) {
                    trigger(target, TriggerOpTypes.DELETE, triggerKey, undefined, undefined);
                  }
                  // size 变化，触发 ITERATE_KEY 依赖
                  trigger(target, TriggerOpTypes.DELETE, ITERATE_KEY);
                }
                return result;
              } else if (key === 'clear') {
                const hadItems = rawTarget.size > 0;
                const result = res.apply(target, args);
                if (hadItems) {
                  trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, undefined);
                }
                return result;
              }
              // 其他变异方法
              const result = res.apply(target, args);
              trigger(target, TriggerOpTypes.ADD, ITERATE_KEY);
              return result;
            };
          }
          // Map.get: 额外追踪具体的 key，使 set 变异时能精确触发
          if (key === 'get') {
            return (...args: unknown[]) => {
              track(target, TrackOpTypes.GET, args[0] as string | symbol);
              return res.apply(target, args);
            };
          }
        } else {
          // Readonly：阻止变异方法并发出警告
          if (MUTATING_METHODS.has(key as string)) {
            return (..._args: unknown[]) => {
              if (__DEV__) {
                warn(`Operation "${String(key)}" failed: target is readonly.`);
              }
              // delete 返回 false 以匹配原生 Set.prototype.delete 和 Map.prototype.delete 的
              // 失败返回值语义（表示未执行删除）。其他变异方法（set/add/clear）返回 undefined，
              // 因为原生 API 中这些方法在成功时返回特定值（如 Set.add 返回 Set 本身），
              // 此处用 undefined 表示操作被阻止，与 readonly handler 的行为一致。
              if (key === 'delete') return false;
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

export function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>> {
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

export { toRaw } from './shared';

export function markRaw<T extends object>(value: T): T {
  // FIX: P2-2 检查对象是否被冻结或密封，避免在冻结对象上调用 defineProperty 抛出 TypeError
  if (Object.isFrozen(value) || Object.isSealed(value)) {
    if (__DEV__) {
      warn('markRaw() cannot be used on frozen or sealed objects.');
    }
    return value;
  }
  Object.defineProperty(value, ReactiveFlags.SKIP, { value: true });
  return value;
}
