/**
 * @lytjs/middleware-rate-limit 测试
 */
import { describe, it, expect } from 'vitest';
import { createRateLimitMiddleware } from '../src';
import { createMiddlewareChain } from '@lytjs/middleware';

const baseCtx = (clientIp: string) => ({
  params: {},
  query: new URLSearchParams(),
  clientIp,
});

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

      const response1 = await chain.execute(request, baseCtx('10.0.0.1'), () => new Response('OK'));
      const response2 = await chain.execute(request, baseCtx('10.0.0.1'), () => new Response('OK'));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('应该对超出限制的请求返回 429', async () => {
      const middleware = createRateLimitMiddleware({ max: 1, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com');

      const response1 = await chain.execute(request, baseCtx('10.0.0.2'), () => new Response('OK'));
      const response2 = await chain.execute(request, baseCtx('10.0.0.2'), () => new Response('OK'));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(429);
    });
  });

  // ============================================================
  // P1-3 回归（2026-10-10）
  // ============================================================
  describe('键来源必须按客户端隔离（P1-3 回归）', () => {
    it('不同 clientIp 各自计数，互不影响（原实现所有客户端共用一个桶）', async () => {
      const middleware = createRateLimitMiddleware({ max: 1, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const request = new Request('https://example.com');

      const a1 = await chain.execute(request, baseCtx('10.0.0.3'), () => new Response('OK'));
      const a2 = await chain.execute(request, baseCtx('10.0.0.3'), () => new Response('OK'));
      const b1 = await chain.execute(request, baseCtx('10.0.0.4'), () => new Response('OK'));

      expect(a1.status).toBe(200);
      expect(a2.status).toBe(429);
      // B 客户端不应被 A 的用量波及 —— 这正是原实现（key 恒为 'unknown'）会出错的地方
      expect(b1.status).toBe(200);
    });

    it('默认不信任 x-forwarded-for（伪造转发头不能绕过限流）', async () => {
      const middleware = createRateLimitMiddleware({ max: 1, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const withHeader = (ip: string) =>
        new Request('https://example.com', { headers: { 'x-forwarded-for': ip } });

      const r1 = await chain.execute(
        withHeader('1.1.1.1'),
        baseCtx('10.0.0.5'),
        () => new Response('OK'),
      );
      const r2 = await chain.execute(
        withHeader('2.2.2.2'),
        baseCtx('10.0.0.5'),
        () => new Response('OK'),
      );

      // 同一个真实来源换了假 XFF ⇒ 仍然算同一个桶 ⇒ 第二次被限
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(429);
    });

    it('trustProxy:true 时才读转发头，且取完整的首个 IP（原实现取到首字符 "1"）', async () => {
      const middleware = createRateLimitMiddleware({ max: 1, windowMs: 60000, trustProxy: true });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const req = (xff: string) =>
        new Request('https://example.com', { headers: { 'x-forwarded-for': xff } });
      const ctx = { params: {}, query: new URLSearchParams() };

      // 同一个 XFF 前缀但不同完整值 ⇒ 必须被当成**不同**来源（否则说明只取了首字符）
      const r1 = await chain.execute(req('1.1.1.1, 9.9.9.9'), ctx, () => new Response('OK'));
      const r2 = await chain.execute(req('1.1.1.2, 9.9.9.9'), ctx, () => new Response('OK'));

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
    });

    it('无法确定来源时应抛错（而不是静默退化成全局桶）', async () => {
      const middleware = createRateLimitMiddleware({ max: 5, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      await expect(
        chain.execute(
          new Request('https://example.com'),
          { params: {}, query: new URLSearchParams() },
          () => new Response('OK'),
        ),
      ).rejects.toThrow(/无法确定请求来源/);
    });
  });

  describe('成功响应上的 X-RateLimit-* 头（原实现是死代码）', () => {
    it('通过中间件链时应写入 X-RateLimit-* 头', async () => {
      const middleware = createRateLimitMiddleware({ max: 3, windowMs: 60000 });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const response = await chain.execute(
        new Request('https://example.com'),
        baseCtx('10.0.0.6'),
        () => new Response('OK'),
      );

      expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });
  });
});
