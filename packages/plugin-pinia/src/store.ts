/**
 * @lytjs/plugin-pinia — Store 类实现
 *
 * 兼容 Pinia 的 Store API，支持两种写法：
 * 1. Setup Store（组合式）：defineStore('id', () => { ... })
 * 2. Options Store（选项式）：defineStore('id', { state, getters, actions })
 *
 * Store 功能：
 * - $patch(object) / $patch(fn) 批量更新
 * - $reset() 重置状态
 * - $subscribe(callback) 订阅变化
 * - $dispose() 销毁 store
 * - $state 响应式状态
 * - $id store ID
 */

import {
  reactive,
  computed,
  watch,
  toRaw,
  ref,
  isRef,
  isReactive,
  unref,
} from '@lytjs/reactivity';

import type { WatchStopHandle } from '@lytjs/reactivity';
import type { Pinia } from './pinia';

// ============================================================
// 类型定义
// ============================================================

/** Store 状态订阅参数 */
export interface StoreSubscriptionCallbackArgument {
  /** Store ID */
  storeId: string;
  /** 事件类型 */
  type: 'direct' | 'patch object' | 'patch function';
  /** 变化的数据 */
  payload?: any;
}

/** Store 订阅回调 */
export type StoreSubscriptionCallback = (
  mutation: StoreSubscriptionCallbackArgument,
  state: any
) => void;

/** Options Store 配置 */
export interface DefineStoreOptions<
  Id extends string = string,
  S extends Record<string, any> = Record<string, any>,
  G extends Record<string, (state: S & Record<string, any>) => any> = Record<string, (state: S & Record<string, any>) => any>,
  A extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>
> {
  /** 初始状态 */
  state?: () => S;
  /** 计算属性 */
  getters?: G;
  /** 操作方法 */
  actions?: A;
}

/** Pinia Store 接口 */
export interface PiniaStore<
  Id extends string = string,
  S extends Record<string, any> = Record<string, any>,
  G extends Record<string, any> = Record<string, any>,
  A extends Record<string, (...args: any[]) => any> = Record<string, (...args: any[]) => any>
> {
  /** Store ID */
  $id: Id;
  /** 响应式状态（整个 state 对象） */
  $state: S;
  /** 安装状态 */
  _p?: Pinia;
  /** 批量更新状态 */
  $patch(partialOrFn: Partial<S> | ((state: S) => void)): void;
  /** 重置状态到初始值 */
  $reset(): void;
  /** 订阅状态变化 */
  $subscribe(callback: StoreSubscriptionCallback, options?: { detached?: boolean }): () => void;
  /** 订阅 action 调用 */
  $onAction(callback: (action: { name: string; args: any[]; after?: () => void; onError?: (error: any) => void }) => void, detached?: boolean): () => void;
  /** 销毁 Store */
  $dispose(): void;
  /** 替换整个 state */
  $state_set?(value: S): void;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断是否为普通对象
 */
function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 合并对象
 */
function mergeObjects(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (isPlainObject(sourceVal) && isPlainObject(target[key])) {
      mergeObjects(target[key], sourceVal);
    } else {
      target[key] = sourceVal;
    }
  }
}

/**
 * 深拷贝
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone) as unknown as T;
  const result: any = {};
  for (const key of Object.keys(value as any)) {
    result[key] = deepClone((value as any)[key]);
  }
  return result;
}

// ============================================================
// Options Store 创建
// ============================================================

/**
 * 创建 Options Store
 *
 * 支持 state / getters / actions 选项式写法。
 */
function createOptionsStore<Id extends string, S extends Record<string, any>, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, any, any>,
  pinia: Pinia
): PiniaStore<Id, S, G, A> {
  // 初始化状态
  const initialState = options.state ? options.state() : ({} as S);
  const reactiveState = reactive(deepClone(initialState)) as S;

  // 订阅管理
  const subscriptions: StoreSubscriptionCallback[] = [];
  const actionCallbacks: Array<(action: { name: string; args: any[]; after?: () => void; onError?: (error: any) => void }) => void> = [];
  let watchStopHandle: WatchStopHandle | null = null;
  let disposed = false;

  // 创建 store 对象
  const store: any = {};

  // 设置 $id
  store.$id = id;
  store._p = pinia;

  // 设置 $state
  Object.defineProperty(store, '$state', {
    get() {
      return reactiveState;
    },
    set(newState: S) {
      // 替换整个 state
      const currentKeys = Object.keys(reactiveState);
      const newKeys = Object.keys(newState);

      // 删除不再存在的键
      for (const key of currentKeys) {
        if (!newKeys.includes(key)) {
          delete (reactiveState as any)[key];
        }
      }

      // 设置新值
      for (const key of newKeys) {
        (reactiveState as any)[key] = (newState as any)[key];
      }
    },
    enumerable: true,
    configurable: true,
  });

  // 初始化 getters
  if (options.getters) {
    for (const key of Object.keys(options.getters)) {
      const getterFn = options.getters[key];
      const c = computed(() => getterFn.call(store, reactiveState));

      Object.defineProperty(store, key, {
        get() {
          return c.value;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  // 初始化 actions
  if (options.actions) {
    for (const key of Object.keys(options.actions)) {
      const actionFn = options.actions[key];

      store[key] = function (...args: any[]): any {
        // 触发 action 拦截器
        const context: any = { name: key, args, store };
        for (const cb of actionCallbacks) {
          cb(context);
        }

        try {
          const result = actionFn.apply(store, args);
          if (result instanceof Promise) {
            return result
              .then((val: any) => {
                if (context.after) context.after();
                return val;
              })
              .catch((err: any) => {
                if (context.onError) context.onError(err);
                throw err;
              });
          }
          if (context.after) context.after();
          return result;
        } catch (err) {
          if (context.onError) context.onError(err);
          throw err;
        }
      };
    }
  }

  // $patch
  store.$patch = function (partialOrFn: Partial<S> | ((state: S) => void)): void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法更新。`);
      return;
    }

    if (typeof partialOrFn === 'function') {
      partialOrFn(reactiveState);
      notifySubscribers({ storeId: id, type: 'patch function', payload: [] });
    } else {
      mergeObjects(reactiveState, partialOrFn);
      notifySubscribers({ storeId: id, type: 'patch object', payload: partialOrFn });
    }
  };

  // $reset
  store.$reset = function (): void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法重置。`);
      return;
    }

    const currentKeys = Object.keys(reactiveState);
    const initialKeys = Object.keys(initialState);

    // 恢复初始值
    for (const key of initialKeys) {
      (reactiveState as any)[key] = deepClone((initialState as any)[key]);
    }

    // 删除新增的键
    for (const key of currentKeys) {
      if (!initialKeys.includes(key)) {
        delete (reactiveState as any)[key];
      }
    }
  };

  // $subscribe
  store.$subscribe = function (
    callback: StoreSubscriptionCallback,
    options?: { detached?: boolean }
  ): () => void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法订阅。`);
      return () => {};
    }

    subscriptions.push(callback);

    // 首次订阅时启动 watch
    ensureWatch();

    return () => {
      const index = subscriptions.indexOf(callback);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
      if (!options?.detached && subscriptions.length === 0) {
        stopWatch();
      }
    };
  };

  // $onAction
  store.$onAction = function (
    callback: (action: { name: string; args: any[]; after?: () => void; onError?: (error: any) => void }) => void,
    detached?: boolean
  ): () => void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法注册 action 拦截器。`);
      return () => {};
    }

    actionCallbacks.push(callback);

    return () => {
      const index = actionCallbacks.indexOf(callback);
      if (index !== -1) {
        actionCallbacks.splice(index, 1);
      }
    };
  };

  // $dispose
  store.$dispose = function (): void {
    if (disposed) return;

    stopWatch();
    subscriptions.length = 0;
    actionCallbacks.length = 0;

    pinia._s.delete(id);
    disposed = true;
  };

  // Watch 管理
  function ensureWatch(): void {
    if (watchStopHandle || disposed) return;

    watchStopHandle = watch(
      reactiveState,
      () => {
        notifySubscribers({ storeId: id, type: 'direct' });
      },
      { deep: true }
    );
  }

  function stopWatch(): void {
    if (watchStopHandle) {
      watchStopHandle();
      watchStopHandle = null;
    }
  }

  function notifySubscribers(mutation: StoreSubscriptionCallbackArgument): void {
    for (const callback of subscriptions) {
      try {
        callback(mutation, reactiveState);
      } catch (err) {
        console.warn(`[plugin-pinia] Store "${id}" 订阅回调执行出错:`, err);
      }
    }
  }

  // 将 state 上的属性代理到 store 上
  for (const key of Object.keys(reactiveState)) {
    Object.defineProperty(store, key, {
      get() {
        return (reactiveState as any)[key];
      },
      set(value: any) {
        (reactiveState as any)[key] = value;
      },
      enumerable: true,
      configurable: true,
    });
  }

  // 注册到 Pinia
  pinia._s.set(id, store as PiniaStore);

  return store as PiniaStore<Id, S, G, A>;
}

// ============================================================
// Setup Store 创建
// ============================================================

/**
 * 创建 Setup Store
 *
 * 支持组合式写法，自动提取 ref / computed / function。
 */
function createSetupStore<Id extends string>(
  id: Id,
  setupFn: () => any,
  pinia: Pinia
): PiniaStore<Id> {
  // 执行 setup 函数
  const setupResult = setupFn();

  // 订阅管理
  const subscriptions: StoreSubscriptionCallback[] = [];
  const actionCallbacks: Array<(action: { name: string; args: any[]; after?: () => void; onError?: (error: any) => void }) => void> = [];
  let watchStopHandle: WatchStopHandle | null = null;
  let disposed = false;

  // 创建 store 对象
  const store: any = {};

  store.$id = id;
  store._p = pinia;

  // 收集响应式状态（用于 $state）
  const stateRefs: Record<string, any> = {};

  // 遍历 setup 返回值
  for (const key of Object.keys(setupResult)) {
    const value = setupResult[key];

    if (isRef(value)) {
      // ref -> 代理为 store 上的属性
      stateRefs[key] = value;

      Object.defineProperty(store, key, {
        get() {
          return value.value;
        },
        set(newValue: any) {
          value.value = newValue;
        },
        enumerable: true,
        configurable: true,
      });
    } else if (typeof value === 'function') {
      // function -> 作为 action
      store[key] = function (...args: any[]): any {
        const context: any = { name: key, args, store };
        for (const cb of actionCallbacks) {
          cb(context);
        }

        try {
          const result = value.apply(store, args);
          if (result instanceof Promise) {
            return result
              .then((val: any) => {
                if (context.after) context.after();
                return val;
              })
              .catch((err: any) => {
                if (context.onError) context.onError(err);
                throw err;
              });
          }
          if (context.after) context.after();
          return result;
        } catch (err) {
          if (context.onError) context.onError(err);
          throw err;
        }
      };
    } else if (typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function') {
      // computed -> 代理为 getter
      Object.defineProperty(store, key, {
        get() {
          return value.get();
        },
        enumerable: true,
        configurable: true,
      });
    } else if (isReactive(value)) {
      // reactive 对象 -> 代理
      stateRefs[key] = value;
      Object.defineProperty(store, key, {
        get() {
          return value;
        },
        enumerable: true,
        configurable: true,
      });
    } else {
      // 普通值 -> 包装为 ref
      const r = ref(value);
      stateRefs[key] = r;
      Object.defineProperty(store, key, {
        get() {
          return r.value;
        },
        set(newValue: any) {
          r.value = newValue;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  // 创建 $state（响应式对象）
  const stateProxy = reactive(stateRefs);

  Object.defineProperty(store, '$state', {
    get() {
      return stateProxy;
    },
    set(newState: any) {
      for (const key of Object.keys(newState)) {
        if (key in stateRefs) {
          if (isRef(stateRefs[key])) {
            stateRefs[key].value = (newState as any)[key];
          } else if (isReactive(stateRefs[key])) {
            mergeObjects(stateRefs[key], (newState as any)[key]);
          }
        }
      }
    },
    enumerable: true,
    configurable: true,
  });

  // $patch
  store.$patch = function (partialOrFn: any): void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法更新。`);
      return;
    }

    if (typeof partialOrFn === 'function') {
      partialOrFn(stateProxy);
      notifySubscribers({ storeId: id, type: 'patch function', payload: [] });
    } else {
      for (const key of Object.keys(partialOrFn)) {
        if (key in stateRefs) {
          if (isRef(stateRefs[key])) {
            stateRefs[key].value = (partialOrFn as any)[key];
          } else if (isReactive(stateRefs[key])) {
            mergeObjects(stateRefs[key], (partialOrFn as any)[key]);
          }
        }
      }
      notifySubscribers({ storeId: id, type: 'patch object', payload: partialOrFn });
    }
  };

  // $reset（Setup Store 不支持 $reset）
  store.$reset = function (): void {
    console.warn(
      `[plugin-pinia] Store "${id}" 是 Setup Store，不支持 $reset()。` +
      `请使用 Options Store 写法以启用 $reset()。`
    );
  };

  // $subscribe
  store.$subscribe = function (
    callback: StoreSubscriptionCallback,
    options?: { detached?: boolean }
  ): () => void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法订阅。`);
      return () => {};
    }

    subscriptions.push(callback);
    ensureWatch();

    return () => {
      const index = subscriptions.indexOf(callback);
      if (index !== -1) {
        subscriptions.splice(index, 1);
      }
      if (!options?.detached && subscriptions.length === 0) {
        stopWatch();
      }
    };
  };

  // $onAction
  store.$onAction = function (
    callback: (action: { name: string; args: any[]; after?: () => void; onError?: (error: any) => void }) => void,
    detached?: boolean
  ): () => void {
    if (disposed) {
      console.warn(`[plugin-pinia] Store "${id}" 已销毁，无法注册 action 拦截器。`);
      return () => {};
    }

    actionCallbacks.push(callback);

    return () => {
      const index = actionCallbacks.indexOf(callback);
      if (index !== -1) {
        actionCallbacks.splice(index, 1);
      }
    };
  };

  // $dispose
  store.$dispose = function (): void {
    if (disposed) return;

    stopWatch();
    subscriptions.length = 0;
    actionCallbacks.length = 0;

    pinia._s.delete(id);
    disposed = true;
  };

  // Watch 管理
  function ensureWatch(): void {
    if (watchStopHandle || disposed) return;

    watchStopHandle = watch(
      stateProxy,
      () => {
        notifySubscribers({ storeId: id, type: 'direct' });
      },
      { deep: true }
    );
  }

  function stopWatch(): void {
    if (watchStopHandle) {
      watchStopHandle();
      watchStopHandle = null;
    }
  }

  function notifySubscribers(mutation: StoreSubscriptionCallbackArgument): void {
    for (const callback of subscriptions) {
      try {
        callback(mutation, stateProxy);
      } catch (err) {
        console.warn(`[plugin-pinia] Store "${id}" 订阅回调执行出错:`, err);
      }
    }
  }

  // 注册到 Pinia
  pinia._s.set(id, store as PiniaStore);

  return store as PiniaStore<Id>;
}

// ============================================================
// 导出
// ============================================================

export {
  createOptionsStore,
  createSetupStore,
  PiniaStore,
  DefineStoreOptions,
  StoreSubscriptionCallback,
  StoreSubscriptionCallbackArgument,
};
