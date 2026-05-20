/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/plugin-storage 单元测试
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';

const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-storage', () => {
  describe('模块导出', () => {
    it('应该导出默认插件', () => {
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('object');
    });

    it('应该导出 createStorage 函数', () => {
      expect(pluginModule.createStorage).toBeDefined();
      expect(typeof pluginModule.createStorage).toBe('function');
    });
  });

  describe('createStorage', () => {
    it('应该创建存储管理器实例', () => {
      const storage = pluginModule.createStorage();
      expect(storage).toBeDefined();
      expect(typeof storage).toBe('object');
    });

    it('应该支持存储数据', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.set).toBe('function');
    });

    it('应该支持读取数据', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.get).toBe('function');
    });

    it('应该支持删除数据', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.remove).toBe('function');
    });

    it('应该支持清空数据', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.clear).toBe('function');
    });

    it('应该支持获取所有键', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.keys).toBe('function');
    });

    it('应该支持检查键是否存在', () => {
      const storage = pluginModule.createStorage();
      expect(typeof storage.has).toBe('function');
    });
  });
});
