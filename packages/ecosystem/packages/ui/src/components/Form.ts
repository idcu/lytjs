/**
 * @lytjs/ui - Form 组件
 *
 * 表单组件，支持表单验证和布局
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import type { FormRules, FormSetupProps, FormSlots, FormItemSetupProps, FormItemSlots } from './types';

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

  setup(props: Record<string, unknown>, { slots }: { slots: FormSlots }) {
    const p = props as FormSetupProps;
    const errors = signal<Record<string, string>>({});

    const validateField = (field: string): boolean => {
      const rules = p.rules[field];
      if (!rules || rules.length === 0) return true;

      const value = p.model[field];

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
          const result = rule.validator(value, p.model);
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

      for (const field in p.rules) {
        if (!validateField(field)) {
          isValid = false;
        }
      }

      return isValid;
    };

    const handleSubmit = (event: Event) => {
      event.preventDefault();
      if (validate()) {
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
        class: formClass,
        onSubmit: handleSubmit,
      }, children);
    };
  },
});

export const FormItem = defineComponent({
  name: 'LytFormItem',

  props: {
    label: { type: String, default: '' },
    prop: { type: String, default: '' },
    required: { type: Boolean, default: false },
    rules: { type: [Object, Array] as unknown as StringConstructor, default: () => [] },
    error: { type: String, default: '' },
    validateStatus: { type: String, default: '' },
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
        children.push(createVNode('div', { class: 'lyt-form-item__error' }, [createVNode('span', {}, String(p.error))]));
      }

      return createVNode('div', { class: itemClass }, children);
    };
  },
});

export type { FormSlots, FormItemSlots } from './types';
export type { FormProps, FormRules, FormSetupProps, FormItemProps, FormItemSetupProps, FormRule, FormValidateStatus } from './types';
