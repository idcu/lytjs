/**
 * @lytjs/plugin-logger 单元测试
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';

const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-logger', () => {
  describe('模块导出', () => {
    it('应该导出默认插件', () => {
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('object');
    });

    it('应该导出 createLogger 函数', () => {
      expect(pluginModule.createLogger).toBeDefined();
      expect(typeof pluginModule.createLogger).toBe('function');
    });

    it('应该导出 LOG_LEVELS 常量', () => {
      expect(pluginModule.LOG_LEVELS).toBeDefined();
      expect(typeof pluginModule.LOG_LEVELS).toBe('object');
    });
  });

  describe('createLogger', () => {
    it('应该创建日志管理器实例', () => {
      const logger = pluginModule.createLogger();
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    it('应该有日志记录方法', () => {
      const logger = pluginModule.createLogger();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('应该支持获取日志列表', () => {
      const logger = pluginModule.createLogger();
      expect(Array.isArray(logger.logs)).toBe(true);
    });

    it('应该支持清空日志', () => {
      const logger = pluginModule.createLogger();
      expect(typeof logger.clear).toBe('function');
      logger.clear();
      expect(logger.logs.length).toBe(0);
    });

    it('应该支持性能测量', () => {
      const logger = pluginModule.createLogger();
      expect(typeof logger.startMeasure).toBe('function');
      expect(typeof logger.endMeasure).toBe('function');
    });

    it('应该支持设置日志级别', () => {
      const logger = pluginModule.createLogger();
      expect(typeof logger.setLevel).toBe('function');
    });

    it('应该支持 JSON 格式化', () => {
      const logger = pluginModule.createLogger({
        format: 'json',
      });
      expect(logger).toBeDefined();
    });

    it('应该支持持久化', () => {
      const logger = pluginModule.createLogger({
        enablePersistence: true,
        storageKey: 'test-logger',
      });
      expect(logger).toBeDefined();
    });
  });
});
