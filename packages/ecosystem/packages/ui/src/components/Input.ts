/**
 * @lytjs/ui - Input 组件
 *
 * 基础输入框组件，支持多种类型和状态
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, type VNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import type { ComponentSize } from './types';

export interface InputSetupProps {
  modelValue: string | number;
  type: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  clearable: boolean;
  showPassword: boolean;
  maxlength: number;
  minlength: number;
  size: ComponentSize;
  prefixIcon: string;
  suffixIcon: string;
  class: string;
  style: string;
}

export interface InputSlots {
  prefix?: () => VNode[];
  suffix?: () => VNode[];
  prepend?: () => VNode[];
  append?: () => VNode[];
}

export const Input = defineComponent({
  name: 'LytInput',

  props: {
    modelValue: { type: [String, Number], default: '' },
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

  setup(props: InputSetupProps, { slots }: { slots: InputSlots }) {
    const inputRef = { current: null as HTMLInputElement | null };
    const passwordVisible = { current: false };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = props.type === 'number' ? Number(target.value) : target.value;
      // 在实际实现中应该 emit('update:modelValue', value)
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = target.value;
      // 在实际实现中应该 emit('change', value)
    };

    const handleFocus = (event: FocusEvent) => {
      // emit('focus', event)
    };

    const handleBlur = (event: FocusEvent) => {
      // emit('blur', event)
    };

    const handleClear = () => {
      // emit('update:modelValue', '')
      // emit('clear')
    };

    const getInputClass = () => {
      const classes = ['lyt-input'];
      if (props.size !== 'medium') classes.push(`lyt-input--${props.size}`);
      if (props.disabled) classes.push('lyt-input--disabled');
      if (props.class) classes.push(props.class);
      return classes.join(' ');
    };

    const getInputStyle = () => {
      if (!props.style) return undefined;
      if (isString(props.style)) return props.style;
      if (isObject(props.style)) {
        return Object.entries(props.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
      }
      return undefined;
    };

    return () => {
      const children: VNode[] = [];
      const inputProps: Record<string, unknown> = {
        class: getInputClass(),
        style: getInputStyle(),
        type: props.type === 'password' && passwordVisible.current ? 'text' : props.type,
        value: props.modelValue,
        placeholder: props.placeholder,
        disabled: props.disabled,
        readonly: props.readonly,
        maxlength: props.maxlength,
        minlength: props.minlength,
        onInput: handleInput,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
      };

      return createVNode('input', inputProps, children);
    };
  },
});

export type { InputProps, InputSlots } from './types';
