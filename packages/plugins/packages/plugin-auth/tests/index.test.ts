/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/plugin-auth 单元测试
 */

import { describe, it, expect } from 'vitest';

const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-auth', () => {
  describe('模块导出', () => {
    it('应该导出默认插件', () => {
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('object');
    });

    it('应该导出 createAuth 函数', () => {
      expect(pluginModule.createAuth).toBeDefined();
      expect(typeof pluginModule.createAuth).toBe('function');
    });
  });

  describe('createAuth', () => {
    it('应该创建认证管理器实例', () => {
      const auth = pluginModule.createAuth();
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('object');
    });

    it('应该支持用户登录', () => {
      const auth = pluginModule.createAuth();
      expect(typeof auth.login).toBe('function');
    });

    it('应该支持用户登出', () => {
      const auth = pluginModule.createAuth();
      expect(typeof auth.logout).toBe('function');
    });

    it('应该支持角色检查', () => {
      const auth = pluginModule.createAuth();
      expect(typeof auth.hasRole).toBe('function');
    });

    it('应该支持权限检查', () => {
      const auth = pluginModule.createAuth();
      expect(typeof auth.hasPermission).toBe('function');
    });

    it('应该追踪认证状态', () => {
      const auth = pluginModule.createAuth();
      expect(typeof auth.isAuthenticated).toBe('boolean');
    });

    it('应该支持获取当前用户', () => {
      const auth = pluginModule.createAuth();
      expect(auth.user === null || typeof auth.user === 'object').toBe(true);
    });

    it('应该支持持久化', () => {
      const auth = pluginModule.createAuth({
        enablePersistence: true,
        storageKey: 'test-auth',
      });
      expect(auth).toBeDefined();
    });
  });
});
