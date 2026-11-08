/**
 * @lytjs/ui - 运行时 locale API
 *
 * `t()` 在渲染函数里被调用时读取 `state.locale`（reactive），因此
 * `setUiLocale('en-US')` 会让**所有**调用过 `t()` 的组件重新渲染 —— 无需重建 app。
 *
 * 用法：
 * ```ts
 * import { setUiLocale, getUiLocale, t } from '@lytjs/ui';
 * setUiLocale('en-US');          // 运行时切换
 * getUiLocale();                 // → 'en-US'
 * t('pagination.total', { total: 100 });
 * ```
 */
import { reactive } from '@lytjs/core/runtime';
import {
  FALLBACK_LOCALE,
  UI_LOCALE_MESSAGES,
  type UiLocaleMessages,
  type UiLocaleName,
} from './messages';

export type UiLocaleKey = keyof UiLocaleMessages;
export type UiLocaleParams = Record<string, string | number>;

const state = reactive({ locale: FALLBACK_LOCALE as UiLocaleName });

/** 当前 locale。 */
export function getUiLocale(): UiLocaleName {
  return state.locale;
}

/**
 * 运行时切换 locale。
 *
 * 未知 locale **立即抛错**（不做「静默忽略 + 保持旧值」，否则调用方会以为切换成功）。
 */
export function setUiLocale(locale: UiLocaleName): void {
  if (!Object.prototype.hasOwnProperty.call(UI_LOCALE_MESSAGES, locale)) {
    throw new Error(
      `[lytjs/ui] Unknown locale "${locale}". Supported: ${Object.keys(UI_LOCALE_MESSAGES).join(
        ', ',
      )}`,
    );
  }
  state.locale = locale;
}

/** 当前 locale 的完整文案表（只读用途）。 */
export function getUiLocaleMessages(): UiLocaleMessages {
  return UI_LOCALE_MESSAGES[state.locale];
}

/** `{name}` 占位替换；缺参数抛错，绝不静默保留花括号。 */
function interpolate(template: string, key: UiLocaleKey, params?: UiLocaleParams): string {
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`[lytjs/ui] Missing i18n param "${name}" for key "${key}"`);
    }
    return String(value);
  });
}

/**
 * 取文案。
 *
 * 查找顺序：当前 locale → zh-CN → 抛错。**永不返回空串**。
 */
export function t(key: UiLocaleKey, params?: UiLocaleParams): string {
  const locale = state.locale;
  const message = UI_LOCALE_MESSAGES[locale][key] ?? UI_LOCALE_MESSAGES[FALLBACK_LOCALE][key];
  if (message === undefined) {
    throw new Error(
      `[lytjs/ui] Missing i18n key "${key}" for locale "${locale}" ` +
        `(fallback "${FALLBACK_LOCALE}" also missing)`,
    );
  }
  return interpolate(message, key, params);
}

export { FALLBACK_LOCALE, UI_LOCALE_MESSAGES };
export type { UiLocaleMessages, UiLocaleName };
