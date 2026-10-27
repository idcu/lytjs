import { describe, it, expect } from 'vitest';
import { createApiRouter, ApiError } from '../src';

describe('@lytjs/api', () => {
  describe('createApiRouter', () => {
    it('should create api router instance', () => {
      const router = createApiRouter({
        apiDir: 'test',
      });
      expect(router).toBeDefined();
      expect(router.getRoutes).toBeDefined();
      expect(router.match).toBeDefined();
      expect(router.handleRequest).toBeDefined();
    });

    it('should handle api matching', async () => {
      const router = createApiRouter({
        apiDir: 'test',
      });
      router.addRoute({
        path: '/api/users',
        methods: ['GET'],
        handlerPath: 'test/api/users.get.ts',
        isDynamic: false,
      });
      router.addRoute({
        path: '/api/users/:id',
        methods: ['GET', 'PUT', 'DELETE'],
        handlerPath: 'test/api/users/[id].ts',
        isDynamic: true,
        params: ['id'],
      });

      const getMatch = router.match('GET', '/api/users');
      expect(getMatch).toBeDefined();
      expect(getMatch!.path).toBe('/api/users');
      expect(getMatch!.params).toEqual({});

      const userMatch = router.match('GET', '/api/users/123');
      expect(userMatch).toBeDefined();
      expect(userMatch!.path).toBe('/api/users/123');
      expect(userMatch!.params).toEqual({ id: '123' });
    });

    // ⚠️ 2026-10-27 修正：这条用例此前只断言 `status === 200` —— 而旧实现
    //   **从不执行 handler**，恒返回 `{ message: 'API Route Matched' }`，
    //   所以它其实在断言「假响应成功」。现在改为断言 handler 真的被调用、且拿到正确上下文。
    it('should execute the route handler with request context', async () => {
      const calls: unknown[] = [];
      const router = createApiRouter({
        apiDir: 'test',
        resolveHandler: () => (ctx) => {
          calls.push(ctx);
          return { status: 200, headers: {}, body: { hello: ctx.params.id } };
        },
      });
      router.addRoute({
        path: '/api/hello/:id',
        methods: ['GET'],
        handlerPath: 'test/api/hello.get.ts',
        isDynamic: true,
        params: ['id'],
      });

      const response = await router.handleRequest('GET', '/api/hello/42', {
        method: 'GET',
        path: '/api/hello/42',
        headers: { accept: 'application/json' },
        params: {},
        query: { q: 'x' },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ hello: '42' });
      expect(calls).toHaveLength(1);
      const ctx = calls[0] as Record<string, unknown>;
      expect(ctx.method).toBe('GET');
      expect(ctx.query).toEqual({ q: 'x' });
      expect(ctx.headers).toEqual({ accept: 'application/json' });
    });

    it('handler 缺失时必须报错，不能返回假 200', async () => {
      const router = createApiRouter({ apiDir: 'test', resolveHandler: () => undefined });
      router.addRoute({
        path: '/api/none',
        methods: ['GET'],
        handlerPath: 'test/api/none.get.ts',
        isDynamic: false,
      });

      const response = await router.handleRequest('GET', '/api/none', {
        method: 'GET',
        path: '/api/none',
        headers: {},
        params: {},
        query: {},
      });

      expect(response.status).toBe(500);
      expect(JSON.stringify(response.body)).not.toContain('API Route Matched');
    });

    it('handler 抛 ApiError 时应转成对应状态码', async () => {
      const router = createApiRouter({
        apiDir: 'test',
        resolveHandler: () => () => {
          throw new ApiError(404, '用户不存在');
        },
      });
      router.addRoute({
        path: '/api/user',
        methods: ['GET'],
        handlerPath: 'test/api/user.get.ts',
        isDynamic: false,
      });

      const response = await router.handleRequest('GET', '/api/user', {
        method: 'GET',
        path: '/api/user',
        headers: {},
        params: {},
        query: {},
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: '用户不存在' });
    });

    it('should return 404 for not found', async () => {
      const router = createApiRouter({ apiDir: 'test' });
      const response = await router.handleRequest('GET', '/not/found', {
        method: 'GET',
        path: '/not/found',
        headers: {},
        params: {},
        query: {},
      });

      expect(response.status).toBe(404);
    });
  });
});
