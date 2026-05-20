/**
 * 中间件工具函数
 */

import { MiddlewareFn, MiddlewareContext } from './types';

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
    const index = 0;

    const dispatch = async (i: number): Promise<void> => {
      if (i >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[i];
      await middleware(ctx, () => dispatch(i + 1));
    };

    await dispatch(index);
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
