/**
 * @lytjs/ui - VaporInput 组件
 *
 * Vapor 模式的输入框组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 */

import { signal } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';

export interface VaporInputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'textarea';
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  showPassword?: boolean;
  size?: 'large' | 'medium' | 'small';
  class?: string;
  style?: string;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onClear?: () => void;
}

export const VaporInput = {
  name: 'VaporInput',
  props: {
    type: { type: String, default: 'text' },
    modelValue: { type: [String, Number], default: '' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    showPassword: { type: Boolean, default: false },
    size: { type: String, default: 'medium' },
    class: { type: String, default: '' },
    style: { type: String, default: '' },
    onInput: { type: Function, default: undefined },
    onChange: { type: Function, default: undefined },
    onFocus: { type: Function, default: undefined },
    onBlur: { type: Function, default: undefined },
    onClear: { type: Function, default: undefined },
  },
  setup(props: Record<string, unknown>) {
    const p = props as unknown as VaporInputProps;
    const inputValue = signal(String(p.modelValue ?? ''));
    const isFocused = signal(false);
    const showPwd = signal(false);

    const getType = (): string => {
      if (p.type === 'password' && p.showPassword) {
        return showPwd() ? 'text' : 'password';
      }
      return p.type as string;
    };

    const getClasses = (): string => {
      const cls = ['vapor-input'];
      if (p.size !== 'medium') cls.push(`vapor-input--${p.size}`);
      if (p.disabled) cls.push('vapor-input--disabled');
      if (isFocused()) cls.push('vapor-input--focus');
      if (inputValue()) cls.push('vapor-input--has-value');
      if (p.class) cls.push(p.class as string);
      return cls.join(' ');
    };

    const getWrapperClasses = (): string => {
      const cls = ['vapor-input__wrapper'];
      if (p.disabled) cls.push('vapor-input__wrapper--disabled');
      if (isFocused()) cls.push('vapor-input__wrapper--focus');
      if (inputValue() && p.clearable) cls.push('vapor-input__wrapper--clearable');
      return cls.join(' ');
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = target.value;
      inputValue.set(value);
      (p.onInput as ((value: string) => void) | undefined)?.(value);
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      (p.onChange as ((value: string) => void) | undefined)?.(target.value);
    };

    const handleFocus = (event: FocusEvent) => {
      isFocused.set(true);
      (p.onFocus as ((event: FocusEvent) => void) | undefined)?.(event);
    };

    const handleBlur = (event: FocusEvent) => {
      isFocused.set(false);
      (p.onBlur as ((event: FocusEvent) => void) | undefined)?.(event);
    };

    const handleClear = () => {
      inputValue.set('');
      (p.onInput as ((value: string) => void) | undefined)?.('');
      (p.onClear as (() => void) | undefined)?.();
    };

    const togglePassword = () => {
      showPwd.set(!showPwd());
    };

    return () => {
      const inputElement = p.type === 'textarea'
        ? createVNode('textarea', {
            class: getClasses(),
            style: p.style as string || undefined,
            placeholder: p.placeholder as string || undefined,
            disabled: p.disabled || undefined,
            readonly: p.readonly || undefined,
            value: inputValue(),
            onInput: handleInput,
            onChange: handleChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
          })
        : createVNode('input', {
            type: getType(),
            class: getClasses(),
            style: p.style as string || undefined,
            placeholder: p.placeholder as string || undefined,
            disabled: p.disabled || undefined,
            readonly: p.readonly || undefined,
            value: inputValue(),
            onInput: handleInput,
            onChange: handleChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
          });

      const children: any[] = [inputElement];

      if (p.clearable && inputValue() && !p.disabled) {
        children.push(createVNode('span', {
          class: 'vapor-input__clear',
          onClick: handleClear,
        }, ['×'] as any));
      }

      if (p.type === 'password' && p.showPassword) {
        children.push(createVNode('span', {
          class: 'vapor-input__password',
          onClick: togglePassword,
        }, [(showPwd() ? '🙈' : '👁')] as any));
      }

      return createVNode('div', { class: getWrapperClasses() }, children);
    };
  },
};
