/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { createApiRouter } from '../src';

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

    it('should handle api requests', async () => {
      const router = createApiRouter({
        apiDir: 'test',
      });
      router.addRoute({
        path: '/api/hello',
        methods: ['GET'],
        handlerPath: 'test/api/hello.get.ts',
        isDynamic: false,
      });

      const response = await router.handleRequest('GET', '/api/hello', {
        method: 'GET',
        path: '/api/hello',
        headers: {},
        params: {},
        query: {},
      });

      expect(response.status).toBe(200);
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
