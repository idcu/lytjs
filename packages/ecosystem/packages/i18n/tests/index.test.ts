/**
 * @lytjs/i18n 单元测试
 */

import { describe, it, expect } from 'vitest';
import { createI18n, registerLocale as standaloneRegisterLocale } from '../src/index';

describe('I18n', () => {
  describe('createI18n', () => {
    it('should create i18n instance', () => {
      const i18n = createI18n();
      expect(i18n).toBeDefined();
      expect(i18n.locale.value).toBe('zh-CN');
      expect(i18n.t).toBeTypeOf('function');
      expect(i18n.registerLocale).toBeTypeOf('function');
      expect(i18n.getMessages).toBeTypeOf('function');
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

  describe('registerLocale', () => {
    it('should register new locale via instance method', () => {
      const i18n = createI18n({
        messages: {
          'zh-CN': { hello: '你好' },
        },
      });
      
      // 注册新语言包
      i18n.registerLocale('ja-JP', { hello: 'こんにちは' });
      
      expect(i18n.availableLocales).toContain('ja-JP');
      
      i18n.setLocale('ja-JP');
      expect(i18n.t('hello')).toBe('こんにちは');
    });

    it('should register new locale via standalone function', () => {
      const i18n = createI18n({
        messages: {
          'zh-CN': { hello: '你好' },
        },
      });
      
      // 使用独立函数注册
      standaloneRegisterLocale(i18n, 'fr-FR', { hello: 'Bonjour' });
      
      expect(i18n.availableLocales).toContain('fr-FR');
      
      i18n.setLocale('fr-FR');
      expect(i18n.t('hello')).toBe('Bonjour');
    });

    it('should merge existing locale messages', () => {
      const i18n = createI18n({
        messages: {
          'zh-CN': { hello: '你好' },
        },
      });
      
      // 合并消息
      i18n.registerLocale('zh-CN', { goodbye: '再见' });
      
      expect(i18n.t('hello')).toBe('你好');
      expect(i18n.t('goodbye')).toBe('再见');
    });

    it('should update availableLocales when new locale is registered', () => {
      const i18n = createI18n({
        messages: {
          'zh-CN': {},
        },
      });
      
      expect(i18n.availableLocales).toHaveLength(1);
      
      i18n.registerLocale('en-US', {});
      expect(i18n.availableLocales).toHaveLength(2);
    });
  });

  describe('getMessages', () => {
    it('should return all messages', () => {
      const messages = {
        'zh-CN': { hello: '你好' },
        'en-US': { hello: 'Hello' },
      };
      
      const i18n = createI18n({ messages });
      const returnedMessages = i18n.getMessages();
      
      expect(returnedMessages).toEqual(messages);
      expect(returnedMessages['zh-CN']).toEqual(messages['zh-CN']);
      expect(returnedMessages['en-US']).toEqual(messages['en-US']);
    });

    it('should return copy of messages to prevent direct modification', () => {
      const messages = {
        'zh-CN': { hello: '你好' },
      };
      
      const i18n = createI18n({ messages });
      const returnedMessages = i18n.getMessages();
      
      // 修改返回的对象不应影响内部存储
      returnedMessages['zh-CN'].hello = '修改后的内容';
      
      // 验证内部消息未被修改
      i18n.setLocale('zh-CN');
      expect(i18n.t('hello')).toBe('你好');
    });
  });
});
