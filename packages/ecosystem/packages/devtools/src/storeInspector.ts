/**
 * @lytjs/devtools - Store 状态检查器
 */

import type { StoreStateInfo } from './types';
import { isObject, isFunction } from '@lytjs/common-is';
import { deepClone } from '@lytjs/common-object';

interface StoreInstance {
  $state?: Record<string, unknown>;
  $id?: string;
  $subscribe?: (cb: (mutation: unknown, state: Record<string, unknown>) => void) => () => void;
  [key: string]: unknown;
}

// Store 注册表
const storeRegistry = new Map<string, StoreInstance>();

// Store 变更订阅器 Map<storeId, unsubscribe 函数>
const subscribers = new Map<string, () => void>();

// 全局 Store 变更回调列表
const globalChangeCallbacks = new Set<(storeId: string, state: Record<string, unknown>) => void>();

/**
 * Store 变更回调类型
 */
type StoreChangeCallback = (storeId: string, state: Record<string, unknown>) => void;

/**
 * 注册 Store
 */
export function registerStore(id: string, store: StoreInstance): void {
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

    // ★ 2026-10-17 修复：`id` 必须用**注册键**。
    //   此前若 store 自带 `$id`，会用它覆盖注册键（注释还写着"提取 getters"，像是复制残留）。
    //   后果：`getStoreStates()` 返回的 id 与 `getStoreState()` 的 id **不一致**，
    //   而 `setStoreState` / `dispatchStoreAction` / `subscribeStore` 都只认**注册键**
    //   ⇒ 「列表 → 按 id 写值」这条最自然的用法会**静默失败**（实测：返回 false）。
    //   保留 `$id` 覆盖只会让列表里的 id 不可回写，故以注册键为准。

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
 * 路径中**禁止**出现的键 —— 原型链污染的三个经典入口。
 * `setStoreState` 的路径来自外部（devtools 面板 / 控制台 / 自动化脚本）⇒ 必须挡住。
 */
const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * 修改 Store 状态（用于开发时调试）
 *
 * ⚠️ **返回 `true` 当且仅当真的写进去了**。此前它有三类「谎报成功」：
 * ① 写的是 `store` **顶层**，而读状态读的是 `store.$state` ⇒ 值落到别处、读回来仍是旧值
 *    （Pinia 的 store 因为有代理才"看起来"生效，而 `{ $state: … }` 这种被本模块
 *    `getStoreStates` 明确支持的形态会直接失效）；
 * ② 空路径 / 中间段不存在 / 经过非对象时**照样返回 true**；
 * ③ 无原型污染防护：`__proto__.x` / `constructor.prototype.x` 会写到 `Object.prototype`。
 */
export function setStoreState(storeId: string, path: string, value: unknown): boolean {
  const store = storeRegistry.get(storeId);
  if (!store) return false;

  if (!path) return false;
  const keys = path.split('.');
  if (keys.some((k) => k === '' || FORBIDDEN_PATH_KEYS.has(k))) return false;

  // 与 `getStoreState` 用**同一个读源**
  const base: unknown = store.$state ?? store;
  let current: unknown = base;

  // 遍历到倒数第二个 key
  for (let i = 0; i < keys.length - 1; i++) {
    if (!isObject(current)) return false;
    current = (current as Record<string, unknown>)[keys[i]!];
  }

  // 设置最终值
  const lastKey = keys[keys.length - 1]!;
  if (!isObject(current)) return false;

  try {
    (current as Record<string, unknown>)[lastKey] = value;
  } catch {
    // 冻结对象 / 只读属性 ⇒ 明确失败
    return false;
  }

  return true;
}

/**
 * 触发 Store Action
 */
export function dispatchStoreAction(
  storeId: string,
  actionName: string,
  ...args: unknown[]
): unknown {
  const store = storeRegistry.get(storeId);
  if (!store) return null;

  const action = (store as Record<string, unknown>)[actionName];
  if (!isFunction(action)) {
    throw new Error(`Action "${actionName}" not found in store "${storeId}"`);
  }

  return (action as (...args: unknown[]) => unknown).apply(store, args);
}

/**
 * 序列化 Store 状态为字符串
 */
export function serializeStoreStates(states: StoreStateInfo[]): string {
  return JSON.stringify(states, null, 2);
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
    const unsubscribe = store.$subscribe?.((_mutation: unknown, state: Record<string, unknown>) => {
      const currentState = isObject(state) ? deepClone<Record<string, unknown>>(state) : {};
      globalChangeCallbacks.forEach((cb) => cb(storeId, currentState));
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
