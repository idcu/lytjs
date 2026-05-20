/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/http-server 测试
 */
import { describe, it, expect } from 'vitest';
import { Server, Router, createServer } from '../src';

describe('@lytjs/http-server', () => {
  describe('Server', () => {
    it('应该创建服务器实例', () => {
      const server = createServer();
      expect(server).toBeInstanceOf(Server);
    });
  });

  describe('Router', () => {
    it('应该创建路由实例', () => {
      const router = new Router();
      expect(router).toBeInstanceOf(Router);
    });

    it('应该支持 GET 路由', () => {
      const router = new Router();
      const handler = () => {};
      router.on('GET', '/test', handler);
      const match = router.match('GET', '/test');
      expect(match).not.toBeNull();
    });

    it('应该支持动态路由', () => {
      const router = new Router();
      const handler = () => {};
      router.on('GET', '/users/:id', handler);
      const match = router.match('GET', '/users/123');
      expect(match).not.toBeNull();
      expect(match?.params?.id).toBe('123');
    });
  });
});
