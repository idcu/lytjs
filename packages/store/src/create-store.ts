/**
 * Lyt.js 状态管理 — Store 创建
 *
 * 提供轻量级的状态管理方案，支持：
 * - 响应式状态（reactive 包装）
 * - 计算属性（computed 包装）
 * - 操作方法（actions）
 * - 状态订阅（$subscribe）
 * - 状态重置（$reset）
 * - Store 销毁（$dispose）
 *
 * 设计理念：
 * - 基于 @lytjs/reactivity 响应式系统
 * - API 风格参考 Pinia，简洁易用
 * - 零第三方运行时依赖
 */

import {
  reactive,
  computed,
  watch,
  toRaw,
} from '@lytjs/reactivity';
import type { WatchStopHandle } from '@lytjs/reactivity';

import {
  createSnapshot,
  diffObjects,
  mergeObjects,
  isFunction,
  SubscriptionManager,
} from '@lytjs/common';

// ============================================================
// 类型定义
// ============================================================

/** Store 选项 */
export interface StoreOptions<S extends Record<string, any> = Record<string, any>> {
  /** 初始状态（对象或工厂函数） */
  state?: S | (() => S);
  /** 计算属性（getter 函数集合） */
  getters?: Record<string, (state: S) => any>;
  /** 操作方法 */
  actions?: Record<string, (this: StoreApi<S>, ...args: any[]) => any>;
  /** 模块化子模块 */
  modules?: Record<string, ModuleOptions>;
}

/** 子模块选项 */
export interface ModuleOptions {
  /** 子模块初始状态 */
  state?: Record<string, any> | (() => Record<string, any>);
  /** 子模块计算属性 */
  getters?: Record<string, (state: any) => any>;
  /** 子模块操作方法 */
  actions?: Record<string, (this: StoreApi, ...args: any[]) => any>;
  /** 嵌套子模块 */
  modules?: Record<string, ModuleOptions>;
}

/** Store 插件接口 */
export interface StorePlugin {
  /** 安装插件，返回卸载函数（可选） */
  install: (store: StoreApi) => (() => void) | void;
}

/** 订阅回调参数 */
export interface SubscriptionCallbackArgument {
  /** Store ID */
  storeId: string;
  /** 事件类型 */
  type: 'set' | 'delete' | 'add' | 'direct';
  /** 变化的键名 */
  key: string;
  /** 新值 */
  newValue?: any;
  /** 旧值 */
  oldValue?: any;
}

/** 订阅回调函数 */
export type SubscriptionCallback = (
  mutation: SubscriptionCallbackArgument,
  state: any
) => void;

/** Store 公共 API */
export interface StoreApi<S extends Record<string, any> = Record<string, any>> {
  /** Store 唯一标识 */
  $id: string;
  /** 响应式状态 */
  state: S;
  /** 计算属性 */
  getters: Record<string, any>;
  /** 操作方法 */
  actions: Record<string, (...args: any[]) => any>;
  /** 在组件中使用 Store，返回 state 和 getters */
  /** 获取 state 和 getters（用于非插件场景） */
  $expose(): { state: S; getters: Record<string, any> };
  /** 重置状态到初始值 */
  $reset(): void;
  /** 订阅状态变化 */
  $subscribe(callback: SubscriptionCallback): () => void;
  /** 销毁 Store */
  $dispose(): void;
  /** 批量更新状态（对象合并或函数式） */
  $patch(partialOrFn: Partial<S> | ((state: S) => void)): void;
  /** 安装插件 */
  use(plugin: StorePlugin): () => void;
  /** 拦截 action 调用 */
  $onAction(callback: (action: { name: string, args: any[] }) => void): () => void;
}

// ============================================================
// Store 注册表
// ============================================================

/** 全局 Store 注册表 */
const storeMap = new Map<string, StoreApi>();

/**
 * 获取已注册的 Store
 *
 * @param id - Store ID
 * @returns Store 实例或 undefined
 */
export function getStore<S extends Record<string, any> = Record<string, any>>(
  id: string
): StoreApi<S> | undefined {
  return storeMap.get(id) as StoreApi<S> | undefined;
}

// ============================================================
// Store 创建
// ============================================================

/**
 * 创建 Store
 *
 * 创建一个包含响应式状态、计算属性和操作方法的状态管理单元。
 *
 * @param id - Store 唯一标识
 * @param options - Store 配置选项
 * @returns Store 实例
 *
 * @example
 * ```ts
 * // 定义 Store
 * const useCounterStore = createStore('counter', {
 *   state: () => ({
 *     count: 0,
 *     name: 'lyt',
 *   }),
 *   getters: {
 *     doubleCount: (state) => state.count * 2,
 *   },
 *   actions: {
 *     increment() {
 *       this.state.count++
 *     },
 *     async fetchData() {
 *       const data = await fetch('/api')
 *       this.state.name = data.name
 *     },
 *   },
 * })
 *
 * // 使用 Store
 * const store = useCounterStore()
 * console.log(store.state.count)         // 0
 * console.log(store.getters.doubleCount)  // 0
 * store.actions.increment()
 * console.log(store.state.count)         // 1
 * console.log(store.getters.doubleCount)  // 2
 *
 * // 订阅变化
 * store.$subscribe((mutation, state) => {
 *   console.log(`${mutation.type}: ${mutation.key}`)
 * })
 *
 * // 重置状态
 * store.$reset()
 *
 * // 销毁 Store
 * store.$dispose()
 * ```
 */
export function createStore<S extends Record<string, any> = Record<string, any>>(
  id: string,
  options: StoreOptions<S> = {}
): () => StoreApi<S> {
  // 检查 ID 是否已存在
  if (storeMap.has(id)) {
    console.warn(`[Lyt Store] Store "${id}" 已存在，将返回已存在的实例。`);
    return () => storeMap.get(id) as StoreApi<S>;
  }

  // 1. 初始化状态
  const initialState: S =
    typeof options.state === 'function'
      ? (options.state as () => S)()
      : options.state || ({} as S);

  // 1.5 合并 modules 的 state 到根 state
  const moduleStates: Record<string, any> = {};
  if (options.modules) {
    for (const moduleName of Object.keys(options.modules)) {
      const mod: any = options.modules[moduleName];
      const modState = typeof mod.state === 'function'
        ? (mod.state as () => Record<string, any>)()
        : mod.state || {};
      moduleStates[moduleName] = { ...modState };
    }
  }

  // 合并模块状态到初始状态
  const mergedInitialState = { ...initialState, ...moduleStates } as S;

  // 创建响应式状态
  const reactiveState = reactive({ ...mergedInitialState });

  // 2. 初始化计算属性
  const gettersResult: Record<string, any> = {};

  if (options.getters) {
    for (const key of Object.keys(options.getters)) {
      const getterFn = options.getters[key];

      // 创建计算属性，getter 函数接收 state 参数
      const c = computed(() => getterFn(reactiveState as S));

      // 通过 getter 暴露
      Object.defineProperty(gettersResult, key, {
        get() {
          return c.value;
        },
        enumerable: true,
      });
    }
  }

  // 2.5 初始化模块 getters（带命名空间前缀）
  if (options.modules) {
    for (const moduleName of Object.keys(options.modules)) {
      const mod: any = options.modules[moduleName];
      if (mod.getters) {
        for (const key of Object.keys(mod.getters)) {
          const getterFn = mod.getters[key];
          const namespacedKey = `${moduleName}/${key}`;

          const c = computed(() => {
            const ms = (reactiveState as any)[moduleName];
            return getterFn(ms);
          });

          Object.defineProperty(gettersResult, namespacedKey, {
            get() {
              return c.value;
            },
            enumerable: true,
          });
        }
      }
    }
  }

  // 3. 初始化操作方法
  const actionsResult: Record<string, (...args: any[]) => any> = {};

  // 3.0 action 拦截器列表
  const actionCallbacks: Array<(action: { name: string, args: any[] }) => void> = [];

  if (options.actions) {
    for (const key of Object.keys(options.actions)) {
      const actionFn = options.actions[key];

      // 将 action 绑定到 store 实例上
      // 注意：这里使用闭包，action 中的 this 指向 store
      actionsResult[key] = function (...args: any[]): any {
        // 触发 action 拦截器
        for (const cb of actionCallbacks) {
          cb({ name: key, args });
        }
        return actionFn.apply(storeApi, args);
      };
    }
  }

  // 3.5 初始化模块 actions（带命名空间前缀）
  if (options.modules) {
    for (const moduleName of Object.keys(options.modules)) {
      const mod: any = options.modules[moduleName];
      if (mod.actions) {
        for (const key of Object.keys(mod.actions as any)) {
          const actionFn = mod.actions[key];
          const namespacedKey = `${moduleName}/${key}`;

          actionsResult[namespacedKey] = function (...args: any[]): any {
            // 触发 action 拦截器
            for (const cb of actionCallbacks) {
              cb({ name: namespacedKey, args });
            }
            return actionFn.apply(storeApi, args);
          };
        }
      }
    }
  }

  // 4. 订阅管理器
  const subscriptionManager = new SubscriptionManager<
    [SubscriptionCallbackArgument, any]
  >();

  // 5. 是否已销毁
  let disposed = false;

  // 5.5 watch 停止句柄列表（用于 $dispose 时清理）
  const watchStopHandles: WatchStopHandle[] = [];

  /**
   * 使用 shared 的 createSnapshot 和 diffObjects 替代
   */

  /**
   * 通知所有订阅者
   */
  function notifySubscribers(mutation: SubscriptionCallbackArgument): void {
    subscriptionManager.notify([mutation, reactiveState]);
  }

  /**
   * 设置 watch 监听状态变化
   * 当有订阅者时自动启动，无订阅者时自动停止
   */
  let activeWatch: WatchStopHandle | null = null;

  function ensureWatch(): void {
    if (activeWatch || disposed) return;

    let prevSnapshot = createSnapshot(reactiveState);

    activeWatch = watch(
      reactiveState,
      () => {
        const newSnapshot = createSnapshot(reactiveState);
        // 使用 shared 的 diffObjects
        const diff = diffObjects(prevSnapshot, newSnapshot);
        // 转换为订阅格式
        for (const key in diff.added) {
          notifySubscribers({ storeId: id, type: 'add', key, newValue: diff.added[key] });
        }
        for (const key in diff.removed) {
          notifySubscribers({ storeId: id, type: 'delete', key, oldValue: diff.removed[key] });
        }
        for (const key in diff.changed) {
          notifySubscribers({ storeId: id, type: 'set', key, newValue: diff.changed[key].new, oldValue: diff.changed[key].old });
        }
        prevSnapshot = newSnapshot;
      },
      { deep: true }
    );

    watchStopHandles.push(activeWatch);
  }

  function stopWatchIfNoSubscribers(): void {
    if (!subscriptionManager.hasSubscribers() && activeWatch) {
      activeWatch();
      const idx = watchStopHandles.indexOf(activeWatch);
      if (idx !== -1) {
        watchStopHandles.splice(idx, 1);
      }
      activeWatch = null;
    }
  }

  // 6. 创建 Store API
  const storeApi: StoreApi<S> = {
    $id: id,

    /** 响应式状态 */
    get state(): S {
      return reactiveState;
    },

    /** 计算属性 */
    get getters(): Record<string, any> {
      return gettersResult;
    },

    /** 操作方法 */
    get actions(): Record<string, (...args: any[]) => any> {
      return actionsResult;
    },

    /**
     * 在组件中使用 Store
     *
     * 返回响应式的 state 和 getters，方便解构使用。
     *
     * @returns { state, getters }
     */
    $expose(): { state: S; getters: Record<string, any> } {
      return {
        state: reactiveState,
        getters: gettersResult,
      };
    },

    /**
     * 重置状态到初始值
     *
     * 遍历初始状态的所有键，将当前状态恢复为初始值。
     * 新增的键会被删除。
     */
    $reset(): void {
      if (disposed) {
        console.warn(`[Lyt Store] Store "${id}" 已销毁，无法重置。`);
        return;
      }

      // 获取当前状态的所有键
      const currentKeys = Object.keys(reactiveState);
      const mergedKeys = Object.keys(mergedInitialState);

      // 恢复初始值（包含 modules 的初始状态）
      for (const key of mergedKeys) {
        (reactiveState as any)[key] = (mergedInitialState as any)[key];
      }

      // 删除新增的键
      for (const key of currentKeys) {
        if (!mergedKeys.includes(key)) {
          delete (reactiveState as any)[key];
        }
      }
    },

    /**
     * 订阅状态变化
     *
     * 当状态发生变化时触发回调。
     * 使用 @lytjs/reactivity 的 watch 深度侦听状态变化，
     * 通过快照对比确定具体变化的属性。
     *
     * @param callback - 订阅回调
     * @returns 取消订阅的函数
     */
    $subscribe(callback: SubscriptionCallback): () => void {
      if (disposed) {
        console.warn(`[Lyt Store] Store "${id}" 已销毁，无法订阅。`);
        return () => {};
      }

      // 使用 shared 的 subscriptionManager
      const unsubscribe = subscriptionManager.subscribe(([mutation, state]) => {
        callback(mutation, state);
      });

      // 首次有订阅者时启动 watch
      ensureWatch();

      return () => {
        unsubscribe();
        // 无订阅者时停止 watch 以节省资源
        stopWatchIfNoSubscribers();
      };
    },

    /**
     * 销毁 Store
     *
     * 清空订阅列表，停止 watch，从注册表中移除。
     */
    $dispose(): void {
      if (disposed) return;

      // 停止所有 watch
      for (const stop of watchStopHandles) {
        stop();
      }
      watchStopHandles.length = 0;
      activeWatch = null;

      // 清空订阅管理器
      subscriptionManager.clear();

      // 从注册表中移除
      storeMap.delete(id);

      // 标记为已销毁
      disposed = true;
    },

    /**
     * 批量更新状态
     *
     * 支持两种模式：
     *   - 对象合并：$patch({ count: 1, name: 'test' })
     *   - 函数式：$patch((state) => { state.count++ })
     *
     * @param partialOrFn 要合并的部分状态 或 状态更新函数
     */
    $patch(partialOrFn: Partial<S> | ((state: S) => void)): void {
      if (disposed) {
        console.warn(`[Lyt Store] Store "${id}" 已销毁，无法更新。`);
        return;
      }

      if (isFunction(partialOrFn)) {
        // 函数式：直接在响应式状态上执行
        partialOrFn(reactiveState as S);
      } else {
        // 对象合并：使用 shared 的 mergeObjects
        mergeObjects(reactiveState as Record<string, unknown>, partialOrFn as Record<string, unknown>);
      }
    },

    /**
     * 安装插件
     *
     * 调用插件的 install 方法，传入 store 实例。
     * 如果 install 返回卸载函数，则记录用于后续卸载。
     *
     * @param plugin Store 插件
     * @returns 卸载插件的函数
     */
    use(plugin: StorePlugin): () => void {
      if (disposed) {
        console.warn(`[Lyt Store] Store "${id}" 已销毁，无法安装插件。`);
        return () => {};
      }

      const uninstall = plugin.install(storeApi);
      return () => {
        if (typeof uninstall === 'function') {
          uninstall();
        }
      };
    },

    /**
     * 拦截 action 调用
     *
     * 在每次 action 调用前触发回调，可用于日志记录、性能监控等。
     *
     * @param callback 拦截回调
     * @returns 取消订阅的函数
     */
    $onAction(callback: (action: { name: string, args: any[] }) => void): () => void {
      if (disposed) {
        console.warn(`[Lyt Store] Store "${id}" 已销毁，无法注册 action 拦截器。`);
        return () => {};
      }

      actionCallbacks.push(callback);

      return () => {
        const index = actionCallbacks.indexOf(callback);
        if (index !== -1) {
          actionCallbacks.splice(index, 1);
        }
      };
    },
  };

  // 7. 注册到全局 Store 注册表
  storeMap.set(id, storeApi);

  // 8. 返回工厂函数（调用时返回同一个 Store 实例）
  return () => storeApi;
}

/**
 * 获取所有已注册的 Store ID 列表
 *
 * @returns Store ID 数组
 */
export function getStoreIds(): string[] {
  return Array.from(storeMap.keys());
}

/**
 * 清除所有已注册的 Store（仅用于测试）
 *
 * 销毁所有 Store 实例并清空注册表。
 * 在测试环境的 afterEach 中调用以避免状态污染。
 */
export function clearAllStores(): void {
  for (const [id, store] of storeMap) {
    store.$dispose();
  }
  storeMap.clear();
}
