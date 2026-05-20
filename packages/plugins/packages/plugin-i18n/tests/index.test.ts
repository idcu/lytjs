/**
 * @lytjs/plugin-i18n 单元测试
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';

const pluginModule = require('../dist/index.cjs');

describe('@lytjs/plugin-i18n', () => {
  describe('模块导出', () => {
    it('应该导出默认插件', () => {
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('object');
    });

    it('应该导出 createI18n 函数', () => {
      expect(pluginModule.createI18n).toBeDefined();
      expect(typeof pluginModule.createI18n).toBe('function');
    });

    it('应该导出 registerLocale 函数', () => {
      expect(pluginModule.registerLocale).toBeDefined();
      expect(typeof pluginModule.registerLocale).toBe('function');
    });
  });

  describe('createI18n', () => {
    it('应该创建 i18n 实例', () => {
      const i18n = pluginModule.createI18n();
      expect(i18n).toBeDefined();
      expect(typeof i18n).toBe('object');
    });

    it('应该支持翻译函数', () => {
      const i18n = pluginModule.createI18n();
      expect(typeof i18n.t).toBe('function');
    });

    it('应该支持设置语言', () => {
      const i18n = pluginModule.createI18n();
      expect(typeof i18n.setLocale).toBe('function');
    });

    it('应该支持获取可用语言列表', () => {
      const i18n = pluginModule.createI18n();
      expect(Array.isArray(i18n.availableLocales)).toBe(true);
    });

    it('应该支持注册新语言', () => {
      const i18n = pluginModule.createI18n();
      expect(typeof i18n.registerLocale).toBe('function');
    });

    it('应该支持获取所有语言包', () => {
      const i18n = pluginModule.createI18n();
      expect(typeof i18n.getMessages).toBe('function');
    });

    it('应该支持翻译存在性检查', () => {
      const i18n = pluginModule.createI18n();
      expect(typeof i18n.te).toBe('function');
    });

    it('应该支持自定义配置', () => {
      const i18n = pluginModule.createI18n({
        locale: 'en-US',
        fallbackLocale: 'zh-CN',
      });
      expect(i18n).toBeDefined();
    });

    it('应该支持自定义语言包', () => {
      const i18n = pluginModule.createI18n({
        locale: 'test',
        messages: {
          test: {
            hello: '你好',
          },
        },
      });
      expect(i18n.t('hello')).toBe('你好');
    });
  });
});
