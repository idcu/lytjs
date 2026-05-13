/**
 * @lytjs/i18n 单元测试
 */

import { describe, it, expect } from 'vitest';
import { createI18n } from '../src/index';

describe('I18n', () => {
  describe('createI18n', () => {
    it('should create i18n instance', () => {
      const i18n = createI18n();
      expect(i18n).toBeDefined();
      expect(i18n.locale.value).toBe('zh-CN');
      expect(i18n.t).toBeTypeOf('function');
    });

    it('should create i18n with custom locale', () => {
      const i18n = createI18n({ locale: 'en-US' });
      expect(i18n.locale.value).toBe('en-US');
    });
  });

  describe('translation', () => {
    const i18n = createI18n({
      locale: 'zh-CN',
      fallbackLocale: 'en-US',
      messages: {
        'zh-CN': {
          hello: '你好',
          welcome: '欢迎, {0}!',
          nested: {
            message: '嵌套消息',
          },
        },
        'en-US': {
          hello: 'Hello',
          welcome: 'Welcome, {0}!',
        },
      },
    });

    it('should translate simple key', () => {
      expect(i18n.t('hello')).toBe('你好');
    });

    it('should translate with interpolation', () => {
      expect(i18n.t('welcome', 'World')).toBe('欢迎, World!');
    });

    it('should translate nested key', () => {
      expect(i18n.t('nested.message')).toBe('嵌套消息');
    });

    it('should return key for missing translation', () => {
      expect(i18n.t('missing.key')).toBe('missing.key');
    });

    it('should fallback to fallbackLocale', () => {
      i18n.setLocale('ja-JP');
      expect(i18n.t('hello')).toBe('Hello');
      i18n.setLocale('zh-CN');
    });
  });

  describe('setLocale', () => {
    it('should change locale', () => {
      const i18n = createI18n({ locale: 'zh-CN' });
      expect(i18n.locale.value).toBe('zh-CN');
      
      i18n.setLocale('en-US');
      expect(i18n.locale.value).toBe('en-US');
    });
  });

  describe('te', () => {
    const i18n = createI18n({
      messages: {
        'zh-CN': {
          exists: '存在',
        },
      },
    });

    it('should return true for existing key', () => {
      expect(i18n.te('exists')).toBe(true);
    });

    it('should return false for missing key', () => {
      expect(i18n.te('missing')).toBe(false);
    });
  });

  describe('availableLocales', () => {
    it('should return available locales', () => {
      const i18n = createI18n({
        messages: {
          'zh-CN': {},
          'en-US': {},
        },
      });
      
      expect(i18n.availableLocales).toContain('zh-CN');
      expect(i18n.availableLocales).toContain('en-US');
    });
  });
});
