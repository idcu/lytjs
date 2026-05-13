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

// ===== Select 组件 =====

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps {
  modelValue?: string | number | (string | number)[];
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
}

export interface SelectSlots {
  default?: () => VNode[];
  empty?: () => VNode[];
}

// ===== Tabs 组件 =====

export interface TabPaneProps {
  label: string;
  name: string;
  disabled?: boolean;
}

export interface TabsProps {
  modelValue?: string;
  type?: 'card' | 'border-card';
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (name: string) => void;
}

export interface TabsSlots {
  default?: () => VNode[];
}

// ===== Table 组件 =====

export interface TableColumn {
  prop?: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  formatter?: (row: any, column: TableColumn, cellValue: any) => string;
}

export interface TableProps {
  data?: any[];
  columns?: TableColumn[];
  stripe?: boolean;
  border?: boolean;
  height?: string | number;
  maxHeight?: string | number;
  class?: string;
  style?: string | Record<string, string>;
  onRowClick?: (row: any, index: number) => void;
  onSortChange?: (column: TableColumn, prop: string, order: 'ascending' | 'descending') => void;
}

export interface TableSlots {
  default?: () => VNode[];
  empty?: () => VNode[];
}

// ===== Icon 组件 =====

export interface IconProps {
  name?: string;
  size?: string;
  color?: string;
  spin?: boolean;
  class?: string;
  style?: string | Record<string, string>;
}

export interface IconSlots {
  default?: () => VNode[];
}

// ===== Badge 组件 =====

export interface BadgeProps {
  count?: number;
  maxCount?: number;
  dot?: boolean;
  showZero?: boolean;
  type?: ComponentStatus;
  offset?: [number, number];
  class?: string;
  style?: string | Record<string, string>;
}

export interface BadgeSlots {
  default?: () => VNode[];
}

// ===== Tag 组件 =====

export interface TagProps {
  type?: ComponentStatus;
  closable?: boolean;
  color?: string;
  size?: ComponentSize;
  class?: string;
  style?: string | Record<string, string>;
  onClose?: () => void;
}

export interface TagSlots {
  default?: () => VNode[];
}

// ===== Spin 组件 =====

export interface SpinProps {
  spinning?: boolean;
  size?: 'small' | 'default' | 'large';
  tip?: string;
  delay?: number;
  class?: string;
  style?: string | Record<string, string>;
}

export interface SpinSlots {
  default?: () => VNode[];
  tip?: () => VNode[];
}

// ===== Empty 组件 =====

export interface EmptyProps {
  description?: string;
  image?: string;
  imageSize?: number;
  class?: string;
  style?: string | Record<string, string>;
}

export interface EmptySlots {
  default?: () => VNode[];
  image?: () => VNode[];
  description?: () => VNode[];
}

// ===== Link 组件 =====

export interface LinkProps {
  type?: ComponentStatus;
  disabled?: boolean;
  underline?: boolean;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  class?: string;
  style?: string | Record<string, string>;
  onClick?: (event: MouseEvent) => void;
}

export interface LinkSlots {
  default?: () => VNode[];
}

// ===== Container 组件 =====

export interface ContainerProps {
  fluid?: boolean;
  class?: string;
  style?: string | Record<string, string>;
}

export interface ContainerSlots {
  default?: () => VNode[];
}

// ===== Divider 组件 =====

export interface DividerProps {
  type?: 'horizontal' | 'vertical';
  contentPosition?: 'left' | 'center' | 'right';
  class?: string;
  style?: string | Record<string, string>;
}

export interface DividerSlots {
  default?: () => VNode[];
}

// ===== Toast 组件 =====

export interface ToastProps {
  type?: 'success' | 'warning' | 'info' | 'error';
  message?: string;
  duration?: number;
  showClose?: boolean;
  onClose?: () => void;
}

export interface ToastSlots {
  default?: () => VNode[];
}

// ===== Alert 组件 =====

export interface AlertProps {
  type?: 'success' | 'warning' | 'info' | 'error';
  title?: string;
  description?: string;
  closable?: boolean;
  showIcon?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  onClose?: () => void;
}

export interface AlertSlots {
  default?: () => VNode[];
  title?: () => VNode[];
  description?: () => VNode[];
}

// ===== Tooltip 组件 =====

export interface TooltipProps {
  content?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  class?: string;
  style?: string | Record<string, string>;
}

export interface TooltipSlots {
  default?: () => VNode[];
  content?: () => VNode[];
}

// ===== Checkbox 组件 =====

export interface CheckboxProps {
  modelValue?: boolean | string | number;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
  name?: string;
  checked?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: boolean) => void;
}

export interface CheckboxSlots {
  default?: () => VNode[];
}

// ===== Radio 组件 =====

export interface RadioProps {
  modelValue?: string | number | boolean;
  label?: string;
  disabled?: boolean;
  name?: string;
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: string | number | boolean) => void;
}

export interface RadioSlots {
  default?: () => VNode[];
}

// ===== Switch 组件 =====

export interface SwitchProps {
  modelValue?: boolean;
  disabled?: boolean;
  activeText?: string;
  inactiveText?: string;
  activeColor?: string;
  inactiveColor?: string;
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: boolean) => void;
}

export interface SwitchSlots {
  default?: () => VNode[];
}

// ===== InputNumber 组件 =====

export interface InputNumberProps {
  modelValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: ComponentSize;
  controls?: boolean;
  precision?: number;
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: number) => void;
}

export interface InputNumberSlots {
  default?: () => VNode[];
}

export type { VNode, Component };
