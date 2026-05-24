/**
 * 限流中间件实现
 */
import type { RateLimitOptions, RateLimitInfo } from './types';
import type { Middleware, MiddlewareContext } from '@lytjs/middleware';
import { createRateLimiter } from '@lytjs/common-rate-limit';

/**
 * 创建限流中间件
 *
 * @param options - 限流配置选项
 * @returns 限流中间件函数
 */
export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const limiter = createRateLimiter({
    max: options.max,
    windowMs: options.windowMs,
  });
  const keyGenerator =
    options.keyGenerator ||
    ((request: unknown, _ctx: MiddlewareContext) => {
      const req = request as Record<string, unknown>;
      const headers = req.headers as Record<string, string | string[]> | undefined;
      return headers?.['x-forwarded-for']?.[0] || 'unknown';
    }) as (request: unknown, ctx: MiddlewareContext) => string;

  return async (request: unknown, ctx: MiddlewareContext, next: () => Promise<void>) => {
    const key = keyGenerator(request, ctx);
    const now = Date.now();
    const result = limiter.check(key);

    const info: RateLimitInfo = {
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };

    ctx.rateLimit = info;

    if (!result.allowed) {
      const headers: Record<string, string | string[]> = {
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.reset),
        'Retry-After': String(Math.ceil((result.reset - now) / 1000)),
        'Content-Type': 'application/json',
      };

      return {
        status: 429,
        headers,
        body: JSON.stringify({ error: '请求过多' }),
      };
    }

    await next();

    if (ctx.response) {
      const newResponse = { ...ctx.response } as Record<string, unknown>;
      newResponse.headers = {
        ...(newResponse.headers as Record<string, string | string[]>),
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.reset),
      };

      return newResponse;
    }
  };
}
