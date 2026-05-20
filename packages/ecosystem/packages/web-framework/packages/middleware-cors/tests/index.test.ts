 
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
});
