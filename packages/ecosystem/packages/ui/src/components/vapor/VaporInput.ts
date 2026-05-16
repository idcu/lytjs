/**
 * @lytjs/ui - VaporInput 组件
 *
 * Vapor 模式的输入框组件，使用 Signal + 直接 DOM 操作
 * 性能最优，适用于高频更新场景
 *
 * 注意：这是一个占位符实现
 * 完整的 Vapor 组件需要 @lytjs/renderer/vapor 模块支持
 */

import { signal, computed } from '@lytjs/reactivity';

export interface VaporInputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
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
    type: { type: 'string', default: 'text' },
    modelValue: { type: 'string', default: '' },
    placeholder: { type: 'string', default: '' },
    disabled: { type: 'boolean', default: false },
    readonly: { type: 'boolean', default: false },
    clearable: { type: 'boolean', default: false },
    showPassword: { type: 'boolean', default: false },
    size: { type: 'string', default: 'medium' },
    class: { type: 'string', default: '' },
    style: { type: 'string', default: '' },
    onInput: { type: 'function', default: undefined },
    onChange: { type: 'function', default: undefined },
    onFocus: { type: 'function', default: undefined },
    onBlur: { type: 'function', default: undefined },
    onClear: { type: 'function', default: undefined },
  },
  setup(props: VaporInputProps) {
    const inputValue = signal(String(props.modelValue ?? ''));
    const isFocused = signal(false);
    const showPwd = signal(false);

    const type = computed(() => {
      if (props.type === 'password' && props.showPassword) {
        return showPwd() ? 'text' : 'password';
      }
      return props.type;
    });

    const classes = computed(() => {
      const cls = ['vapor-input'];
      if (props.size !== 'medium') cls.push(`vapor-input--${props.size}`);
      if (props.disabled) cls.push('vapor-input--disabled');
      if (isFocused()) cls.push('vapor-input--focus');
      if (inputValue()) cls.push('vapor-input--has-value');
      if (props.class) cls.push(props.class);
      return cls.join(' ');
    });

    const wrapperClasses = computed(() => {
      const cls = ['vapor-input__wrapper'];
      if (props.disabled) cls.push('vapor-input__wrapper--disabled');
      if (isFocused()) cls.push('vapor-input__wrapper--focus');
      if (inputValue() && props.clearable) cls.push('vapor-input__wrapper--clearable');
      return cls.join(' ');
    });

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = target.value;
      inputValue.set(value);
      props.onInput?.(value);
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
      inputValue.set('');
      props.onInput?.('');
      props.onClear?.();
    };

    const togglePassword = () => {
      showPwd.set(!showPwd());
    };

    return {
      inputValue,
      type,
      classes,
      wrapperClasses,
      handleInput,
      handleChange,
      handleFocus,
      handleBlur,
      handleClear,
      togglePassword,
      showPwd,
    };
  },
  template: `
    <div class={wrapperClasses}>
      {props.type === 'textarea' ? (
        <textarea
          class={classes}
          style={props.style}
          placeholder={props.placeholder}
          disabled={props.disabled}
          readonly={props.readonly}
          value={inputValue}
          onInput={handleInput}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <>
          <input
            type={type}
            class={classes}
            style={props.style}
            placeholder={props.placeholder}
            disabled={props.disabled}
            readonly={props.readonly}
            value={inputValue}
            onInput={handleInput}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {props.clearable && inputValue && !props.disabled && (
            <span class="vapor-input__clear" onClick={handleClear}>×</span>
          )}
          {props.type === 'password' && props.showPassword && (
            <span class="vapor-input__password" onClick={togglePassword}>
              {showPwd ? '🙈' : '👁'}
            </span>
          )}
        </>
      )}
    </div>
  `,
};
