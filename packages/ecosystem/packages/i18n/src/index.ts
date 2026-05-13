/**
 * @lytjs/i18n - 入口文件
 *
 * LytJS 国际化插件
 */

export { createI18n, registerLocale } from './i18n';

export type {
  I18nOptions,
  I18nInstance,
  I18nConfig,
  Locale,
  LocaleMessages,
  TranslateFn,
} from './types';

export { createI18n as default } from './i18n';
