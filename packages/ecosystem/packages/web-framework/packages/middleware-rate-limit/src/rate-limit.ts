import type { RateLimitOptions, RateLimitInfo } from './types';
import type { MiddlewareFunction, MiddlewareContext } from '@lytjs/middleware';
import { createRateLimiter, SlidingWindowLimiter } from '@lytjs/common-rate-limit';

export function createRateLimitMiddleware(options: RateLimitOptions): MiddlewareFunction {
  const limiter = createRateLimiter({ 
    max: options.max, 
    windowMs: options.windowMs 
  });
  const keyGenerator = options.keyGenerator || ((request: Request, ctx: MiddlewareContext) => request.headers.get('x-forwarded-for') || 'unknown');

  return async (request: Request, ctx: MiddlewareContext, next: () => Promise<Response | null | undefined>) => {
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
      
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers,
      });
    }

    const response = await next();
    
    if (response instanceof Response) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', String(info.limit));
      newHeaders.set('X-RateLimit-Remaining', String(info.remaining));
      newHeaders.set('X-RateLimit-Reset', String(info.reset));
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    
    return response;
  };
}
