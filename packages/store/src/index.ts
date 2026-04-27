/**
 * Lyt.js 状态管理 — 统一导出入口
 *
 * 导出所有公共 API 和类型定义。
 * 纯原生零依赖实现。
 */

// ============================================================
// Store 创建
// ============================================================

export { createStore, getStore, getStoreIds, clearAllStores } from './create-store';

export type {
  StoreOptions,
  StoreApi,
  SubscriptionCallback,
  SubscriptionCallbackArgument,
  ModuleOptions,
  StorePlugin,
} from './create-store';
