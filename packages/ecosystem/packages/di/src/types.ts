// packages/ecosystem/packages/di/src/types.ts
// 通用依赖注入 - 类型定义

import type { InjectionToken } from './token';

/** Provider 生命周期类型 */
export type ProviderLifecycle = 'singleton' | 'scoped' | 'transient';

/** Provider 配置 */
export interface ProviderConfig<T = unknown> {
  /** 提供的值 */
  provide?: T;
  /** 工厂函数 */
  useFactory?: () => T;
  /** 现有令牌别名 */
  useExisting?: InjectionToken<T> | string | symbol;
  /** 生命周期 */
  lifecycle?: ProviderLifecycle;
  /** 是否可选 */
  optional?: boolean;
}

/** Provider 记录 */
export interface ProviderRecord {
  value: unknown;
  lifecycle: ProviderLifecycle;
  scope?: unknown;
  instanceId?: symbol;
}

/** 增强的 Inject 选项 */
export interface EnhancedInjectOptions<T = unknown> {
  /** 是否可选（找不到时不报错） */
  optional?: boolean;
  /** 默认值 */
  default?: T | (() => T);
  /** 从特定祖先查找 */
  from?: InjectionToken<T> | string | symbol;
  /** 是否仅查找当前层级 */
  local?: boolean;
  /** 是否跳过自身（仅查找祖先） */
  skipSelf?: boolean;
}