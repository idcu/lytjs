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
import { signal, batch, reactive, effect, stop, isRef } from '@lytjs/reactivity';
import { warn } from '@lytjs/common-error';
import { inject } from '@lytjs/core';
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
  /**
   * 每个 store 的「清理函数」（停掉它内部的深度 effect）。
   *
   * ⚠️ 2026-11-05 新增：`$subscribe` 的变更检测靠 `effect()` 实现，而这些 effect
   *   会一直挂在状态 signal 上。`$dispose()` / `clearStoreCache()` 必须把它们停掉，
   *   否则被废弃的 store 会继续响应变更并持有订阅回调（测试里反复建 store 时尤其明显）。
   */
  cleanups: Map<string, Array<() => void>>;
}

const createRegistry = (): StoreRegistry => ({
  stores: new Map(),
  subscriptions: new Map(),
  actionCallbacks: new Map(),
  cleanups: new Map(),
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
  // 这条告警**刻意**不走 `warn()`（它受 dev 模式门控）：SSR 上的跨请求数据泄漏
  // 属于安全问题，生产环境也必须能被看到。
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

/**
 * 解析 `useStore()` 应归属的 pinia（S24）。
 *
 * 优先级：显式入参 > 当前组件所属 app 的 provide > 模块级 activePinia。
 *
 * 修复前只读 `activePinia`：两个 app 同时 `app.use(pinia)` 时，后安装的会覆盖
 * 全局，先安装那个 app 的组件拿到的也是**同一个 store**。`pinia.install` 早已
 * 把实例写入 `app.provide('__lytjs_pinia__')`，这里只需在当前实例上下文里取回。
 * 组件外部（无实例）仍回落到 activePinia，纯客户端单例语义不变。
 */
function resolvePinia(pinia?: Pinia | null): Pinia | undefined {
  if (pinia) return pinia;
  const appPinia = inject<Pinia>('__lytjs_pinia__');
  return appPinia ?? getActivePinia() ?? undefined;
}

// ==================== 状态值处理 ====================

/** 需要被 `reactive` 包裹的值（对象 / 数组 / Map / Set，排除 ref 本身） */
function isWrappable(value: unknown): value is object {
  return value !== null && typeof value === 'object' && !isRef(value);
}

/**
 * 把状态值包成响应式对象。
 *
 * ⚠️ 2026-11-05 修（P0）：此前状态值被**原样**塞进 `signal()` —— 而 `signal` 不做深包裹，
 *   于是下面这些**原地变更既不触发渲染，也不触发 `$subscribe`**：
 *
 *   ```ts
 *   store.items.push(x);        // effect 只跑过初值，订阅 0 条
 *   store.user.name = 'b';      // 同上
 *   ```
 *
 *   而 Pinia 的 state 是 `reactive()`，嵌套可变是**基本预期**（列表增删是最常见的操作）。
 *   现在对象/数组一律先 `reactive()` 再进 signal：读路径上 `store.items` 拿到的是代理，
 *   `push` / 属性赋值都能被追踪。
 */
function wrapValue(value: unknown): unknown {
  return isWrappable(value) ? reactive(value) : value;
}

/**
 * 是否是响应式「信号」（本仓的 `signal()` 返回的是**函数**，`isRef()` 只认对象 ref）。
 *
 * 判据：带 `set` + `update` 的函数（`WritableSignal` 的形状），或者是 `__v_isRef` 对象。
 */
function isSignalLike(value: unknown): boolean {
  if (isRef(value)) return true;
  if (typeof value !== 'function') return false;
  const fn = value as unknown as { set?: unknown; update?: unknown };
  return typeof fn.set === 'function' && typeof fn.update === 'function';
}

/**
 * 读一个「信号 / ref」的当前值。
 *
 * 两种形态都要支持：本仓的 `signal()` 是**函数**，而 `toRef` / `ref` 是带 `.value` 的对象。
 */
function readSignal(value: unknown): unknown {
  if (typeof value === 'function') return (value as unknown as () => unknown)();
  return (value as { value: unknown }).value;
}

/** 写一个「信号 / ref」（保持与 action 同一条写链路） */
function writeSignal(target: unknown, next: unknown): void {
  if (typeof target === 'function') {
    (target as unknown as { set: (v: unknown) => void }).set(next);
    return;
  }
  (target as { value: unknown }).value = next;
}

/**
 * 是否是「action 函数」。
 *
 * ⚠️ 2026-11-05 修（P1）：本仓的 `signal()` 返回的是**函数**，所以
 *   「是函数 ⇒ 是 action」这个判定会把状态信号当成 action：
 *   · `$state` 里丢掉所有信号状态键（实测 `Object.keys(store.$state)` 变成 `[]`）
 *   · 给信号套一层 action 包装（`store.count()` 会走 action 路径）
 *   ⇒ 判定必须先排除信号。
 */
function isActionFn(value: unknown): boolean {
  return typeof value === 'function' && !isSignalLike(value);
}

/**
 * 深度读一遍，把嵌套属性登记为依赖（`$subscribe` 的变更检测靠它）。
 *
 * 只读、不修改；`seen` 防循环引用。
 */
function trackDeep(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    void value.length;
    for (const item of value) trackDeep(item, seen);
    return;
  }
  if (value instanceof Map) {
    void value.size;
    for (const [k, v] of value) {
      trackDeep(k, seen);
      trackDeep(v, seen);
    }
    return;
  }
  if (value instanceof Set) {
    void value.size;
    for (const v of value) trackDeep(v, seen);
    return;
  }
  for (const key of Object.keys(value)) {
    trackDeep((value as Record<string, unknown>)[key], seen);
  }
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
      // Get active pinia if not provided（S24：先取当前 app provide，再回落全局）
      if (!pinia) {
        pinia = resolvePinia();
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

      /**
       * action 里的 `this`。
       *
       * ⚠️ 2026-11-05 修（P1）：此前代理的是 `wrappedStore`（裸 ref 容器）——
       *   `this.n` 拿到的是**信号函数**而不是值，`this.n++` 直接算出 NaN。
       *   现在延迟绑定到 `store`（解包后的视图），语义与 Pinia 一致。
       */
      let storeRef: Record<string, unknown> | null = null;
      const thisContext = new Proxy(
        {},
        {
          get(_target, prop: string | symbol) {
            if (typeof prop !== 'string' || !storeRef) return undefined;
            return storeRef[prop];
          },
          set(_target, prop: string | symbol, value: unknown) {
            if (typeof prop !== 'string' || !storeRef) return false;
            storeRef[prop] = value;
            return true;
          },
          has(_target, prop) {
            return typeof prop === 'string' && !!storeRef && prop in storeRef;
          },
        },
      );

      /**
       * 状态键：setup 返回的**非函数**成员（`$` 开头的内部成员也排除）。
       *
       * ⚠️ 2026-11-05 修（P1）：`$state` 此前直接等于 `storeObj` —— 连 action 函数一起
       *   暴露出去（`Object.keys(store.$state)` 实测为 `["n","inc"]`）。持久化插件
       *   `Object.assign({}, store.$state)` 会把函数也复制进去。
       */
      const stateKeys = Object.keys(storeObj as Record<string, unknown>).filter(
        (key) => !isActionFn((storeObj as Record<string, unknown>)[key]) && !key.startsWith('$'),
      );

      /** 正在执行 action 的**同步段**（期间由 action 边界统一通知，避免重复） */
      let inAction = false;
      /** `$patch` 期间抑制逐键通知（一次调用只发一条事件） */
      let patching = false;
      /** 「已经通知过订阅者」的序号 —— action 结束后据此判断要不要补一条 */
      let notifySeq = 0;
      const stops: Array<() => void> = [];

      // ⚠️ 2026-11-05 修（P0）：**不能直接 `reactive(wrappedStore)`** ——
      //   `reactive` 只解包「对象型 ref」（`__v_isRef`），而本仓的 `signal()` 返回的是
      //   **函数**，于是 `store.count` 拿到的是信号函数本身（实测 `typeof store.n === 'function'`），
      //   `store.count + 1` ⇒ 字符串拼接 / NaN；`store.count = 1` 还会把信号整个替换掉
      //   ⇒ 之后 action 里改原信号，`store.count` 永远不变（写入链断裂）。
      //
      //   现在显式建一层「解包视图」：
      //     · 信号键 ⇒ 读 `sig()`、写 `sig.set(v)`（写穿透，保持与 action 同一条链）
      //     · 普通键 ⇒ 直读直写
      //     · action ⇒ 原样返回（已被包装）
      //   再用 `reactive` 包住这层视图，嵌套对象仍然按需深代理。
      const view: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (key.startsWith('$')) continue;
        if (isSignalLike(value)) {
          Object.defineProperty(view, key, {
            get: () => readSignal(value),
            set: (next: unknown) => writeSignal(value, next),
            enumerable: true,
            configurable: true,
          });
        } else {
          Object.defineProperty(view, key, {
            get: () => wrappedStore[key],
            set: (next: unknown) => {
              wrappedStore[key] = next;
            },
            enumerable: true,
            configurable: true,
          });
        }
      }

      const store = reactive(view) as unknown as SS &
        Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
      storeRef = store as unknown as Record<string, unknown>;

      /** `$state` 的实时视图（只含状态键，不含 action） */
      const stateView: Record<string, unknown> = {};
      for (const key of stateKeys) {
        Object.defineProperty(stateView, key, {
          get: () => (store as unknown as Record<string, unknown>)[key],
          set: (value: unknown) => {
            (store as unknown as Record<string, unknown>)[key] = value;
          },
          enumerable: true,
          configurable: true,
        });
      }

      const notify = (
        type: 'direct' | 'patch object' | 'patch function',
        payload: unknown,
      ): void => {
        notifySeq++;
        for (const sub of subs) {
          sub({ storeId: id, type, payload }, stateView as Record<string, unknown>);
        }
      };

      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (isActionFn(value) && !key.startsWith('$')) {
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

            const seqBefore = notifySeq;
            const finish = (r: unknown) => {
              // ⚠️ 2026-11-05：状态在 action 里被改过（ref 变更会被下面的 effect 捕获）
              //   ⇒ 已经通知过，这里不再重复；只有「状态没被响应式地改动」（例如 setup 里
              //   用的是裸对象 `{ value: 0 }`）时才按 action 边界补一条。
              if (notifySeq === seqBefore && !patching) {
                notify('direct', { name: key });
              }
              if (context.after) {
                context.after(r);
              }
              return r;
            };

            inAction = true;
            let result: unknown;
            try {
              result = (value as any).apply(thisContext, args);
            } catch (err) {
              if (context.onError) {
                context.onError(err);
              }
              throw err;
            } finally {
              inAction = false;
            }

            if (result instanceof Promise) {
              return result.then(finish, (err: unknown) => {
                if (context.onError) {
                  context.onError(err);
                }
                throw err;
              });
            }
            return finish(result);
          };
        }
      }

      Object.defineProperty(store, '$id', {
        value: id,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$state', {
        get: () => stateView,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$patch', {
        value: function (partialOrMutator: Record<string, unknown> | ((state: unknown) => void)) {
          const isFn = typeof partialOrMutator === 'function';
          patching = true;
          try {
            batch(() => {
              if (isFn) {
                // ⚠️ 2026-11-05 修（P1）：此前把 `storeObj`（裸 ref 容器）交给 mutator ——
                //   `s.count = 5` 会把 ref **整个替换掉**，而 `store.count` 读的是
                //   reactive(wrappedStore) 里那个旧 ref ⇒ **写入静默丢失**。
                //   现在传 store 本身（响应式视图），写入走 ref 的写穿透。
                (partialOrMutator as (s: unknown) => void)(store);
              } else {
                for (const [key, value] of Object.entries(partialOrMutator)) {
                  if (key in store) {
                    (store as unknown as Record<string, unknown>)[key] = value;
                  } else {
                    warn(
                      `[@lytjs/store] $patch(): 键 "${key}" 不在 store "${id}" 的状态里，已忽略。` +
                        `setup store 的状态键在 setup() 返回时就固定了。`,
                    );
                  }
                }
              }
              notify(isFn ? 'patch function' : 'patch object', partialOrMutator);
            });
          } finally {
            patching = false;
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$reset', {
        value: function () {
          // ⚠️ setup store 的 `$reset` 需要重新执行 setup()，会丢掉闭包内的引用
          //   （Pinia 也明确不支持）。这里保持告警，但说明**可行替代**。
          warn(
            `[@lytjs/store] setup store "${id}" 不支持 $reset()（无法重放 setup 的闭包）。` +
              `如需重置，请自己写一个 action 把状态键逐个赋回初值。`,
          );
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$subscribe', {
        value: function (callback: SubscriptionCallback<Record<string, unknown>>) {
          subs.add(callback);
          return () => {
            subs.delete(callback);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$onAction', {
        value: function (callback: ActionCallback) {
          actionCbs.add(callback);
          return () => {
            actionCbs.delete(callback);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$dispose', {
        value: function () {
          // 停掉深度 effect，否则它会把已废弃的 store 钉在内存里
          for (const stop of stops) stop();
          registry.stores.delete(cacheKey);
          registry.subscriptions.delete(cacheKey);
          registry.actionCallbacks.delete(cacheKey);
          registry.cleanups.delete(cacheKey);
        },
        enumerable: true,
        configurable: true,
      });

      // ⚠️ 2026-11-05 新增：**直接改状态也要通知订阅者**。
      //   此前 `$subscribe` 只在 action 边界触发 —— 而 `store.count = 1`（在 setup store 里
      //   非常常见）既不触发订阅、也不触发持久化插件。现在用一个深度 effect 兜住：
      //   读一遍所有状态键（含嵌套），变更时补一条 `direct` 事件。
      let firstRun = true;
      const directRunner = effect(() => {
        for (const key of stateKeys) {
          const raw = (wrappedStore as Record<string, unknown>)[key];
          // 信号 ⇒ 读它（只订阅信号本身）；对象 ⇒ 包成 reactive 再深读（与 `store.x` 同一代理）。
          // ⚠️ 刻意**不**走 `store[key]`：那会同时订阅 reactive 的属性，一次写入触发两遍。
          if (isSignalLike(raw)) {
            trackDeep(readSignal(raw));
          } else {
            trackDeep(isWrappable(raw) ? reactive(raw) : raw);
          }
        }
        if (firstRun) {
          firstRun = false;
          return;
        }
        if (inAction || patching) return;
        notify('direct', {});
      });
      stops.push(() => stop(directRunner));

      registry.cleanups.set(cacheKey, stops);

      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: stateView as StateTree };
      }

      registry.stores.set(cacheKey, store as unknown as Store);
      return store;
    };
  } else {
    const options = optionsOrSetup;
    return function useStore(pinia?: Pinia): Store<Id, S, G, A> {
      // S24：先取当前 app provide 的 pinia，再回落模块级 activePinia
      if (!pinia) {
        pinia = resolvePinia();
      }
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

      // `$patch` / `$reset` / `$state =` 期间抑制「逐键 direct 通知」：一次调用只发一条事件
      // （Pinia 语义；否则订阅者按事件持久化时会被重复写入，mutation.type 也失真）
      let patching = false;
      /** 每个状态键一个深度 effect，`$dispose` 时要停掉（否则 store 被钉住） */
      const stops: Array<() => void> = [];

      const initialState = options.state ? options.state() : ({} as S);
      const stateSignals = new Map<string, ReturnType<typeof signal>>();
      const state: Record<string, unknown> = {};

      for (const key of Object.keys(initialState)) {
        // ⚠️ 2026-11-05 修（P0）：对象/数组先 `reactive()` 再进 signal（见 `wrapValue`），
        //   否则 `store.items.push(x)` 这类原地变更**既不渲染也不通知**。
        const sig = signal(wrapValue(initialState[key as keyof S]));
        stateSignals.set(key, sig);
        Object.defineProperty(state, key, {
          get: () => sig(),
          set: (val: unknown) => {
            sig.set(wrapValue(val));
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
          //
          // ⚠️ 2026-11-05 修（P1）：**不能用 `computedSignal`** —— 它只订阅 `signal`，
          //   而状态里的对象/数组现在是 `reactive` 代理 ⇒
          //   `getters: { total: (s) => s.items.reduce(...) }` 在 `push` 之后**仍是旧值**
          //   （实测 effect 重跑了，但 getter 返回缓存）。改成「惰性 effect + signal」：
          //   首次读取时建立 effect，依赖（含嵌套）变更时自动重算并通知下游。
          const out = signal<unknown>(undefined);
          let started = false;
          Object.defineProperty(getters, key, {
            get: () => {
              if (!started) {
                started = true;
                const runner = effect(() =>
                  out.set(getterFn.call(thisContext, state, getters, store)),
                );
                stops.push(() => stop(runner));
              }
              return out();
            },
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

      const notify = (
        type: 'direct' | 'patch object' | 'patch function',
        payload: unknown,
      ): void => {
        for (const sub of subs) {
          sub({ storeId: id, type, payload }, state as unknown as S);
        }
      };

      Object.defineProperty(store, '$id', {
        value: id,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$state', {
        get: () => state as any,
        // ⚠️ 2026-11-05 修（P1）：此前 `$state` **只有 getter** —— 而类型里写的是可写
        //   （`$state: S`），Pinia 也支持 `store.$state = {...}`。赋值时抛的是
        //   `Cannot set property $state of #<Object> which has only a getter`，
        //   在严格模式 / TS 编译产物里直接中断。
        set: (next: Record<string, unknown>) => {
          if (!next || typeof next !== 'object') {
            warn(
              `[@lytjs/store] store "${id}" 的 $state 只能整体赋值为对象（收到 ${typeof next}）。`,
            );
            return;
          }
          patching = true;
          try {
            batch(() => {
              for (const [key, value] of Object.entries(next)) {
                if (key in state) {
                  (state as Record<string, unknown>)[key] = value;
                } else {
                  warn(
                    `[@lytjs/store] $state 赋值：键 "${key}" 不在 store "${id}" 的状态里，已忽略。` +
                      `state 的键在 state() 返回时就固定了。`,
                  );
                }
              }
              notify('direct', { $state: next });
            });
          } finally {
            patching = false;
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$patch', {
        value: function (partialOrMutator: Partial<S> | ((state: S) => void) | any) {
          const isFn = typeof partialOrMutator === 'function';
          patching = true;
          try {
            batch(() => {
              if (isFn) {
                partialOrMutator(state as any);
                // 函数式 patch 里新增的键：`state` 是普通对象，写进去只会得到一个
                // **没有 signal 的影子属性**（`store.$state.x` 有值、`store.x` 没有）。
                // 明确丢弃并告警，避免留下不一致的中间状态。
                for (const key of Object.keys(state)) {
                  if (!stateSignals.has(key)) {
                    warn(
                      `[@lytjs/store] $patch(fn)：新增的键 "${key}" 已被丢弃 —— ` +
                        `state 的键在 state() 返回时就固定了（改 state() 或在 state 里预留该键）。`,
                    );
                    delete (state as Record<string, unknown>)[key];
                  }
                }
              } else {
                for (const [key, value] of Object.entries(partialOrMutator)) {
                  if (key in state) {
                    (state as Record<string, unknown>)[key] = value;
                  } else {
                    warn(
                      `[@lytjs/store] $patch(): 键 "${key}" 不在 store "${id}" 的状态里，已忽略。` +
                        `state 的键在 state() 返回时就固定了。`,
                    );
                  }
                }
              }
              // 变更落定后再通知订阅者：一次 $patch 恰好一条 patch 事件
              notify(isFn ? 'patch function' : 'patch object', partialOrMutator);
            });
          } finally {
            patching = false;
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$reset', {
        value: function () {
          if (!options.state) return;
          const newState = options.state();
          patching = true;
          try {
            batch(() => {
              for (const key of Object.keys(newState)) {
                if (key in state) {
                  (state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[
                    key
                  ];
                }
              }
              // 一次 reset 只发一条事件（此前按 key 各发一条 `direct`，订阅者会被写 N 次，
              // 而且 mutation.type 也无法与「用户逐个改」区分开）
              notify('direct', { reset: true });
            });
          } finally {
            patching = false;
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
          for (const stop of stops) stop();
          registry.stores.delete(id);
          registry.subscriptions.delete(id);
          registry.actionCallbacks.delete(id);
          registry.cleanups.delete(id);
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperties(store, Object.getOwnPropertyDescriptors(state));
      Object.defineProperties(store, Object.getOwnPropertyDescriptors(getters));
      Object.assign(store, actionFns);

      // ⚠️ 2026-11-05 新增：每个状态键一个**深度** effect ——
      //   既覆盖整体替换（`store.count = 1`），也覆盖嵌套原地变更（`store.items.push(x)`）。
      //   此前通知只挂在 setter 上，而 setter 只在「整个值被换掉」时触发 ⇒
      //   数组/对象的原地变更**一条订阅事件都没有**（实测 0 条）。
      for (const [key, sig] of stateSignals) {
        let last = sig();
        let first = true;
        const runner = effect(() => {
          const value = sig();
          trackDeep(value);
          if (first) {
            first = false;
            last = value;
            return;
          }
          const replaced = !Object.is(value, last);
          const oldValue = last;
          last = value;
          if (patching) return;
          notify('direct', replaced ? { key, oldValue, newValue: value } : { key });
        });
        stops.push(() => stop(runner));
      }

      registry.cleanups.set(id, stops);

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
    // 先停掉内部 effect（否则它们仍挂在状态 signal 上，继续响应已废弃 store 的变更）
    for (const stops of r.cleanups.values()) {
      for (const stop of stops) stop();
    }
    r.cleanups.clear();
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
