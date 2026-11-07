/**
 * @lytjs/ui - useFormField
 *
 * Form → FormItem 的字段错误通道。
 *
 * - `Form` 在 setup 里 `provideFormFieldErrors(errors)`；
 * - `FormItem` 用 `useFormField()` 按自己的 `prop` 取错误；`error` prop 优先。
 *
 * 传 getter（而不是值）以保证在 render 内读取时保持响应式。
 */

import { inject, provide } from '@lytjs/component';

const FORM_ERRORS_KEY = Symbol('lyt-form-errors');

type ErrorsGetter = () => Record<string, string>;

export interface FormFieldOptions {
  /** 父组件显式传入的错误（优先于表单校验结果） */
  error?: () => string;
  /** 字段名，用于从表单校验结果中取值 */
  prop?: () => string;
}

export interface FormFieldApi {
  error(): string;
}

export function provideFormFieldErrors(errors: ErrorsGetter): void {
  provide(FORM_ERRORS_KEY, errors);
}

export function useFormField(options: FormFieldOptions): FormFieldApi {
  const injected = inject(FORM_ERRORS_KEY, null) as ErrorsGetter | null;

  return {
    error: () => {
      const explicit = options.error?.() ?? '';
      if (explicit) return explicit;
      const field = options.prop?.() ?? '';
      if (!injected || !field) return '';
      return injected()[field] ?? '';
    },
  };
}
