/**
 * @lytjs/ui - Input 组件
 *
 * 基础输入框组件，支持多种类型和状态
 */

import { defineComponent } from '@lytjs/component';
import { createVNode, createTextVNode, type VNode } from '@lytjs/vdom';
import { signal } from '@lytjs/reactivity';
import { isString, isObject } from '@lytjs/common-is';
import { getFormControlA11yProps, getButtonA11yProps, mergeA11yProps } from '@lytjs/common-a11y';
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
    ariaLabel: { type: String, default: '' },
    ariaDescribedBy: { type: String, default: '' },
    ariaInvalid: { type: Boolean, default: false },
    ariaRequired: { type: Boolean, default: false },
    autocomplete: { type: String, default: '' },
    name: { type: String, default: '' },
    id: { type: String, default: '' },
    tabIndex: { type: Number, default: undefined },
  },

  setup(props: Record<string, unknown>) {
    const p = props as InputSetupProps;
    const passwordVisible = signal(false);
    const isFocused = signal(false);

    const getInputClass = () => {
      const classes = ['lyt-input'];
      if (p.size !== 'medium') classes.push(`lyt-input--${p.size}`);
      if (p.disabled) classes.push('lyt-input--disabled');
      if (isFocused()) classes.push('lyt-input--focused');
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

    const getInputType = () => {
      if (p.type === 'password' && p.showPassword) {
        return passwordVisible() ? 'text' : 'password';
      }
      return p.type;
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      p.onInput?.(target.value);
    };

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      p.onChange?.(target.value);
    };

    const handleFocus = (e: FocusEvent) => {
      isFocused.set(true);
      p.onFocus?.(e);
    };

    const handleBlur = (e: FocusEvent) => {
      isFocused.set(false);
      p.onBlur?.(e);
    };

    const handleClear = () => {
      p.onClear?.();
      p.onInput?.('');
      p.onChange?.('');
    };

    const togglePasswordVisibility = () => {
      passwordVisible.set(!passwordVisible());
    };

    return () => {
      const children: VNode[] = [];

      // 前缀图标
      if (p.prefixIcon) {
        children.push(
          createVNode('span', { class: 'lyt-input__prefix' }, [
            createVNode('i', { class: p.prefixIcon }, []),
          ]),
        );
      }

      // 输入框
      const a11yProps = getFormControlA11yProps({
        id: p.id,
        ariaLabel: p.ariaLabel,
        ariaDescribedBy: p.ariaDescribedBy,
        ariaInvalid: p.ariaInvalid,
        ariaRequired: p.ariaRequired,
        disabled: p.disabled,
        tabIndex: p.tabIndex,
      });
      const inputProps = mergeA11yProps(a11yProps, {
        class: 'lyt-input__inner',
        style: getInputStyle(),
        type: getInputType(),
        value: p.modelValue,
        placeholder: p.placeholder,
        disabled: p.disabled,
        readonly: p.readonly,
        maxlength: p.maxlength,
        minlength: p.minlength,
        'aria-readonly': p.readonly,
        autocomplete: p.autocomplete,
        name: p.name,
        onInput: handleInput,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
      });
      children.push(createVNode('input', inputProps, []));

      // 后缀图标或清除按钮
      const suffixChildren: VNode[] = [];

      // 清除按钮
      if (p.clearable && p.modelValue) {
        const clearBtnProps = getButtonA11yProps({
          ariaLabel: 'Clear input',
        });
        suffixChildren.push(
          createVNode(
            'span',
            mergeA11yProps(clearBtnProps, {
              class: 'lyt-input__clear',
              onClick: handleClear,
            }),
            [createTextVNode('×')],
          ),
        );
      }

      // 密码显示切换按钮
      if (p.type === 'password' && p.showPassword) {
        const toggleBtnProps = getButtonA11yProps({
          ariaLabel: passwordVisible() ? 'Hide password' : 'Show password',
        });
        suffixChildren.push(
          createVNode(
            'span',
            mergeA11yProps(toggleBtnProps, {
              class: 'lyt-input__password',
              onClick: togglePasswordVisibility,
            }),
            [createTextVNode(passwordVisible() ? '🙈' : '👁️')],
          ),
        );
      }

      // 后缀图标
      if (p.suffixIcon) {
        suffixChildren.push(createVNode('i', { class: p.suffixIcon }, []));
      }

      if (suffixChildren.length > 0) {
        children.push(createVNode('span', { class: 'lyt-input__suffix' }, suffixChildren));
      }

      return createVNode('div', { class: getInputClass() }, children);
    };
  },
});

export type { InputProps, InputSlots, InputSetupProps } from './types';
