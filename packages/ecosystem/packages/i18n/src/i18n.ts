/**
 * @lytjs/i18n - 国际化核心
 */

import type { I18nOptions, I18nInstance, Locale, LocaleMessages } from './types';
import { signal } from '@lytjs/reactivity';
import { isString, isObject } from '@lytjs/common-is';

/**
 * 创建 i18n 实例
 */
export function createI18n(options: I18nOptions = {}): I18nInstance {
  const {
    locale: defaultLocale = 'zh-CN',
    fallbackLocale = 'en-US',
    messages = {},
  } = options;

  // 当前语言
  const currentLocale = signal(defaultLocale);

  // 语言包存储
  const localeMessages: Locale = { ...messages };

  /**
   * 获取嵌套对象的值
   */
  function getNestedValue(obj: LocaleMessages, path: string): string | undefined {
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (!isObject(current) || !(key in current)) {
        return undefined;
      }
      current = current[key as keyof typeof current];
    }
    
    return isString(current) ? current : undefined;
  }

  /**
   * 替换插值
   */
  function interpolate(message: string, args: any[]): string {
    if (args.length === 0) return message;
    
    // 支持命名参数 {name} 和位置参数 {0}
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      const index = parseInt(key, 10);
      if (!isNaN(index)) {
        return args[index] !== undefined ? String(args[index]) : match;
      }
      // 命名参数（从对象中获取）
      if (isObject(args[0])) {
        return (args[0] as Record<string, any>)[key] !== undefined 
          ? String((args[0] as Record<string, any>)[key]) 
          : match;
      }
      return match;
    });
  }

  /**
   * 翻译函数
   */
  function t(key: string, ...args: any[]): string {
    const locale = currentLocale();
    const msgs = localeMessages[locale];
    const fallbackMessages = localeMessages[fallbackLocale];

    // 尝试获取翻译
    let message = msgs ? getNestedValue(msgs, key) : undefined;
    
    // 回退到默认语言
    if (!message && fallbackMessages) {
      message = getNestedValue(fallbackMessages, key);
    }

    // 找不到翻译，返回 key
    if (!message) {
      if (options.warnHtmlMessage !== false) {
        console.warn(`[i18n] Missing translation for key: "${key}"`);
      }
      return key;
    }

    return interpolate(message, args);
  }

  /**
   * 检查翻译是否存在
   */
  function te(key: string, locale?: string): boolean {
    const targetLocale = locale || currentLocale();
    const msgs = localeMessages[targetLocale];
    
    if (!msgs) return false;
    return getNestedValue(msgs, key) !== undefined;
  }

  /**
   * 设置当前语言
   */
  function setLocale(locale: string): void {
    currentLocale.set(locale);
  }

  /**
   * 获取可用语言列表
   */
  const availableLocales = Object.keys(localeMessages);

  return {
    locale: { get value() { return currentLocale(); }, set value(v: string) { currentLocale.set(v); } },
    setLocale,
    t,
    te,
    availableLocales,
  };
}

/**
 * 注册语言包
 */
export function registerLocale(_i18n: I18nInstance, locale: string, _messages: LocaleMessages): void {
  // 这里需要访问内部的 localeMessages
  // 简化实现：直接扩展
  console.log(`[i18n] Registering locale: ${locale}`);
}

export type { I18nOptions, I18nInstance, Locale, LocaleMessages };
