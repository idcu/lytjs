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
  /**
   * 工厂函数（`useFactory` 声明时）。
   *
   * ⚠️ 2026-11-03 修（P0）：此前 `createProviderRecord` 在**provide 时**就把工厂调用了，
   *   把结果塞进 `value`。于是：
   *   · `lifecycle: 'transient'` **永远不生效** —— 判断条件是 `typeof value === 'function'`，
   *     而 value 已经是求值结果 ⇒ 实测两次注入拿到同一个值（`t1=1 t2=1`）；
   *   · 工厂在 provide 时执行，而不是在被注入时 ⇒ 无法做懒加载。
   *   现在保留工厂本身，由 `injectFromNode` 按 lifecycle 决定「求值一次并缓存」还是「每次都求值」。
   */
  factory?: () => unknown;
  /**
   * 别名目标（`useExisting` 声明时）。
   *
   * ⚠️ 2026-11-03 修（P0）：此前 `useExisting` 在 provide 时调用 `resolveAlias`，
   *   而所有公开调用点（`provideValue` / `provideToNode`）都**没传** resolver
   *   ⇒ 别名被解析成 `undefined` ⇒ 注入时表现为 "No provider found"。
   *   实测：`provideToNode(root, 'alias', { useExisting: 'base' })` 后
   *   `injectValue('alias')` 直接抛 `InjectionError`。
   *
   *   现在改为**读时解析**（也让「先声明别名、后提供目标」能正常工作），
   *   并带环路检测。
   */
  alias?: string | symbol;
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
