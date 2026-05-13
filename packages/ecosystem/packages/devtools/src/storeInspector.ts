/**
 * @lytjs/devtools - Store 状态检查器
 */

import type { StoreStateInfo } from './types';
import { isObject, isFunction } from '@lytjs/common-is';

// Store 注册表
const storeRegistry = new Map<string, any>();

// Store 变更订阅器 Map<storeId, unsubscribe 函数>
const subscribers = new Map<string, () => void>();

// 全局 Store 变更回调列表
const globalChangeCallbacks = new Set<(storeId: string, state: Record<string, any>) => void>();

/**
 * Store 变更回调类型
 */
type StoreChangeCallback = (storeId: string, state: Record<string, any>) => void;

/**
 * 注册 Store
 */
export function registerStore(id: string, store: any): void {
  storeRegistry.set(id, store);
}

/**
 * 注销 Store
 */
export function unregisterStore(id: string): void {
  storeRegistry.delete(id);
}

/**
 * 获取所有 Store 状态
 */
export function getStoreStates(): StoreStateInfo[] {
  const states: StoreStateInfo[] = [];
  
  for (const [id, store] of storeRegistry.entries()) {
    const stateInfo: StoreStateInfo = {
      id,
      state: {},
    };

    // 提取 state
    if (store.$state) {
      stateInfo.state = deepClone(store.$state);
    } else if (isObject(store)) {
      // 提取非函数属性作为 state
      for (const [key, value] of Object.entries(store)) {
        if (!key.startsWith('$') && !isFunction(value)) {
          stateInfo.state[key] = deepClone(value);
        }
      }
    }

    // 提取 getters
    if (store.$id) {
      stateInfo.id = store.$id;
    }

    states.push(stateInfo);
  }

  return states;
}

/**
 * 获取特定 Store 的状态
 */
export function getStoreState(storeId: string): StoreStateInfo | null {
  const store = storeRegistry.get(storeId);
  if (!store) return null;

  const stateInfo: StoreStateInfo = {
    id: storeId,
    state: {},
  };

  if (store.$state) {
    stateInfo.state = deepClone(store.$state);
  } else if (isObject(store)) {
    for (const [key, value] of Object.entries(store)) {
      if (!key.startsWith('$') && !isFunction(value)) {
        stateInfo.state[key] = deepClone(value);
      }
    }
  }

  return stateInfo;
}

/**
 * 修改 Store 状态（用于开发时调试）
 */
export function setStoreState(storeId: string, path: string, value: any): boolean {
  const store = storeRegistry.get(storeId);
  if (!store) return false;

  const keys = path.split('.');
  let current: any = store.$state || store;

  // 遍历到倒数第二个 key
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!isObject(current[key])) {
      return false;
    }
    current = current[key];
  }

  // 设置最终值
  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }

  return true;
}

/**
 * 触发 Store Action
 */
export function dispatchStoreAction(storeId: string, actionName: string, ...args: any[]): any {
  const store = storeRegistry.get(storeId);
  if (!store) return null;

  const action = store[actionName];
  if (!isFunction(action)) {
    throw new Error(`Action "${actionName}" not found in store "${storeId}"`);
  }

  return action.apply(store, args);
}

/**
 * 序列化 Store 状态为字符串
 */
export function serializeStoreStates(states: StoreStateInfo[]): string {
  return JSON.stringify(states, null, 2);
}

/**
 * 深度克隆（简化版）
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (isObject(obj)) {
    const cloned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = deepClone(value);
    }
    return cloned as T;
  }

  return obj;
}

/**
 * 订阅 Store 变更
 *
 * @description
 * 当 Store 的 $subscribe 方法可用时自动监听变更，
 * 变更时会触发所有通过 onStoreChange 注册的全局回调
 *
 * @param storeId - 要订阅的 Store ID
 * @returns 是否订阅成功
 */
export function subscribeStore(storeId: string): boolean {
  const store = storeRegistry.get(storeId);
  if (!store) return false;

  // 如果已经订阅，先取消旧订阅
  if (subscribers.has(storeId)) {
    unsubscribeStore(storeId);
  }

  // 优先使用 $subscribe 方法（Pinia 风格）
  if (isFunction(store.$subscribe)) {
    const unsubscribe = store.$subscribe((mutation: any, state: any) => {
      const currentState = isObject(state) ? deepClone(state) : {};
      globalChangeCallbacks.forEach(cb => cb(storeId, currentState));
    });
    subscribers.set(storeId, isFunction(unsubscribe) ? unsubscribe : () => {});
    return true;
  }

  // 降级方案：如果 Store 本身是响应式的，无法自动监听
  return false;
}

/**
 * 取消订阅 Store 变更
 *
 * @param storeId - 要取消订阅的 Store ID
 */
export function unsubscribeStore(storeId: string): void {
  const unsubscribe = subscribers.get(storeId);
  if (unsubscribe) {
    unsubscribe();
    subscribers.delete(storeId);
  }
}

/**
 * 注册全局 Store 变更回调
 *
 * @description
 * 当任何已订阅的 Store 发生变更时，会调用此回调
 *
 * @param callback - 变更回调函数，接收 storeId 和当前 state
 * @returns 取消注册的函数
 */
export function onStoreChange(callback: StoreChangeCallback): () => void {
  globalChangeCallbacks.add(callback);
  return () => {
    globalChangeCallbacks.delete(callback);
  };
}

/**
 * 清空所有注册的 Store（用于测试）
 */
export function clearStoreRegistry(): void {
  // 取消所有订阅
  for (const storeId of subscribers.keys()) {
    unsubscribeStore(storeId);
  }
  globalChangeCallbacks.clear();
  storeRegistry.clear();
}

/**
 * 获取已注册的 Store ID 列表
 */
export function getRegisteredStoreIds(): string[] {
  return Array.from(storeRegistry.keys());
}
