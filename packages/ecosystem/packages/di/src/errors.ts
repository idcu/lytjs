// packages/ecosystem/packages/di/src/errors.ts
// 通用依赖注入 - 错误类型

/**
 * 注入错误
 */
export class InjectionError extends Error {
  constructor(
    public token: string | symbol,
    message: string,
  ) {
    super(`Injection error for token "${String(token)}": ${message}`);
    this.name = 'InjectionError';
  }
}

/**
 * 检查是否是 ProviderConfig（指认配置对象）
 */
export function isProviderConfig<T>(value: unknown): value is import('./types').ProviderConfig<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('provide' in value || 'useFactory' in value || 'useExisting' in value || 'lifecycle' in value)
  );
}