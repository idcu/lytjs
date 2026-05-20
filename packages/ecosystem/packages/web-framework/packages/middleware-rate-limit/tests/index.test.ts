/**
 * @lytjs/middleware-rate-limit 测试
 */
import { describe, it, expect, vi } from 'vitest';
import { createRateLimitMiddleware } from '../src';
import { createMiddlewareChain } from '@lytjs/middleware';

describe('@lytjs/middleware-rate-limit', () => {
  describe('createRateLimitMiddleware', () => {
    it('应该创建一个限流中间件', () => {
      const middleware = createRateLimitMiddleware({ max: 5, windowMs: 60000 });
      expect(typeof middleware).toBe('function');
    });

    it('应该允许请求在限制范围内', async () => {
      const middleware = createRateLimitMiddleware({ max: 2, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com');
      const context = { params: {}, query: new URLSearchParams() };

      const response1 = await chain.execute(request, context, () => new Response('OK'));
      const response2 = await chain.execute(request, context, () => new Response('OK'));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('应该对超出限制的请求返回 429', async () => {
      const middleware = createRateLimitMiddleware({ max: 1, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com');
      const context = { params: {}, query: new URLSearchParams() };

      const response1 = await chain.execute(request, context, () => new Response('OK'));
      const response2 = await chain.execute(request, context, () => new Response('OK'));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(429);
    });
  });
});
