/**
 * @lytjs/i18n - 类型定义
 */

/**
 * 语言消息定义
 */
export type LocaleMessages = Record<string, string | Record<string, any>>;

/**
 * 语言包
 */
export interface Locale {
  [locale: string]: LocaleMessages;
}

/**
 * i18n 配置选项
 */
export interface I18nOptions {
  /** 默认语言 */
  locale?: string;
  /** 回退语言 */
  fallbackLocale?: string;
  /** 语言包 */
  messages?: Locale;
  /** 是否在控制台警告缺失的翻译 */
  warnHtmlMessage?: boolean;
}

/**
 * 翻译函数
 */
export type TranslateFn = (key: string, ...args: any[]) => string;

/**
 * i18n 实例
 */
export interface I18nInstance {
  /** 当前语言 */
  locale: { value: string };
  /** 设置语言 */
  setLocale(locale: string): void;
  /** 获取翻译 */
  t: TranslateFn;
  /** 是否存在翻译 */
  te(key: string, locale?: string): boolean;
  /** 获取语言列表 */
  availableLocales: string[];
  /** 注册语言包 */
  registerLocale(locale: string, messages: LocaleMessages): void;
  /** 获取所有语言包 */
  getMessages(): Locale;
}

export type { I18nOptions as I18nConfig };
