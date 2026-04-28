/**
 * @lytjs/plugin-pinia — 统一导出入口
 *
 * 提供 Pinia 兼容的 API，基于 @lytjs/store 包装。
 *
 * 导出内容：
 * - createPinia — 创建 Pinia 实例
 * - defineStore — 定义 Store
 * - setActivePinia / getActivePinia — 管理活跃 Pinia 实例
 * - mapState / mapGetters / mapActions / mapWritableState — 辅助函数
 * - storeToRefs — 将 store 转换为 refs
 */

// ============================================================
// Pinia 核心
// ============================================================

export {
  createPinia,
  setActivePinia,
  getActivePinia,
} from './pinia';

export type {
  Pinia,
  PiniaPlugin,
} from './pinia';

// ============================================================
// Store 核心
// ============================================================

export type {
  PiniaStore as Store,
  DefineStoreOptions,
  StoreSubscriptionCallback,
  StoreSubscriptionCallbackArgument,
} from './store';

import { getActivePinia } from './pinia';
import { createOptionsStore, createSetupStore } from './store';
import type { PiniaStore, DefineStoreOptions } from './store';
import { isRef, toRef, isReactive } from '@lytjs/reactivity';

// ============================================================
// defineStore
// ============================================================

/**
 * 定义 Store
 *
 * 支持两种写法：
 *
 * 1. Setup Store（组合式写法）：
 * ```ts
 * const useCounterStore = defineStore('counter', () => {
 *   const count = ref(0)
 *   const doubleCount = computed(() => count.value * 2)
 *   function increment() { count.value++ }
 *   return { count, doubleCount, increment }
 * })
 * ```
 *
 * 2. Options Store（选项式写法）：
 * ```ts
 * const useCounterStore = defineStore('counter', {
 *   state: () => ({ count: 0 }),
 *   getters: {
 *     doubleCount: (state) => state.count * 2,
 *   },
 *   actions: {
 *     increment() { this.count++ },
 *   },
 * })
 * ```
 *
 * @param idOrOptions - Store ID 或 Store 选项
 * @param setup - Setup 函数（当第一个参数为 ID 字符串时使用）
 * @returns Store 工厂函数
 */
export function defineStore<
  Id extends string,
  S extends Record<string, any>,
  G extends Record<string, any>,
  A extends Record<string, (...args: any[]) => any>
>(
  idOrOptions: Id | DefineStoreOptions<Id, S, G, A>,
  setup?: () => S | PiniaStore<Id, S, G, A>
): () => PiniaStore<Id, S, G, A> {
  let id: string;
  let options: DefineStoreOptions<Id, S, G, A> | undefined;
  let setupFn: (() => any) | undefined;

  if (typeof idOrOptions === 'string') {
    // defineStore('id', setup) 或 defineStore('id', options)
    id = idOrOptions;
    if (typeof setup === 'function') {
      setupFn = setup;
    } else if (setup && typeof setup === 'object') {
      options = setup as DefineStoreOptions<Id, S, G, A>;
    }
  } else {
    // defineStore({ id, state, getters, actions })
    id = (idOrOptions as any).id;
    options = idOrOptions as DefineStoreOptions<Id, S, G, A>;
  }

  // 返回工厂函数
  return (): PiniaStore<Id, S, G, A> => {
    const pinia = getActivePinia();

    // 检查是否已存在
    const existing = pinia._s.get(id);
    if (existing) {
      return existing as PiniaStore<Id, S, G, A>;
    }

    // 创建新 Store
    if (setupFn) {
      return createSetupStore(id as Id, setupFn, pinia) as PiniaStore<Id, S, G, A>;
    } else if (options) {
      return createOptionsStore(id as Id, options, pinia) as PiniaStore<Id, S, G, A>;
    } else {
      throw new Error(`[plugin-pinia] defineStore("${id}"): 缺少 setup 函数或 options 配置。`);
    }
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * mapState — 将 Store 的 state 属性映射为 computed 属性
 *
 * @param storeId - Store ID
 * @param map - 属性映射对象或函数数组
 * @returns 映射后的对象
 *
 * @example
 * ```ts
 * import { mapState } from '@lytjs/plugin-pinia'
 *
 * export default {
 *   computed: {
 *     ...mapState('counter', {
 *       count: (state) => state.count,
 *       name: (state) => state.name,
 *     }),
 *   },
 * }
 * ```
 */
export function mapState(
  storeId: string,
  map: Record<string, (state: any) => any> | string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  if (Array.isArray(map)) {
    // 数组形式：mapState('counter', ['count', 'name'])
    for (const key of map) {
      result[key] = function () {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapState: Store "${storeId}" 不存在`);
          return undefined;
        }
        return store.$state[key];
      };
    }
  } else {
    // 对象形式：mapState('counter', { count: state => state.count })
    for (const key of Object.keys(map)) {
      result[key] = function () {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapState: Store "${storeId}" 不存在`);
          return undefined;
        }
        return map[key](store.$state);
      };
    }
  }

  return result;
}

/**
 * mapGetters — 将 Store 的 getters 映射为 computed 属性
 *
 * @param storeId - Store ID
 * @param map - getter 映射对象或数组
 * @returns 映射后的对象
 *
 * @example
 * ```ts
 * import { mapGetters } from '@lytjs/plugin-pinia'
 *
 * export default {
 *   computed: {
 *     ...mapGetters('counter', ['doubleCount']),
 *     // 或
 *     ...mapGetters('counter', {
 *       double: 'doubleCount',
 *     }),
 *   },
 * }
 * ```
 */
export function mapGetters(
  storeId: string,
  map: Record<string, string> | string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  if (Array.isArray(map)) {
    for (const key of map) {
      result[key] = function () {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapGetters: Store "${storeId}" 不存在`);
          return undefined;
        }
        return (store as any)[key];
      };
    }
  } else {
    for (const alias of Object.keys(map)) {
      const getterKey = map[alias];
      result[alias] = function () {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapGetters: Store "${storeId}" 不存在`);
          return undefined;
        }
        return (store as any)[getterKey];
      };
    }
  }

  return result;
}

/**
 * mapActions — 将 Store 的 actions 映射为 methods
 *
 * @param storeId - Store ID
 * @param map - action 映射对象或数组
 * @returns 映射后的对象
 *
 * @example
 * ```ts
 * import { mapActions } from '@lytjs/plugin-pinia'
 *
 * export default {
 *   methods: {
 *     ...mapActions('counter', ['increment', 'decrement']),
 *     // 或
 *     ...mapActions('counter', {
 *       inc: 'increment',
 *     }),
 *   },
 * }
 * ```
 */
export function mapActions(
  storeId: string,
  map: Record<string, string> | string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  if (Array.isArray(map)) {
    for (const key of map) {
      result[key] = function (...args: any[]) {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapActions: Store "${storeId}" 不存在`);
          return;
        }
        return (store as any)[key](...args);
      };
    }
  } else {
    for (const alias of Object.keys(map)) {
      const actionKey = map[alias];
      result[alias] = function (...args: any[]) {
        const pinia = getActivePinia();
        const store = pinia._s.get(storeId);
        if (!store) {
          console.warn(`[plugin-pinia] mapActions: Store "${storeId}" 不存在`);
          return;
        }
        return (store as any)[actionKey](...args);
      };
    }
  }

  return result;
}

/**
 * mapWritableState — 将 Store 的 state 属性映射为可写的 computed 属性
 *
 * @param storeId - Store ID
 * @param map - 属性映射对象或数组
 * @returns 映射后的对象
 *
 * @example
 * ```ts
 * import { mapWritableState } from '@lytjs/plugin-pinia'
 *
 * export default {
 *   computed: {
 *     ...mapWritableState('counter', {
 *       count: (state) => state.count,
 *     }),
 *   },
 * }
 * ```
 */
export function mapWritableState(
  storeId: string,
  map: Record<string, (state: any) => any> | string[]
): Record<string, any> {
  const result: Record<string, any> = {};

  if (Array.isArray(map)) {
    for (const key of map) {
      result[key] = {
        get() {
          const pinia = getActivePinia();
          const store = pinia._s.get(storeId);
          if (!store) {
            console.warn(`[plugin-pinia] mapWritableState: Store "${storeId}" 不存在`);
            return undefined;
          }
          return store.$state[key];
        },
        set(value: any) {
          const pinia = getActivePinia();
          const store = pinia._s.get(storeId);
          if (!store) {
            console.warn(`[plugin-pinia] mapWritableState: Store "${storeId}" 不存在`);
            return;
          }
          store.$state[key] = value;
        },
      };
    }
  } else {
    for (const key of Object.keys(map)) {
      result[key] = {
        get() {
          const pinia = getActivePinia();
          const store = pinia._s.get(storeId);
          if (!store) {
            console.warn(`[plugin-pinia] mapWritableState: Store "${storeId}" 不存在`);
            return undefined;
          }
          return map[key](store.$state);
        },
        set(value: any) {
          const pinia = getActivePinia();
          const store = pinia._s.get(storeId);
          if (!store) {
            console.warn(`[plugin-pinia] mapWritableState: Store "${storeId}" 不存在`);
            return;
          }
          store.$patch({ [key]: value } as any);
        },
      };
    }
  }

  return result;
}

/**
 * storeToRefs — 将 Store 的 state 和 getters 转换为 refs
 *
 * 从 Store 中提取 ref 属性，保持响应性。
 * 不包含 actions（函数）。
 *
 * @param store - Store 实例
 * @returns 包含所有 ref 属性的对象
 *
 * @example
 * ```ts
 * import { storeToRefs } from '@lytjs/plugin-pinia'
 *
 * const store = useCounterStore()
 * const { count, doubleCount } = storeToRefs(store)
 * // count 和 doubleCount 都是 ref，可以安全地解构
 * ```
 */
export function storeToRefs(store: PiniaStore): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key of Object.keys(store)) {
    if (key === '$id' || key === '$state' || key === '_p') continue;

    const value = (store as any)[key];

    // 跳过函数（actions）
    if (typeof value === 'function') continue;

    // 跳过 $ 开头的内部方法
    if (key.startsWith('$')) continue;

    // 为每个属性创建 ref
    result[key] = toRef(store as any, key);
  }

  return result;
}
