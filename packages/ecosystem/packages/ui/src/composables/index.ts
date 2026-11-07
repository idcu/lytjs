/**
 * @lytjs/ui - composables 基础层
 *
 * S15：先把「受控状态 / 插槽归一化 / 弹层生命周期 / 表单字段 / i18n」收敛为
 * 可复用入口，再逐步替换组件里的重复写法。本层不改变组件行为与 DOM 结构。
 */

export { useControlledState } from './useControlledState';
export type { ControlledState, UseControlledStateOptions } from './useControlledState';

export { useSlotContent } from './useSlotContent';
export type { SlotContentApi } from './useSlotContent';

export { useOverlay } from './useOverlay';
export type { UseOverlayApi, UseOverlayOptions } from './useOverlay';

export { provideFormFieldErrors, useFormField } from './useFormField';
export type { FormFieldApi, FormFieldOptions } from './useFormField';

export { useLocale } from './useLocale';
export type { UseLocaleApi } from './useLocale';
