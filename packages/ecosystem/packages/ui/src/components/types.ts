/**
 * @lytjs/ui - 类型定义
 *
 * UI 组件库的核心类型定义
 */

import type { VNode, Component } from '@lytjs/vdom';

// ===== 通用类型 =====

export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentStatus = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

// ===== Button 组件 =====

export interface ButtonProps {
  type?: ComponentStatus;
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  plain?: boolean;
  round?: boolean;
  circle?: boolean;
  nativeType?: 'button' | 'submit' | 'reset';
  class?: string;
  style?: string | Record<string, string>;
  onClick?: (event: MouseEvent) => void;
}

export interface ButtonSlots {
  default?: () => VNode[];
  loading?: () => VNode[];
  icon?: () => VNode[];
}

// ===== Input 组件 =====

export interface InputProps {
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  showPassword?: boolean;
  maxlength?: number;
  minlength?: number;
  size?: ComponentSize;
  prefixIcon?: string;
  suffixIcon?: string;
  class?: string;
  style?: string | Record<string, string>;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onClear?: () => void;
}

export interface InputSlots {
  prefix?: () => VNode[];
  suffix?: () => VNode[];
  prepend?: () => VNode[];
  append?: () => VNode[];
}

// ===== Dialog 组件 =====

export interface DialogProps {
  modelValue?: boolean;
  title?: string;
  width?: string | number;
  showClose?: boolean;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  lockScroll?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface DialogSlots {
  header?: () => VNode[];
  default?: () => VNode[];
  footer?: () => VNode[];
}

export type { VNode, Component };
