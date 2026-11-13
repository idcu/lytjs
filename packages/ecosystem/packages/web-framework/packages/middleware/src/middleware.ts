/**
 * 中间件工具函数
 */

import type { MiddlewareFn, MiddlewareContext } from './types';

/**
 * 创建中间件函数
 */
export function createMiddleware(fn: MiddlewareFn): MiddlewareFn {
  return fn;
}

/**
 * 将多个中间件合并为一个
 */
export function combineMiddlewares(...middlewares: MiddlewareFn[]): MiddlewareFn {
  return async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    const dispatch = async (i: number): Promise<void> => {
      if (i >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[i];
      if (!middleware) {
        return dispatch(i + 1);
      }

      // ⚠️ 2026-11-13 修（P1）：此前每次调用 `next()` 都重新 `dispatch(i + 1)` ——
      //   同一个中间件重复调用 `next()` 会**重复执行**下游中间件与终点
      //   （响应重复写、数据库重复提交）。现在按层记忆：第二次拿到同一个 Promise。
      let downstream: Promise<void> | undefined;
      await middleware(ctx, () => (downstream ??= dispatch(i + 1)));
    };

    await dispatch(0);
  };
}

/**
 * 条件中间件执行
 */
export function conditionalMiddleware(
  condition: (ctx: MiddlewareContext) => boolean,
  middleware: MiddlewareFn,
  fallback?: MiddlewareFn,
): MiddlewareFn {
  return async (ctx: MiddlewareContext, next: () => Promise<void>) => {
    if (condition(ctx)) {
      return middleware(ctx, next);
    } else if (fallback) {
      return fallback(ctx, next);
    }
    return next();
  };
}
