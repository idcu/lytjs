/**
 * @lytjs/ui - Input 组件
 *
 * 输入框组件，支持双向绑定、清除、密码显示等功能
 */

import type { InputProps, InputSlots } from './types';
import { defineComponent } from '@lytjs/component';
import { createVNode } from '@lytjs/vdom';
import { isString, isObject } from '@lytjs/common-is';
import { signal } from '@lytjs/reactivity';

/**
 * Input 组件
 */
export const Input = defineComponent({
  name: 'LytInput',

  props: {
    modelValue: { type: String, default: '' },
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
    onInput: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onFocus: { type: Function, default: undefined },
    onBlur: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },

  setup(props: any, { slots, emit }: any) {
    const isFocused = signal(false);
    const isPasswordVisible = signal(false);

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      emit('update:modelValue', target.value);
      props.onInput?.(target.value);
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      props.onChange?.(target.value);
    };

    const handleFocus = (event: FocusEvent) => {
      isFocused.set(true);
      props.onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent) => {
      isFocused.set(false);
      props.onBlur?.(event);
    };

    const handleClear = () => {
      emit('update:modelValue', '');
      props.onClear?.();
    };

    const togglePasswordVisible = () => {
      isPasswordVisible.set(!isPasswordVisible());
    };

    const getInputClass = () => {
      const classes = ['lyt-input'];
      if (props.size !== 'medium') classes.push(`lyt-input--${props.size}`);
      if (props.disabled) classes.push('lyt-input--disabled');
      if (isFocused()) classes.push('lyt-input--focused');
      if (slots.prepend) classes.push('lyt-input--prepend');
      if (slots.append) classes.push('lyt-input--append');
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
      const children: any[] = [];

      if (slots.prepend) {
        children.push(createVNode('div', { class: 'lyt-input__prepend' }, slots.prepend()));
      }

      const wrapperChildren: any[] = [];

      if (slots.prefix || props.prefixIcon) {
        wrapperChildren.push(
          createVNode('span', { class: 'lyt-input__prefix' }, 
            slots.prefix ? slots.prefix() : [createVNode('i', { class: props.prefixIcon })]
          )
        );
      }

      const currentType = props.type === 'password' 
        ? (isPasswordVisible() ? 'text' : 'password') 
        : props.type;

      wrapperChildren.push(
        createVNode('input', {
          class: 'lyt-input__inner',
          type: currentType,
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
        })
      );

      const suffixChildren: any[] = [];

      if (props.clearable && !props.disabled && !props.readonly && String(props.modelValue).length > 0) {
        suffixChildren.push(
          createVNode('span', { class: 'lyt-input__clear', onClick: handleClear }, [
            createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
              createVNode('path', {
                d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 583.3l-99.4 98.6-66.1.3-.3-66.1 98.7-99.4-98.7-99.4.3-66.1 66.1-.3L512 449.3l99.4-98.6 66-.3.3 66.1-98.7 99.4 98.7 99.4-.3 66.1z',
                fill: 'currentColor',
              }),
            ]),
          ])
        );
      }

      if (props.showPassword && props.type === 'password' && !props.disabled) {
        suffixChildren.push(
          createVNode('span', { class: 'lyt-input__password-toggle', onClick: togglePasswordVisible }, [
            createVNode('svg', { viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
              createVNode('path', {
                d: isPasswordVisible()
                  ? 'M942.2 486.2C847.4 345.8 692.6 240 512 240c-180.6 0-335.4 105.8-430.2 246.2-15.4 24.1-15.4 54.8 0 78.9C176.6 705.8 331.4 812 512 812c180.6 0 335.4-106.2 430.2-246.9 15.4-24.1 15.4-54.8 0-78.9zM512 714c-106 0-192-86-192-192s86-192 192-192 192 86 192 192-86 192-192 192zm0-320c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128z'
                  : 'M932.6 621.8c-13.5-21.7-28.1-42.4-43.6-62.1C942.2 458.8 976 369.4 976 288c0-139.2-111.8-252-252-252-106.4 0-198.2 66.8-235.2 161.4-23.4-4.5-47.4-7.4-71.8-7.4s-48.4 2.9-71.8 7.4C308.2 102.8 216.4 36 110 36-30.2 36-142 148.8-142 288c0 81.4 33.8 170.8 87 271.7-15.5 19.7-30.1 40.4-43.6 62.1-6.6 10.6-6.6 24.2 0 34.8C-30.1 724.2 136.2 880 416.8 880c23.6 0 46.8-1.4 69.6-4.2 27.8 43.2 67.8 74.2 115.6 74.2s87.8-31 115.6-74.2c22.8 2.8 46 4.2 69.6 4.2 280.6 0 446.9-155.8 515.4-223.5 6.6-10.6 6.6-24.2 0-34.8zM512 800c-53 0-96-43-96-96s43-96 96-96 96 43 96 96-43 96-96 96z',
                fill: 'currentColor',
              }),
            ]),
          ])
        );
      }

      if (slots.suffix || props.suffixIcon) {
        suffixChildren.push(
          createVNode('span', { class: 'lyt-input__suffix-custom' }, 
            slots.suffix ? slots.suffix() : [createVNode('i', { class: props.suffixIcon })]
          )
        );
      }

      if (suffixChildren.length > 0) {
        wrapperChildren.push(createVNode('span', { class: 'lyt-input__suffix' }, suffixChildren));
      }

      children.push(createVNode('div', { class: 'lyt-input__wrapper' }, wrapperChildren));

      if (slots.append) {
        children.push(createVNode('div', { class: 'lyt-input__append' }, slots.append()));
      }

      return createVNode('div', { class: getInputClass(), style: getInputStyle() }, children);
    };
  },
});

export type { InputProps, InputSlots };
