/**
 * @lytjs/devtools - Store 状态检查器
 */

import type { StoreStateInfo } from './types';
import { isObject, isFunction } from '@lytjs/common-is';

// Store 注册表
const storeRegistry = new Map<string, any>();

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
 * 清空所有注册的 Store（用于测试）
 */
export function clearStoreRegistry(): void {
  storeRegistry.clear();
}

/**
 * 获取已注册的 Store ID 列表
 */
export function getRegisteredStoreIds(): string[] {
  return Array.from(storeRegistry.keys());
}
