/**
 * @lytjs/ui - useLocale
 *
 * 组件内的 i18n 入口。`t` 读取 `state.locale`（reactive），因此在 render 中调用
 * 会随 `setUiLocale()` 自动重渲染；这里只统一组件侧的取用方式，不复制文案表。
 */

import { getUiLocale, setUiLocale, t } from '../locale';
import type { UiLocaleKey, UiLocaleName, UiLocaleParams } from '../locale';

export interface UseLocaleApi {
  t(key: UiLocaleKey, params?: UiLocaleParams): string;
  /** 当前 locale（响应式读取） */
  locale(): UiLocaleName;
  setLocale(locale: UiLocaleName): void;
}

export function useLocale(): UseLocaleApi {
  return {
    t,
    locale: getUiLocale,
    setLocale: setUiLocale,
  };
}
