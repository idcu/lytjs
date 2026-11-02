/**
 * @lytjs/store - defineStore implementation
 *
 * Supports both Options API and Setup Store patterns.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  StoreDefinition,
  DefineStoreOptions,
  Store,
  StateTree,
  _Method,
  SubscriptionCallback,
  ActionCallback,
  Pinia,
} from './types';
import { signal, computedSignal as computed, batch, reactive } from '@lytjs/reactivity';
import { getActivePinia } from './pinia';

/**
 * 一个 pinia 实例的「store 注册表」。
 *
 * ## 为什么必须按 pinia 隔离（2026-11-03 修 P0）
 *
 * 此前这三张表是**模块级单例**，只按 store id 作键，**完全忽略 `useStore(pinia)` 传入的
 * pinia 参数**：
 *
 * ```ts
 * const storeCache = new Map<string, Store>();
 * ...
 * if (storeCache.has(id)) return storeCache.get(id);   // ← 不看 pinia
 * ```
 *
 * 后果（实测，`scripts/check-ssr-isolation.mjs`）：
 *
 * ```
 * 请求 A（已登录）: user=ALICE token=SECRET-A-TOKEN
 * 请求 B（匿名）  : user=ALICE token=SECRET-A-TOKEN   ← 直接渲染出 A 的令牌
 * ```
 *
 * 即使每个请求都老老实实 `createPinia()`，拿到的也是**同一个 store 对象**。
 * 这是 SSR 上的**跨用户数据泄漏**，不只是"状态没重置"。
 *
 * ## 设计
 *
 * - 每个 pinia 一个注册表，存在 `WeakMap` 里 ⇒ pinia 被回收时注册表随之回收
 *   （SSR 每请求一个 pinia，不能有强引用把它钉住，否则换成了内存泄漏）
 * - 没传 pinia（也没有 activePinia）时落到 `fallbackRegistry`，保持单例语义
 *   （纯客户端用法不受影响）
 */
interface StoreRegistry {
  stores: Map<string, Store>;
  subscriptions: Map<string, Set<SubscriptionCallback<Record<string, unknown>>>>;
  actionCallbacks: Map<string, Set<ActionCallback>>;
}

const createRegistry = (): StoreRegistry => ({
  stores: new Map(),
  subscriptions: new Map(),
  actionCallbacks: new Map(),
});

/** 每个 pinia 实例一个注册表（弱引用，随 pinia 一起回收） */
const registries = new WeakMap<object, StoreRegistry>();

/** 没有 pinia 时的兜底（纯客户端 / 测试里不建 pinia 的用法） */
const fallbackRegistry = createRegistry();

/** 取（或创建）某个 pinia 对应的注册表 */
/**
 * 已经就「没有 pinia」告过警的 store id（只提示一次，避免刷屏）。
 *
 * ⚠️ 这条告警针对的是一个**静默的安全隐患**：`useStore()` 既没收到 pinia、
 * 也没有 `activePinia` 时，会落到**进程级**的 `fallbackRegistry` ——
 * 所有调用方共享同一个 store 实例。在 SSR 上这等于**跨请求共享用户数据**
 * （实测见 `scripts/check-ssr-isolation.mjs` 第 [2] 组）。
 *
 * 纯客户端用单例是合理默认，所以这里不抛错；但在服务端必须能被发现。
 */
const warnedNoPinia = new Set<string>();

function warnNoPiniaOnce(id: string): void {
  if (warnedNoPinia.has(id)) return;
  warnedNoPinia.add(id);
  // eslint-disable-next-line no-console
  console.warn(
    `[@lytjs/store] useStore("${id}") 没有可用的 pinia：将使用**进程级**的默认 store。\n` +
      `  · 纯客户端：这是合理的单例语义，可以忽略。\n` +
      `  · SSR：**所有请求会共享同一个 store 实例**，用户数据会在请求之间泄漏。\n` +
      `    修法：每请求 createPinia() 并 setActivePinia(pinia)，或显式 useStore(pinia)。`,
  );
}

function registryFor(pinia: Pinia | undefined | null): StoreRegistry {
  if (!pinia) return fallbackRegistry;
  let r = registries.get(pinia as unknown as object);
  if (!r) {
    r = createRegistry();
    registries.set(pinia as unknown as object, r);
  }
  return r;
}

export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A>;

export function defineStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
): () => SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;

export function defineStore<Id extends string, S extends StateTree, G, A, SS>(
  id: Id,
  optionsOrSetup: DefineStoreOptions<Id, S, G, A> | (() => SS),
):
  | StoreDefinition<Id, S, G, A>
  | (() => SS &
      Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>) {
  if (typeof optionsOrSetup === 'function') {
    const setup = optionsOrSetup;
    const cacheKey = `${id}:setup`;

    return function useStore(
      pinia?: Pinia,
    ): SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>> {
      // Get active pinia if not provided
      if (!pinia) {
        pinia = getActivePinia();
      }
      // ★ 2026-11-03：注册表按 pinia 隔离（此前只按 id ⇒ SSR 跨请求串数据）
      if (!pinia) warnNoPiniaOnce(id);
      const registry = registryFor(pinia);
      if (registry.stores.has(cacheKey)) {
        return registry.stores.get(cacheKey) as unknown as SS &
          Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
      }

      if (!registry.subscriptions.has(cacheKey)) {
        registry.subscriptions.set(cacheKey, new Set());
      }
      if (!registry.actionCallbacks.has(cacheKey)) {
        registry.actionCallbacks.set(cacheKey, new Set());
      }

      const subs = registry.subscriptions.get(cacheKey)!;
      const actionCbs = registry.actionCallbacks.get(cacheKey)!;

      const storeObj = setup();

      const wrappedStore: Record<string, unknown> = {};

      // 直接引用 setup 返回的对象，保持响应式
      Object.assign(wrappedStore, storeObj as Record<string, unknown>);

      const thisContext = new Proxy(wrappedStore, {
        get(target, prop: string | symbol) {
          if (typeof prop === 'string') {
            const value = target[prop];
            if (typeof value === 'function') {
              return value.bind(target);
            }
            return value;
          }
          return undefined;
        },
        set(target, prop: string | symbol, value: unknown) {
          if (typeof prop === 'string') {
            target[prop] = value;
            return true;
          }
          return false;
        },
        has(_target, prop) {
          return typeof prop === 'string' && prop in wrappedStore;
        },
      });

      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (typeof value === 'function' && !key.startsWith('$')) {
          wrappedStore[key] = function (...args: unknown[]) {
            const context = {
              store: wrappedStore,
              name: key,
              args,
              after: undefined as ((result: unknown) => void) | undefined,
              onError: undefined as ((error: unknown) => void) | undefined,
            };

            for (const cb of actionCbs) {
              (cb as any)(context);
            }

            try {
              const result = (value as any).apply(thisContext, args);

              const handleResult = (r: unknown) => {
                for (const sub of subs) {
                  sub(
                    { storeId: id, type: 'direct', payload: { name: key } },
                    wrappedStore.$state as Record<string, unknown>,
                  );
                }
                if (context.after) {
                  context.after(r);
                }
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: unknown) => {
                  if (context.onError) {
                    context.onError(err);
                  }
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (err) {
              if (context.onError) {
                context.onError(err);
              }
              throw err;
            }
          };
        }
      }

      // 用 reactive 包裹，使 setup 返回的 ref 在外部访问时自动解包
      // （store.count 得到值而非 Ref、store.items.map(...) 可直接调用），
      // 与 Pinia 语义及本包 README 用法一致。功能由 reactive 的 ref 解包 + 写穿透提供。
      const store = reactive(wrappedStore) as unknown as SS &
        Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;

      (store as any).$id = id;

      // 直接把 storeObj 作为 $state，保持响应式
      (store as any).$state = storeObj;

      (store as any).$patch = (
        partialOrMutator:
          | Partial<Record<string, unknown>>
          | ((state: Record<string, unknown>) => void),
      ) => {
        if (typeof partialOrMutator === 'function') {
          partialOrMutator((store as any).$state);
          for (const sub of subs) {
            sub(
              { storeId: id, type: 'patch function', payload: partialOrMutator },
              (store as any).$state,
            );
          }
        } else {
          for (const [key, value] of Object.entries(partialOrMutator)) {
            if (key in store) {
              (store as Record<string, unknown>)[key] = value;
            }
          }
          for (const sub of subs) {
            sub(
              { storeId: id, type: 'patch object', payload: partialOrMutator },
              (store as any).$state,
            );
          }
        }
      };

      (store as any).$reset = () => {
        console.warn(
          `[@lytjs/store] $reset() is not fully supported for setup stores. Store "${id}" needs to be disposed and recreated.`,
        );
      };

      (store as any).$subscribe = (callback: SubscriptionCallback<Record<string, unknown>>) => {
        subs.add(callback);
        return () => {
          subs.delete(callback);
        };
      };

      (store as any).$onAction = (callback: ActionCallback) => {
        actionCbs.add(callback);
        return () => {
          actionCbs.delete(callback);
        };
      };

      (store as any).$dispose = () => {
        registry.stores.delete(cacheKey);
        registry.subscriptions.delete(cacheKey);
        registry.actionCallbacks.delete(cacheKey);
      };

      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: store.$state };
      }

      registry.stores.set(cacheKey, store as unknown as Store);
      return store;
    };
  } else {
    const options = optionsOrSetup;
    return function useStore(pinia = getActivePinia()): Store<Id, S, G, A> {
      // ★ 2026-11-03：注册表按 pinia 隔离（此前只按 id ⇒ SSR 跨请求串数据）
      if (!pinia) warnNoPiniaOnce(id);
      const registry = registryFor(pinia);
      if (registry.stores.has(id)) {
        return registry.stores.get(id) as Store<Id, S, G, A>;
      }

      if (!registry.subscriptions.has(id)) {
        registry.subscriptions.set(id, new Set());
      }
      if (!registry.actionCallbacks.has(id)) {
        registry.actionCallbacks.set(id, new Set());
      }

      const subs = registry.subscriptions.get(id)!;
      const actions = registry.actionCallbacks.get(id)!;

      // $patch 期间抑制「逐键 direct 通知」：一次 $patch 只发一条 patch 事件
      // （Pinia 语义；否则订阅者按事件持久化时会被重复写入，mutation.type 也失真）
      let patching = false;

      const initialState = options.state ? options.state() : ({} as S);
      const stateSignals = new Map<string, ReturnType<typeof signal>>();
      const state: Record<string, unknown> = {};

      for (const key of Object.keys(initialState)) {
        const sig = signal(initialState[key as keyof S]);
        stateSignals.set(key, sig);
        Object.defineProperty(state, key, {
          get: () => sig(),
          set: (val: unknown) => {
            const oldValue = sig();
            sig.set(val as Parameters<typeof sig.set>[0]);
            if (!patching && !Object.is(oldValue, val)) {
              for (const sub of subs) {
                sub(
                  { storeId: id, type: 'direct', payload: { key, oldValue, newValue: val } },
                  state as unknown as S,
                );
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      }

      const thisContext = new Proxy(
        {},
        {
          get(_target, prop: string | symbol) {
            if (typeof prop === 'string') {
              if (prop in state) return (state as Record<string, unknown>)[prop];
              if (prop in getters) return (getters as Record<string, unknown>)[prop];
              if (prop in actionFns) return (actionFns as Record<string, unknown>)[prop];
            }
            return undefined;
          },
          set(_target, prop: string | symbol, value: unknown) {
            if (typeof prop === 'string' && prop in state) {
              (state as Record<string, unknown>)[prop] = value;
              return true;
            }
            return false;
          },
          has(_target, prop) {
            return (
              typeof prop === 'string' && (prop in state || prop in getters || prop in actionFns)
            );
          },
        },
      );

      const getters: Record<string, unknown> = {};
      if (options.getters) {
        for (const [key, fn] of Object.entries(options.getters)) {
          const getterFn = fn as (...args: unknown[]) => unknown;
          // ⚠️ 2026-10-27 修（P1）：此前只 `call(thisContext)`、**不传 state**
          //   ⇒ Pinia 的标准写法 `getters: { double: (state) => state.n * 2 }`
          //   里 `state` 是 undefined，直接 `TypeError: Cannot read properties of undefined`。
          //   现在按 Pinia 的签名传 (state, getters, store)。
          const computedSig = computed(() => getterFn.call(thisContext, state, getters, store));
          Object.defineProperty(getters, key, {
            get: () => computedSig(),
            enumerable: true,
            configurable: true,
          });
        }
      }

      const actionFns: Record<string, unknown> = {};
      if (options.actions) {
        for (const [key, fn] of Object.entries(options.actions)) {
          const actionFn = fn as _Method;
          actionFns[key] = function (...args: unknown[]) {
            const context = {
              store: store as any,
              name: key,
              args,
              after: undefined as ((result: unknown) => void) | undefined,
              onError: undefined as ((error: unknown) => void) | undefined,
            };

            for (const cb of actions) {
              (cb as any)(context);
            }

            try {
              const result = (actionFn as any).apply(thisContext, args);

              const handleResult = (r: unknown) => {
                if (context.after) {
                  context.after(r);
                }
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: unknown) => {
                  if (context.onError) {
                    context.onError(err);
                  }
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (err) {
              if (context.onError) {
                context.onError(err);
              }
              throw err;
            }
          };
        }
      }

      const store = {} as Store<Id, S, G, A>;

      Object.defineProperty(store, '$id', {
        value: id,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$state', {
        get: () => state as any,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$patch', {
        value: function (partialOrMutator: Partial<S> | ((state: S) => void) | any) {
          batch(() => {
            const isFn = typeof partialOrMutator === 'function';
            patching = true;
            try {
              if (isFn) {
                partialOrMutator(state as any);
              } else {
                for (const [key, value] of Object.entries(partialOrMutator)) {
                  if (key in state) {
                    (state as Record<string, unknown>)[key] = value;
                  }
                }
              }
            } finally {
              patching = false;
            }
            // 变更落定后再通知订阅者：一次 $patch 恰好一条 patch 事件
            if (isFn) {
              for (const sub of subs) {
                sub(
                  { storeId: id, type: 'patch function', payload: partialOrMutator },
                  state as any,
                );
              }
            } else {
              for (const sub of subs) {
                sub({ storeId: id, type: 'patch object', payload: partialOrMutator }, state as any);
              }
            }
          });
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$reset', {
        value: function () {
          if (options.state) {
            const newState = options.state();
            for (const key of Object.keys(newState)) {
              if (key in state) {
                (state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[
                  key
                ];
              }
            }
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$subscribe', {
        value: function (callback: SubscriptionCallback<S>) {
          subs.add(callback as any);
          return () => {
            subs.delete(callback as any);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$onAction', {
        value: function (callback: ActionCallback) {
          actions.add(callback);
          return () => {
            actions.delete(callback);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$dispose', {
        value: function () {
          registry.stores.delete(id);
          registry.subscriptions.delete(id);
          registry.actionCallbacks.delete(id);
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperties(store, Object.getOwnPropertyDescriptors(state));
      Object.defineProperties(store, Object.getOwnPropertyDescriptors(getters));
      Object.assign(store, actionFns);

      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: state as S };
      }

      registry.stores.set(id, store);
      return store;
    };
  }
}

/**
 * 清空 store 缓存。
 *
 * 语义（2026-11-03 起）：清空**兜底注册表**（不传 pinia 的那份）+ **当前 activePinia**
 * 的注册表。
 *
 * ⚠️ 不再「清空所有 pinia」：注册表存在 `WeakMap` 里，**刻意不持有强引用**
 * —— 否则 SSR 每请求一个 pinia 时会变成内存泄漏。每个 pinia 的注册表随它自己
 * 被 GC 时回收，本来就不需要手动清。
 */
export function clearStoreCache(): void {
  const clear = (r: StoreRegistry): void => {
    r.stores.clear();
    r.subscriptions.clear();
    r.actionCallbacks.clear();
  };
  clear(fallbackRegistry);
  const active = getActivePinia();
  if (active) {
    const r = registries.get(active as unknown as object);
    if (r) clear(r);
  }
}
