/**
 * @lytjs/ui - Form 组件
 *
 * 表单组件，支持表单验证和布局
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';

export interface FormRule {
  required?: boolean;
  message?: string;
  pattern?: RegExp;
  validator?: (value: unknown, model: Record<string, unknown>) => boolean | string;
  min?: number;
  max?: number;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'date' | 'email' | 'url';
}

export interface FormRules {
  [field: string]: FormRule[];
}

export interface FormSetupProps {
  model: Record<string, unknown>;
  rules: FormRules;
  labelWidth: string;
  labelPosition: 'left' | 'right' | 'top';
  class: string;
  onSubmit: ((data: Record<string, unknown>) => void) | undefined;
}

export interface FormSlots {
  default?: () => VNode[];
}

export interface FormItemSetupProps {
  label: string;
  prop: string;
  required: boolean;
  rules: FormRule[];
  error: string;
  validateStatus: 'success' | 'error' | 'validating' | '';
}

export interface FormItemSlots {
  default?: () => VNode[];
  label?: () => VNode[];
  error?: () => VNode[];
}

export const Form = defineComponent({
  name: 'LytForm',

  props: {
    model: { type: Object, default: (): Record<string, unknown> => ({}) },
    rules: { type: Object, default: (): FormRules => ({}) },
    labelWidth: { type: String, default: '100px' },
    labelPosition: { type: String, default: 'right' },
    class: { type: String, default: '' },
    onSubmit: { type: Function, default: undefined },
  },

  setup(props: FormSetupProps, { slots }: { slots: FormSlots }) {
    const errors = signal<Record<string, string>>({});

    const validateField = (field: string): boolean => {
      const rules = props.rules[field];
      if (!rules || rules.length === 0) return true;

      const value = props.model[field];
      
      for (const rule of rules) {
        if (rule.required && (!value || value === '')) {
          errors.set({ ...errors(), [field]: rule.message || '此字段必填' });
          return false;
        }
        if (rule.pattern && !rule.pattern.test(String(value || ''))) {
          errors.set({ ...errors(), [field]: rule.message || '格式不正确' });
          return false;
        }
        if (rule.validator) {
          const result = rule.validator(value, props.model);
          if (result !== true) {
            errors.set({ ...errors(), [field]: typeof result === 'string' ? result : '验证失败' });
            return false;
          }
        }
      }
      
      const newErrors = { ...errors() };
      delete newErrors[field];
      errors.set(newErrors);
      return true;
    };

    const validate = (): boolean => {
      let isValid = true;
      
      for (const field in props.rules) {
        if (!validateField(field)) {
          isValid = false;
        }
      }
      
      return isValid;
    };

    const resetFields = () => {
      errors.set({});
    };

    const clearValidate = () => {
      errors.set({});
    };

    const handleSubmit = (event: Event) => {
      event.preventDefault();
      if (validate()) {
        props.onSubmit?.(props.model);
      }
    };

    return () => {
      const formClass = [
        'lyt-form',
        `lyt-form--label-${props.labelPosition}`,
        props.class,
      ].filter(Boolean).join(' ');

      const children: VNode[] = slots.default ? slots.default() : [];

      return createVNode('form', {
        class: formClass,
        onSubmit: handleSubmit,
      }, [children]);
    };
  },
});

export const FormItem = defineComponent({
  name: 'LytFormItem',

  props: {
    label: { type: String, default: '' },
    prop: { type: String, default: '' },
    required: { type: Boolean, default: false },
    rules: { type: [Object, Array], default: () => [] },
    error: { type: String, default: '' },
    validateStatus: { type: String, default: '' },
  },

  setup(props: FormItemSetupProps, { slots }: { slots: FormItemSlots }) {
    return () => {
      const itemClass = [
        'lyt-form-item',
        props.error ? 'lyt-form-item--error' : '',
        props.validateStatus ? `lyt-form-item--${props.validateStatus}` : '',
      ].filter(Boolean).join(' ');

      const labelStyle = props.label ? { width: '100px' } : {};

      const children: VNode[] = [];

      if (props.label) {
        children.push(createVNode('label', {
          class: 'lyt-form-item__label',
          style: labelStyle,
        }, [props.label]));
      }

      if (slots.default) {
        children.push(createVNode('div', { class: 'lyt-form-item__content' }, [slots.default()]));
      }

      if (props.error) {
        children.push(createVNode('div', { class: 'lyt-form-item__error' }, [props.error]));
      }

      return createVNode('div', { class: itemClass }, children);
    };
  },
});

export type { FormProps, FormSlots, FormRules, FormRule } from './types';
