// packages/ecosystem/packages/di/src/index.ts
// 通用依赖注入系统 - 主入口

// 类型
export type {
  ProviderLifecycle,
  ProviderConfig,
  ProviderRecord,
  EnhancedInjectOptions,
} from './types';

// InjectionToken
export { InjectionToken, isInjectionToken } from './token';

// 错误
export { InjectionError, isProviderConfig } from './errors';

// 生命周期作用域
export {
  setProviderScopeFactory,
  getProviderScopeFactory,
} from './scope';
export type { ProviderScope, ProviderScopeFactory } from './scope';

// Provider 树
export {
  createProviderNode,
  getProviderRoot,
  getActiveProviderRoot,
  enterProviderScope,
  exitProviderScope,
  getCurrentProviderNode,
  withProviderScope,
  resetProviderScope,
} from './provider-tree';
export type { ProviderNode } from './provider-tree';

// 依赖解析器
export {
  resolveKey,
  createProviderRecord,
  provideToNode,
  provideValue,
  injectFromNode,
  injectValue,
} from './resolver';