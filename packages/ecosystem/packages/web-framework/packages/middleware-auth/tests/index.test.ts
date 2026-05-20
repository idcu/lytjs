/**
 * @lytjs/middleware-auth 测试
 */
import { describe, it, expect, vi } from 'vitest';
import { createAuthMiddleware } from '../src';
import { createMiddlewareChain } from '@lytjs/middleware';

describe('@lytjs/middleware-auth', () => {
  describe('createAuthMiddleware', () => {
    it('应该创建一个认证中间件', () => {
      const middleware = createAuthMiddleware({ authenticate: async () => null });
      expect(typeof middleware).toBe('function');
    });

    it('应该验证 Bearer token', async () => {
      const authenticate = vi.fn(async (token) => (token === 'valid-token' ? { id: '1' } : null));
      const middleware = createAuthMiddleware({ authenticate });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer valid-token' },
      });

      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(authenticate).toHaveBeenCalledWith('valid-token');
      expect(context.user).toEqual({ id: '1' });
      expect(response.status).toBe(200);
    });

    it('应该对没有认证头的请求返回 401', async () => {
      const middleware = createAuthMiddleware({ authenticate: async () => null });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com');
      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(response.status).toBe(401);
    });

    it('应该对无效 token 的请求返回 401', async () => {
      const authenticate = vi.fn(async () => null);
      const middleware = createAuthMiddleware({ authenticate });
      const chain = createMiddlewareChain();
      chain.use(middleware);

      const request = new Request('https://example.com', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      const context = { params: {}, query: new URLSearchParams() };
      const response = await chain.execute(request, context, () => new Response('OK'));

      expect(response.status).toBe(401);
    });
  });
});
