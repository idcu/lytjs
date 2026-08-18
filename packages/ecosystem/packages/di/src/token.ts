// packages/ecosystem/packages/di/src/token.ts
// 通用依赖注入 - InjectionToken 类型安全注入令牌

import type { ProviderLifecycle } from './types';

/**
 * InjectionToken - 类型安全的注入令牌
 *
 * 与 InjectionKey 不同，InjectionToken 是一个类实例，
 * 可以携带更多元数据（如描述、工厂函数、生命周期等）
 *
 * @example
 * ```ts
 * const API_URL = new InjectionToken<string>('api-url');
 * const Database = new InjectionToken<Database>('database', {
 *   factory: () => new Database(),
 *   lifecycle: 'singleton',
 * });
 * ```
 */
export class InjectionToken<T> {
  /** 令牌描述 */
  readonly description: string;
  /** 令牌唯一标识 */
  readonly __token: symbol;
  /** 工厂函数 */
  readonly factory?: () => T;
  /** 生命周期 */
  readonly lifecycle?: ProviderLifecycle;

  constructor(
    description: string,
    options?: {
      factory?: () => T;
      lifecycle?: ProviderLifecycle;
    },
  ) {
    this.description = description;
    this.__token = Symbol(description);
    this.factory = options?.factory;
    this.lifecycle = options?.lifecycle;
  }

  toString(): string {
    return `InjectionToken(${this.description})`;
  }
}

/**
 * 判断是否是 InjectionToken
 */
export function isInjectionToken(value: unknown): value is InjectionToken<unknown> {
  return value instanceof InjectionToken;
}