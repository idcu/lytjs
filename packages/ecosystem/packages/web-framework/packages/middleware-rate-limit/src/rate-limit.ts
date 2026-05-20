/**
 * 限流中间件实现
 */
import type { RateLimitOptions, RateLimitInfo } from './types';
import type { Middleware, MiddlewareContext } from '@lytjs/middleware';
import { createRateLimiter, SlidingWindowLimiter } from '@lytjs/common-rate-limit';

/**
 * 创建限流中间件
 * 
 * @param options - 限流配置选项
 * @returns 限流中间件函数
 */
export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const limiter = createRateLimiter({ 
    max: options.max, 
    windowMs: options.windowMs 
  });
  const keyGenerator = options.keyGenerator || ((request: Request, ctx: MiddlewareContext) => request.headers.get('x-forwarded-for') || 'unknown');

  return async (request: Request, ctx: MiddlewareContext, next: () => Promise<void>) => {
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
      const headers = new Headers({
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(info.reset),
        'Retry-After': String(Math.ceil((result.reset - now) / 1000)),
        'Content-Type': 'application/json',
      });
      
      return new Response(JSON.stringify({ error: '请求过多' }), {
        status: 429,
        headers,
      });
    }

    await next();
    
    if (ctx.response) {
      const newResponse = new Response(ctx.response.body, ctx.response);
      newResponse.headers.set('X-RateLimit-Limit', String(info.limit));
      newResponse.headers.set('X-RateLimit-Remaining', String(info.remaining));
      newResponse.headers.set('X-RateLimit-Reset', String(info.reset));
      
      return newResponse;
    }
  };
}
