/**
 * 中间件上下文实现
 */

import { MiddlewareContext } from './types';

/**
 * 创建新的中间件上下文
 */
export function createContext(request: Request, extra?: Record<string, unknown>): MiddlewareContext {
  return {
    request,
    ...extra,
  };
}

/**
 * 将额外数据合并到上下文中
 */
export function mergeContext(
  ctx: MiddlewareContext,
  data: Record<string, unknown>
): MiddlewareContext {
  return { ...ctx, ...data };
}
