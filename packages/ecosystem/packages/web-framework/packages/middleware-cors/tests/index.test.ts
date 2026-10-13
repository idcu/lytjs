/**
 * @lytjs/middleware-cors 测试
 */
import { describe, it, expect } from 'vitest';
import { createCorsMiddleware } from '../src';
import { createMiddlewareChain } from '@lytjs/middleware';

describe('@lytjs/middleware-cors', () => {
  describe('createCorsMiddleware', () => {
    it('应该创建一个 CORS 中间件', () => {
      const middleware = createCorsMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('应该设置默认的 CORS 头', async () => {
      const middleware = createCorsMiddleware();
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com');
      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(response).toBeInstanceOf(Response);
    });

    it('应该处理 OPTIONS 预检请求', async () => {
      const middleware = createCorsMiddleware();
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://test.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(response.status).toBe(204);
    });

    it('应该支持自定义 origin 配置', async () => {
      const middleware = createCorsMiddleware({ origin: 'https://allowed.com' });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com', {
        headers: { Origin: 'https://allowed.com' },
      });

      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.com');
    });
  });

  // ============================================================
  // P1-5 安全回归（2026-10-10）
  // ============================================================
  describe('credentials 与任意源的组合必须被拦住（P1-5 回归）', () => {
    it('credentials:true + origin:true（镜像任意源）应构造期抛错', () => {
      expect(() => createCorsMiddleware({ origin: true, credentials: true })).toThrow(
        /credentials.*origin: true|镜像任意源/,
      );
    });

    it("credentials:true + origin:'*' 应构造期抛错（浏览器必然拒绝的组合）", () => {
      expect(() => createCorsMiddleware({ origin: '*', credentials: true })).toThrow(/credentials/);
    });

    it('credentials:true 但未指定 origin（默认 "*"）也应抛错', () => {
      expect(() => createCorsMiddleware({ credentials: true })).toThrow(/credentials/);
    });

    it('credentials:true + 显式白名单数组应正常工作', async () => {
      const middleware = createCorsMiddleware({
        origin: ['https://ok.com'],
        credentials: true,
      });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const response = await chain.execute(
        new Request('https://api.com', { headers: { Origin: 'https://ok.com' } }),
        { params: {}, query: new URLSearchParams() },
        () => new Response('OK'),
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://ok.com');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('白名单外的来源不写任何 CORS 头（而不是写空串）', async () => {
      const middleware = createCorsMiddleware({ origin: ['https://ok.com'], credentials: true });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const response = await chain.execute(
        new Request('https://api.com', { headers: { Origin: 'https://evil.com' } }),
        { params: {}, query: new URLSearchParams() },
        () => new Response('OK'),
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });
  });

  describe('Vary: Origin（缓存正确性）', () => {
    it('origin:true 镜像请求源时必须带 Vary: Origin', async () => {
      const middleware = createCorsMiddleware({ origin: true });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const response = await chain.execute(
        new Request('https://api.com', { headers: { Origin: 'https://any.com' } }),
        { params: {}, query: new URLSearchParams() },
        () => new Response('OK'),
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://any.com');
      expect(response.headers.get('Vary')).toContain('Origin');
    });

    it("origin:'*' 是静态值，不需要 Vary: Origin", async () => {
      const middleware = createCorsMiddleware({ origin: '*' });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const response = await chain.execute(
        new Request('https://api.com', { headers: { Origin: 'https://any.com' } }),
        { params: {}, query: new URLSearchParams() },
        () => new Response('OK'),
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Vary')).toBeNull();
    });

    it('判定函数形式的白名单可用', async () => {
      const middleware = createCorsMiddleware({
        origin: (o) => o.endsWith('.trusted.com'),
        credentials: true,
      });
      const chain = createMiddlewareChain();
      chain.use(middleware);
      const response = await chain.execute(
        new Request('https://api.com', { headers: { Origin: 'https://app.trusted.com' } }),
        { params: {}, query: new URLSearchParams() },
        () => new Response('OK'),
      );
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.trusted.com');
    });
  });
});
