/**
 * @lytjs/ui - Form 组件
 *
 * 表单组件，支持表单验证和布局
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { FormRules, FormSetupProps, FormSlots, FormItemSetupProps, FormItemSlots } from './types';
import { mergeA11yProps } from '@lytjs/common-a11y';

export interface FormLocale {
  required: string;
  pattern: string;
  min: string;
  max: string;
  type: string;
  validator: string;
  default: string;
}

const DEFAULT_LOCALE: FormLocale = {
  required: '此字段必填',
  pattern: '格式不正确',
  min: '长度不能少于 {min} 个字符',
  max: '长度不能超过 {max} 个字符',
  type: '类型不正确',
  validator: '验证失败',
  default: '验证失败',
};

export function createFormLocale(locale: Partial<FormLocale>): FormLocale {
  return { ...DEFAULT_LOCALE, ...locale };
}

function formatMessage(template: string, params: Record<string, string | number>): string {
  let message = template;
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return message;
}

export const Form = defineComponent({
  name: 'LytForm',

  props: {
    model: { type: Object, default: (): Record<string, unknown> => ({}) },
    rules: { type: Object, default: (): FormRules => ({}) },
    labelWidth: { type: String, default: '100px' },
    labelPosition: { type: String, default: 'right' },
    locale: { type: Object, default: (): FormLocale => DEFAULT_LOCALE },
    class: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    onSubmit: { type: Function, default: undefined },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: FormSlots }) {
    const p = props as FormSetupProps;
    const errors = signal<Record<string, string>>({});
    const validating = signal<Record<string, boolean>>({});
    const locale = (p.locale || DEFAULT_LOCALE) as FormLocale;

    const validateField = async (field: string): Promise<boolean> => {
      const rules = p.rules[field];
      if (!rules || rules.length === 0) return true;

      const value = p.model[field];
      const fieldErrors: string[] = [];

      for (const rule of rules) {
        if (rule.required && (!value || value === '')) {
          const message = rule.message || formatMessage(locale.required, { field });
          fieldErrors.push(message);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rule.type) {
            const typeValid = validateType(value, rule.type);
            if (!typeValid) {
              fieldErrors.push(rule.message || formatMessage(locale.type, { type: rule.type, field }));
              continue;
            }
          }

          if (rule.pattern && !rule.pattern.test(String(value))) {
            fieldErrors.push(rule.message || formatMessage(locale.pattern, { field }));
            continue;
          }

          if (typeof value === 'string') {
            if (rule.min !== undefined && value.length < rule.min) {
              fieldErrors.push(rule.message || formatMessage(locale.min, { min: rule.min, field }));
              continue;
            }
            if (rule.max !== undefined && value.length > rule.max) {
              fieldErrors.push(rule.message || formatMessage(locale.max, { max: rule.max, field }));
              continue;
            }
          }
        }

        if (rule.validator) {
          validating.set({ ...validating(), [field]: true });

          try {
            const result = await Promise.resolve(rule.validator(value, p.model));

            if (result !== true) {
              const errorMessage = typeof result === 'string' ? result : formatMessage(locale.validator, { field });
              fieldErrors.push(errorMessage);
            }
          } catch (error) {
            fieldErrors.push(rule.message || formatMessage(locale.validator, { field }));
          } finally {
            validating.set({ ...validating(), [field]: false });
          }
        }
      }

      if (fieldErrors.length > 0) {
        errors.set({ ...errors(), [field]: fieldErrors[0]! });
        return false;
      }

      const newErrors = { ...errors() };
      delete newErrors[field];
      errors.set(newErrors);
      return true;
    };

    const validate = async (): Promise<boolean> => {
      let isValid = true;
      const fieldNames = Object.keys(p.rules);

      for (const field of fieldNames) {
        const fieldValid = await validateField(field);
        if (!fieldValid) {
          isValid = false;
        }
      }

      return isValid;
    };

    const validateAll = async (): Promise<boolean> => {
      const fieldNames = Object.keys(p.rules);
      const results = await Promise.all(fieldNames.map(field => validateField(field)));
      return results.every(result => result);
    };

    const clearValidate = (field?: string) => {
      if (field) {
        const newErrors = { ...errors() };
        delete newErrors[field];
        errors.set(newErrors);
      } else {
        errors.set({});
      }
    };

    void validateAll;
    void clearValidate;

    const handleSubmit = async (event: Event) => {
      event.preventDefault();
      const isValid = await validate();
      if (isValid) {
        p.onSubmit?.(p.model);
      }
    };

    return () => {
      const formClass = [
        'lyt-form',
        `lyt-form--label-${p.labelPosition}`,
        p.class,
      ].filter(Boolean).join(' ');

      const children: VNode[] = slots.default ? slots.default() : [];

      return createVNode('form', {
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
        class: formClass,
        onSubmit: handleSubmit,
      }, children);
    };
  },
});

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'date':
      return value instanceof Date || !isNaN(Date.parse(String(value)));
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === 'string' && emailRegex.test(value);
    case 'url':
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    default:
      return true;
  }
}

export const FormItem = defineComponent({
  name: 'LytFormItem',

  props: {
    label: { type: String, default: '' },
    prop: { type: String, default: '' },
    required: { type: Boolean, default: false },
    rules: { type: [Object, Array] as unknown as StringConstructor, default: () => [] },
    error: { type: String, default: '' },
    validateStatus: { type: String, default: '' },
    id: { type: String, default: '' },
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>, { slots }: { slots: FormItemSlots }) {
    const p = props as FormItemSetupProps;

    return () => {
      const itemClass = [
        'lyt-form-item',
        p.error ? 'lyt-form-item--error' : '',
        p.validateStatus ? `lyt-form-item--${p.validateStatus}` : '',
      ].filter(Boolean).join(' ');

      const labelStyle = p.label ? { width: '100px' } : {};

      const children: VNode[] = [];

      if (p.label) {
        children.push(createVNode('label', {
          class: 'lyt-form-item__label',
          style: labelStyle,
        }, [createVNode('span', {}, String(p.label))]));
      }

      if (slots.default) {
        const slotContent = slots.default();
        children.push(createVNode('div', { class: 'lyt-form-item__content' }, slotContent));
      }

      if (p.error) {
        children.push(createVNode('div', {
          class: 'lyt-form-item__error',
          role: 'alert',
          'aria-live': 'polite'
        }, [createVNode('span', {}, String(p.error))]));
      }

      return createVNode('div', mergeA11yProps({
        id: p.id,
        'aria-label': p.ariaLabel,
        'aria-describedby': p.ariaDescribedBy,
      }, { class: itemClass }), children);
    };
  },
});

export type { FormSlots, FormItemSlots } from './types';
export type { FormProps, FormRules, FormSetupProps, FormItemProps, FormItemSetupProps, FormRule, FormValidateStatus } from './types';
