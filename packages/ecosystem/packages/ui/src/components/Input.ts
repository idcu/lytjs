/**
 * @lytjs/ui - Input 组件
 *
 * 基础输入框组件，支持多种类型和状态
 */

import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import type { InputSetupProps } from './types';

export const Input = defineComponent({
  name: 'LytInput',

  props: {
    modelValue: { type: [String, Number] as unknown as StringConstructor, default: '' },
    type: { type: String, default: 'text' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    showPassword: { type: Boolean, default: false },
    maxlength: { type: Number, default: undefined },
    minlength: { type: Number, default: undefined },
    size: { type: String, default: 'medium' },
    prefixIcon: { type: String, default: '' },
    suffixIcon: { type: String, default: '' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
  },

  setup(props: Record<string, unknown>) {
    const p = props as InputSetupProps;
    const passwordVisible = { current: false };

    const getInputClass = () => {
      const classes = ['lyt-input'];
      if (p.size !== 'medium') classes.push(`lyt-input--${p.size}`);
      if (p.disabled) classes.push('lyt-input--disabled');
      if (p.class) classes.push(p.class);
      return classes.join(' ');
    };

    const getInputStyle = () => {
      if (!p.style) return undefined;
      if (isString(p.style)) return p.style;
      if (isObject(p.style)) {
        return Object.entries(p.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const inputProps: Record<string, unknown> = {
        class: getInputClass(),
        style: getInputStyle(),
        type: p.type === 'password' && passwordVisible.current ? 'text' : p.type,
        value: p.modelValue,
        placeholder: p.placeholder,
        disabled: p.disabled,
        readonly: p.readonly,
        maxlength: p.maxlength,
        minlength: p.minlength,
      };

      return createVNode('input', inputProps, []);
    };
  },
});

export type { InputProps, InputSlots, InputSetupProps } from './types';
