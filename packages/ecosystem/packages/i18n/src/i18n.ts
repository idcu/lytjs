/**
 * @lytjs/i18n - 国际化核心
 */

import type { I18nOptions, I18nInstance, Locale, LocaleMessages } from './types';
import { signal } from '@lytjs/reactivity';
import { isString, isObject } from '@lytjs/common-is';

/**
 * 深度克隆对象，防止直接修改
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }
  
  const cloned = {} as Record<string, any>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, any>)[key]);
    }
  }
  return cloned as T;
}

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

  // 可用语言列表（响应式）
  const availableLocalesState = signal<string[]>(Object.keys(messages));

  // 语言包存储（深度克隆以防止外部修改）
  const localeMessages: Locale = deepClone(messages);

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
   * 注册语言包
   */
  function registerLocale(locale: string, messages: LocaleMessages): void {
    // 如果是新语言，添加到可用语言列表
    if (!localeMessages[locale]) {
      localeMessages[locale] = {};
      // 更新可用语言列表
      const newLocales = [...Object.keys(localeMessages)];
      availableLocalesState.set(newLocales);
    }
    // 合并语言包（支持部分更新，深度克隆以防止外部修改）
    localeMessages[locale] = {
      ...localeMessages[locale],
      ...deepClone(messages),
    };
    console.log(`[i18n] Locale "${locale}" registered successfully`);
  }

  /**
   * 获取所有语言包
   */
  function getMessages(): Locale {
    // 返回深度克隆以防止外部直接修改
    return deepClone(localeMessages);
  }

  return {
    locale: { 
      get value() { return currentLocale(); }, 
      set value(v: string) { currentLocale.set(v); } 
    },
    setLocale,
    t,
    te,
    get availableLocales() { return availableLocalesState(); },
    registerLocale,
    getMessages,
  };
}

/**
 * 注册语言包（独立函数版本）
 */
export function registerLocale(i18n: I18nInstance, locale: string, messages: LocaleMessages): void {
  i18n.registerLocale(locale, messages);
}

export type { I18nOptions, I18nInstance, Locale, LocaleMessages };
