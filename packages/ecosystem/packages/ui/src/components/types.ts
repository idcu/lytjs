/**
 * @lytjs/ui - 类型定义
 *
 * UI 组件库的核心类型定义
 */

import type { VNode, Component } from '@lytjs/vdom';

// ===== 通用类型 =====

export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentStatus = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type Placement = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'left' | 'center' | 'right';
export type Direction = 'horizontal' | 'vertical';
export type ContentPosition = 'left' | 'center' | 'right';
export type ToastType = 'success' | 'warning' | 'info' | 'error';
export type AlertType = 'success' | 'warning' | 'info' | 'error';
export type TableAlign = 'left' | 'center' | 'right';
export type TableSortOrder = 'ascending' | 'descending' | '';

export type NativeType = 'button' | 'submit' | 'reset';
export type Target = '_blank' | '_self' | '_parent' | '_top';

// ===== Button 组件 =====

export type ButtonNativeType = 'button' | 'submit' | 'reset';

export interface ButtonSetupProps extends Record<string, unknown> {
  type: ComponentStatus;
  size: ComponentSize;
  disabled: boolean;
  loading: boolean;
  plain: boolean;
  round: boolean;
  circle: boolean;
  nativeType: ButtonNativeType;
  class: string;
  style: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  tabIndex?: number;
  onClick?: (event: MouseEvent) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface ButtonProps {
  type?: ComponentStatus;
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  plain?: boolean;
  round?: boolean;
  circle?: boolean;
  nativeType?: ButtonNativeType;
  class?: string;
  style?: string | Record<string, string>;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  onClick?: (event: MouseEvent) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface ButtonSlots {
  default?: () => VNode[];
  loading?: () => VNode[];
  icon?: () => VNode[];
}

// ===== Input 组件 =====

export interface InputSetupProps extends Record<string, unknown> {
  modelValue: string | number;
  type: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  clearable: boolean;
  showPassword: boolean;
  maxlength?: number;
  minlength?: number;
  size: ComponentSize;
  prefixIcon: string;
  suffixIcon: string;
  class: string;
  style: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaInvalid: boolean;
  ariaRequired: boolean;
  autocomplete: string;
  name: string;
  id: string;
  tabIndex?: number;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onClear?: () => void;
}

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
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  autocomplete?: string;
  name?: string;
  id?: string;
  tabIndex?: number;
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

export interface DialogSetupProps extends Record<string, unknown> {
  modelValue: boolean;
  title: string;
  width: string | number;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  class: string;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaModal?: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface DialogSlots {
  header?: () => VNode[];
  default?: () => VNode[];
  footer?: () => VNode[];
}

export interface DialogSetupProps extends Record<string, unknown> {
  modelValue: boolean;
  title: string;
  width: string | number;
  top: string;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  class: string;
  style?: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaModal: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface ModalProps {
  modelValue?: boolean;
  title?: string;
  width?: string | number;
  top?: string;
  showClose?: boolean;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  lockScroll?: boolean;
  draggable?: boolean;
  fullscreen?: boolean;
  appendToBody?: boolean;
  customClass?: string;
  class?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaModal?: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface ModalSlots {
  header?: () => VNode[];
  default?: () => VNode[];
  footer?: () => VNode[];
}

export interface ModalSetupProps extends Record<string, unknown> {
  modelValue: boolean;
  title: string;
  width: string | number;
  top: string;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  draggable: boolean;
  fullscreen: boolean;
  appendToBody: boolean;
  customClass: string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaModal: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

// ===== Select 组件 =====

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectSetupProps extends Record<string, unknown> {
  modelValue: string | number | (string | number)[];
  options: SelectOption[];
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  size: ComponentSize;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaInvalid: boolean;
  ariaRequired: boolean;
  tabIndex?: number;
  onChange?: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
  onVisibleChange?: (visible: boolean) => void;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  tabIndex?: number;
  onChange?: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
  onKeydown?: (event: KeyboardEvent) => void;
  onVisibleChange?: (visible: boolean) => void;
}

export interface SelectSlots {
  default?: () => VNode[];
  option?: (option: SelectOption) => VNode[];
  empty?: () => VNode[];
}

// ===== Tabs 组件 =====

export interface TabPaneSetupProps extends Record<string, unknown> {
  label: string;
  name: string;
  disabled: boolean;
  closable: boolean;
}

export interface TabPaneSlots {
  default?: () => VNode[];
}

export interface TabPaneProps {
  label: string;
  name: string;
  disabled?: boolean;
  closable?: boolean;
}

export interface TabsSetupProps extends Record<string, unknown> {
  modelValue: string;
  type: '' | 'card' | 'border-card';
  closable: boolean;
  addable: boolean;
  editable: boolean;
  draggable: boolean;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onChange?: (name: string) => void;
  onTabClick?: (pane: { props: TabPaneSetupProps; children: VNode[] }, index: number) => void;
  onTabRemove?: (name: string) => void;
  onTabAdd?: () => void;
  onTabDragStart?: (index: number) => void;
  onTabDragEnd?: (fromIndex: number, toIndex: number) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface TabsProps {
  modelValue?: string;
  type?: 'card' | 'border-card';
  class?: string;
  style?: string | Record<string, string>;
  closable?: boolean;
  addable?: boolean;
  editable?: boolean;
  draggable?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (name: string) => void;
  onTabClick?: (pane: { props: TabPaneProps; children: VNode[] }, index: number) => void;
  onTabRemove?: (name: string) => void;
  onTabAdd?: () => void;
  onTabDragStart?: (index: number) => void;
  onTabDragEnd?: (fromIndex: number, toIndex: number) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface TabsSlots {
  default?: () => VNode[];
}

// ===== Cascader 组件 =====

export interface CascaderOption {
  value: string | number;
  label: string;
  children?: CascaderOption[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
}

export interface CascaderSetupProps extends Record<string, unknown> {
  options: CascaderOption[];
  modelValue: (string | number)[] | Array<(string | number)[]>;
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  filterable: boolean;
  checkStrictly: boolean;
  showAllLevels: boolean;
  collapseTags: boolean;
  separator: string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  load?: (node: CascaderOption, resolve: (children: CascaderOption[]) => void) => void;
  onChange?: (value: (string | number)[] | Array<(string | number)[]>) => void;
  onExpandChange?: (value: (string | number)[]) => void;
  onVisibleChange?: (visible: boolean) => void;
  onRemoveTag?: (value: Array<(string | number)[]>) => void;
  onClear?: () => void;
}

export interface CascaderProps {
  options?: CascaderOption[];
  modelValue?: (string | number)[] | Array<(string | number)[]>;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  filterable?: boolean;
  checkStrictly?: boolean;
  showAllLevels?: boolean;
  collapseTags?: boolean;
  separator?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  load?: (node: CascaderOption, resolve: (children: CascaderOption[]) => void) => void;
  onChange?: (value: (string | number)[] | Array<(string | number)[]>) => void;
  onExpandChange?: (value: (string | number)[]) => void;
  onVisibleChange?: (visible: boolean) => void;
  onRemoveTag?: (value: (string | number)[]) => void;
  onClear?: () => void;
}

export interface CascaderSlots {
  default?: (option: CascaderOption) => VNode[];
  empty?: () => VNode[];
}

// ===== DatePicker 组件 =====

export type DatePickerType = 'date' | 'datetime' | 'daterange' | 'datetimerange';

export interface DatePickerShortcut {
  text: string;
  value: Date | Date[];
  onClick?: () => void;
}

export interface DatePickerSetupProps extends Record<string, unknown> {
  modelValue: string | Date | (string | Date)[] | null;
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  format: string;
  type: DatePickerType;
  disabledDate?: (date: Date) => boolean;
  shortcuts: DatePickerShortcut[];
  class: string;
  onChange?: (value: string | Date | (string | Date)[] | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface DatePickerProps {
  modelValue?: string | Date | (string | Date)[] | null;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  format?: string;
  type?: DatePickerType;
  disabledDate?: (date: Date) => boolean;
  shortcuts?: DatePickerShortcut[];
  class?: string;
  style?: string | Record<string, string>;
  onChange?: (value: string | Date | (string | Date)[] | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface DatePickerSlots {
  default?: () => VNode[];
  footer?: () => VNode[];
}

// ===== Table 组件 =====

export interface TableColumn {
  prop?: string;
  label: string;
  width?: string | number;
  align?: TableAlign;
  sortable?: boolean;
  formatter?: (row: TableRowData, column: TableColumn, cellValue: unknown) => string;
}

export type TableRowData = Record<string, unknown>;
export type TableData = TableRowData[];
export type TableSortCallback = (column: TableColumn, prop: string, order: TableSortOrder) => void;
export type TableRowClickCallback = (row: TableRowData, index: number) => void;

export interface TableSetupProps extends Record<string, unknown> {
  data: TableData;
  columns: TableColumn[];
  stripe: boolean;
  border: boolean;
  rowKey: string;
  showSelection: boolean;
  highlightCurrentRow: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onRowClick?: TableRowClickCallback;
  onSortChange?: TableSortCallback;
  onSelectionChange?: (rows: TableData) => void;
}

export interface TableProps {
  data?: TableData;
  columns?: TableColumn[];
  stripe?: boolean;
  border?: boolean;
  height?: string | number;
  maxHeight?: string | number;
  rowKey?: string;
  showSelection?: boolean;
  highlightCurrentRow?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onRowClick?: TableRowClickCallback;
  onSortChange?: TableSortCallback;
  onSelectionChange?: (rows: TableData) => void;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface IconSetupProps extends Record<string, unknown> {
  name?: string;
  size?: string;
  color?: string;
  spin?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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

export interface BadgeSetupProps extends Record<string, unknown> {
  count: number;
  maxCount: number;
  dot: boolean;
  showZero: boolean;
  type: string;
  offset?: number[];
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}



// ===== Tag 组件 =====

export interface TagProps {
  type?: ComponentStatus;
  closable?: boolean;
  color?: string;
  size?: ComponentSize;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onClose?: () => void;
}

export interface TagSlots {
  default?: () => VNode[];
}

export interface TagSetupProps extends Record<string, unknown> {
  type: ComponentStatus;
  closable: boolean;
  color: string;
  size: ComponentSize;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onClose?: () => void;
}

// ===== Spin 组件 =====

export interface SpinProps {
  spinning?: boolean;
  size?: 'small' | 'default' | 'large';
  tip?: string;
  delay?: number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface SpinSetupProps extends Record<string, unknown> {
  spinning?: boolean;
  size?: 'small' | 'default' | 'large';
  tip?: string;
  delay?: number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface EmptySetupProps extends Record<string, unknown> {
  description?: string;
  image?: string;
  imageSize?: number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface LinkSetupProps extends Record<string, unknown> {
  type?: ComponentStatus;
  disabled?: boolean;
  underline?: boolean;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface DividerSetupProps extends Record<string, unknown> {
  type?: 'horizontal' | 'vertical';
  contentPosition?: 'left' | 'center' | 'right';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onClose?: () => void;
}

export interface ToastSlots {
  default?: () => VNode[];
}

export interface ToastSetupProps extends Record<string, unknown> {
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  duration: number;
  position: string;
  icon: string;
  closable: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onClose?: () => void;
}

// ===== Form 组件 =====

export type FormValidateStatus = 'success' | 'error' | 'validating' | '';

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

export interface FormSetupProps extends Record<string, unknown> {
  model: Record<string, unknown>;
  rules: FormRules;
  labelWidth: string;
  labelPosition: 'left' | 'right' | 'top';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onSubmit?: (data: Record<string, unknown>) => void;
}

export interface FormProps {
  model?: Record<string, unknown>;
  rules?: FormRules;
  labelWidth?: string;
  labelPosition?: 'left' | 'right' | 'top';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onSubmit?: (data: Record<string, unknown>) => void;
}

export interface FormSlots {
  default?: () => VNode[];
}

export interface FormItemSetupProps extends Record<string, unknown> {
  label: string;
  prop: string;
  required: boolean;
  rules: FormRule[];
  error: string;
  validateStatus: FormValidateStatus;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
}

export interface FormItemProps {
  label?: string;
  prop?: string;
  required?: boolean;
  rules?: FormRule[];
  error?: string;
  validateStatus?: FormValidateStatus;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface FormItemSlots {
  default?: () => VNode[];
  label?: () => VNode[];
  error?: () => VNode[];
}

// ===== Menu 组件 =====

export interface MenuItem {
  index: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  children?: MenuItem[];
}

export interface MenuSetupProps extends Record<string, unknown> {
  mode: 'horizontal' | 'vertical';
  defaultActive: string;
  defaultOpeneds: string[];
  uniqueOpened: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onSelect?: (index: string) => void;
  onOpen?: (index: string) => void;
  onClose?: (index: string) => void;
}

export interface MenuProps {
  mode?: 'horizontal' | 'vertical';
  defaultActive?: string;
  defaultOpeneds?: string[];
  uniqueOpened?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onSelect?: (index: string) => void;
  onOpen?: (index: string) => void;
  onClose?: (index: string) => void;
}

export interface MenuSlots {
  default?: () => VNode[];
}

// ===== Alert 组件 =====

export type AlertEffect = 'light' | 'dark';

export interface AlertSetupProps extends Record<string, unknown> {
  title: string;
  description: string;
  type: AlertType;
  closable: boolean;
  showIcon: boolean;
  effect: AlertEffect;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onClose?: () => void;
}

export interface AlertProps {
  type?: AlertType;
  title?: string;
  description?: string;
  closable?: boolean;
  showIcon?: boolean;
  effect?: AlertEffect;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface TooltipSetupProps extends Record<string, unknown> {
  content?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
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
  id?: string;
  checked?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  tabIndex?: number;
  onChange?: (value: boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface CheckboxSlots {
  default?: () => VNode[];
}

export interface CheckboxSetupProps extends Record<string, unknown> {
  modelValue: boolean | string | number;
  label: string;
  trueLabel?: string | number;
  falseLabel?: string | number;
  disabled: boolean;
  checked: boolean;
  indeterminate: boolean;
  name: string;
  id: string;
  class: string;
  style?: string | Record<string, string>;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaInvalid: boolean;
  ariaRequired: boolean;
  tabIndex?: number;
  onChange?: (value: boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

// ===== Radio 组件 =====

export interface RadioProps {
  modelValue?: string | number | boolean;
  label?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  class?: string;
  style?: string | Record<string, string>;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  tabIndex?: number;
  onChange?: (value: string | number | boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface RadioSlots {
  default?: () => VNode[];
}

export interface RadioSetupProps extends Record<string, unknown> {
  modelValue: string | number | boolean;
  label?: string | number | boolean;
  disabled: boolean;
  name: string;
  id: string;
  class: string;
  style?: string | Record<string, string>;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaInvalid: boolean;
  ariaRequired: boolean;
  tabIndex?: number;
  onChange?: (value: string | number | boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
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
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  tabIndex?: number;
  onChange?: (value: boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface SwitchSlots {
  default?: () => VNode[];
  active?: () => VNode[];
  inactive?: () => VNode[];
}

export interface SwitchSetupProps extends Record<string, unknown> {
  modelValue: boolean;
  disabled: boolean;
  loading: boolean;
  size: string;
  activeText: string;
  inactiveText: string;
  activeColor: string;
  inactiveColor: string;
  activeValue: boolean | string | number;
  inactiveValue: boolean | string | number;
  name: string;
  id: string;
  class: string;
  style?: string | Record<string, string>;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaInvalid: boolean;
  ariaRequired: boolean;
  tabIndex?: number;
  onChange?: (value: boolean) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

// ===== InputNumber 组件 =====

export interface InputNumberProps {
  modelValue?: number;
  min?: number;
  max?: number;
  step?: number;
  stepStrictly?: boolean;
  disabled?: boolean;
  size?: ComponentSize;
  controls?: boolean;
  controlsPosition?: string;
  precision?: number;
  name?: string;
  label?: string;
  placeholder?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  tabIndex?: number;
  onChange?: (value: number | undefined) => void;
  onInput?: (value: number | undefined) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface InputNumberSlots {
  default?: () => VNode[];
}

export interface InputNumberSetupProps extends Record<string, unknown> {
  modelValue: number | undefined;
  min: number;
  max: number;
  step: number;
  stepStrictly: boolean;
  precision: number | undefined;
  size: string;
  disabled: boolean;
  controls: boolean;
  controlsPosition: string;
  name: string;
  label: string;
  placeholder: string;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaRequired: boolean;
  ariaInvalid: boolean;
  tabIndex?: number;
  onChange?: (value: number | undefined) => void;
  onInput?: (value: number | undefined) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

// ===== Transfer 组件 =====

export interface TransferOption {
  key: string | number;
  label: string;
  disabled?: boolean;
}

export interface TransferProps {
  data?: TransferOption[];
  modelValue?: (string | number)[];
  filterable?: boolean;
  filterPlaceholder?: string;
  titles?: string[];
  buttonTexts?: string[];
  leftDefaultChecked?: (string | number)[];
  rightDefaultChecked?: (string | number)[];
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (value: (string | number)[], direction: 'left' | 'right', movedKeys: (string | number)[]) => void;
  onLeftCheckChange?: (checked: (string | number)[]) => void;
  onRightCheckChange?: (checked: (string | number)[]) => void;
}

export interface TransferSetupProps extends Record<string, unknown> {
  data: TransferOption[];
  modelValue: (string | number)[];
  filterable: boolean;
  filterPlaceholder: string;
  titles: string[];
  buttonTexts: string[];
  leftDefaultChecked: (string | number)[];
  rightDefaultChecked: (string | number)[];
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (value: (string | number)[], direction: 'left' | 'right', movedKeys: (string | number)[]) => void;
  onLeftCheckChange?: (checked: (string | number)[]) => void;
  onRightCheckChange?: (checked: (string | number)[]) => void;
}

export interface TransferSlots {
  default?: (option: TransferOption) => VNode[];
  footer?: () => VNode[];
}

// ===== Tree 组件 =====

export interface TreeNode {
  id: string | number;
  label: string;
  children?: TreeNode[];
  disabled?: boolean;
  isLeaf?: boolean;
  loading?: boolean;
  expanded?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
}

export interface TreeProps {
  data?: TreeNode[];
  showLine?: boolean;
  showCheckbox?: boolean;
  checkable?: boolean;
  draggable?: boolean;
  defaultExpandAll?: boolean;
  defaultExpandedKeys?: (string | number)[];
  defaultCheckedKeys?: (string | number)[];
  nodeKey?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onCheck?: (data: TreeNode[], checked: boolean) => void;
  onSelect?: (data: TreeNode) => void;
  onExpand?: (data: TreeNode, expanded: boolean) => void;
  onNodeClick?: (data: TreeNode) => void;
  onDragStart?: (data: TreeNode, event: DragEvent) => void;
  onDragEnd?: (data: TreeNode, event: DragEvent) => void;
  onDrop?: (data: TreeNode, target: TreeNode, position: 'before' | 'after' | 'inner', event: DragEvent) => void;
}

export interface TreeSetupProps extends Record<string, unknown> {
  data: TreeNode[];
  showLine: boolean;
  showCheckbox: boolean;
  checkable: boolean;
  draggable: boolean;
  defaultExpandAll: boolean;
  defaultExpandedKeys: (string | number)[];
  defaultCheckedKeys: (string | number)[];
  nodeKey: string;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onCheck?: (data: TreeNode[], checked: boolean) => void;
  onSelect?: (data: TreeNode) => void;
  onExpand?: (data: TreeNode, expanded: boolean) => void;
  onNodeClick?: (data: TreeNode) => void;
  onDragStart?: (data: TreeNode, event: DragEvent) => void;
  onDragEnd?: (data: TreeNode, event: DragEvent) => void;
  onDrop?: (data: TreeNode, target: TreeNode, position: 'before' | 'after' | 'inner', event: DragEvent) => void;
}

export interface TreeSlots {
  default?: (data: TreeNode) => VNode[];
  empty?: () => VNode[];
}

// ===== TreeSelect 组件 =====

export interface TreeSelectNode {
  value: string | number;
  label: string;
  children?: TreeSelectNode[];
  disabled?: boolean;
  isLeaf?: boolean;
}

export interface TreeSelectProps {
  modelValue?: string | number | (string | number)[];
  options?: TreeSelectNode[];
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  checkStrictly?: boolean;
  filterable?: boolean;
  showCheckbox?: boolean;
  class?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
}

export interface TreeSelectSetupProps extends Record<string, unknown> {
  modelValue: string | number | (string | number)[];
  options: TreeSelectNode[];
  placeholder: string;
  disabled: boolean;
  clearable: boolean;
  multiple: boolean;
  checkStrictly: boolean;
  filterable: boolean;
  showCheckbox: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onChange?: (value: string | number | (string | number)[]) => void;
  onClear?: () => void;
}

export interface TreeSelectSlots {
  default?: (node: TreeSelectNode) => VNode[];
}

// ===== Upload 组件 =====

export type UploadFileStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadFile {
  name: string;
  size: number;
  status: UploadFileStatus;
  percentage?: number;
  url?: string;
  uid: number;
  raw?: File;
}

export interface UploadProps {
  action?: string;
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
  multiple?: boolean;
  accept?: string;
  autoUpload?: boolean;
  disabled?: boolean;
  limit?: number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (files: UploadFile[]) => void;
  onSuccess?: (response: unknown, file: UploadFile) => void;
  onError?: (error: Error, file: UploadFile) => void;
  onProgress?: (percentage: number, file: UploadFile) => void;
  onRemove?: (file: UploadFile) => void;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
}

export interface UploadSetupProps extends Record<string, unknown> {
  action: string;
  headers: Record<string, string>;
  data: Record<string, unknown>;
  multiple: boolean;
  accept: string;
  autoUpload: boolean;
  disabled: boolean;
  limit: number;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (files: UploadFile[]) => void;
  onSuccess?: (response: unknown, file: UploadFile) => void;
  onError?: (error: Error, file: UploadFile) => void;
  onProgress?: (percentage: number, file: UploadFile) => void;
  onRemove?: (file: UploadFile) => void;
  beforeUpload?: (file: File) => boolean | void | Promise<boolean | void>;
}

export interface UploadSlots {
  default?: () => VNode[];
  trigger?: () => VNode[];
  tip?: () => VNode[];
  file?: (file: UploadFile) => VNode[];
}

// ===== Image 组件 =====

export type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

export interface ImageProps {
  src?: string;
  alt?: string;
  fit?: ImageFit;
  width?: string | number;
  height?: string | number;
  lazy?: boolean;
  preview?: boolean;
  errorSrc?: string;
  placeholderSrc?: string;
  round?: boolean;
  radius?: string | number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export interface ImageSlots {
  default?: () => VNode[];
}

export interface ImageSetupProps extends Record<string, unknown> {
  src: string;
  alt: string;
  fit: string;
  width: string | number;
  height: string | number;
  lazy: boolean;
  preview: boolean;
  errorSrc: string;
  placeholderSrc: string;
  round: boolean;
  radius: string | number;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onLoad?: () => void;
  onError?: () => void;
}

// ===== Notification 组件 =====

export type NotificationType = 'success' | 'warning' | 'error' | 'info';
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface NotificationOptions {
  type?: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  position?: NotificationPosition;
  showClose?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onClose?: () => void;
  onOpen?: () => void;
}

export interface NotificationProps {
  position?: NotificationPosition;
  class?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface NotificationSlots {
  default?: () => VNode[];
}

export interface NotificationSetupProps extends Record<string, unknown> {
  position: NotificationPosition;
  class?: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
}

// ===== Calendar 组件 =====

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarEvent {
  title: string;
  start: Date;
  end?: Date;
  color?: string;
  data?: unknown;
}

export interface CalendarProps {
  modelValue?: string | Date;
  view?: CalendarView;
  events?: CalendarEvent[];
  disabledDates?: (date: Date) => boolean;
  firstDayOfWeek?: number;
  weekNames?: string[];
  monthNames?: string[];
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export interface CalendarSlots {
  default?: () => VNode[];
}

export interface CalendarSetupProps extends Record<string, unknown> {
  modelValue: Date | string;
  view: string;
  events: CalendarEvent[];
  disabledDates?: (date: Date) => boolean;
  firstDayOfWeek: number;
  weekNames: string[];
  monthNames: string[];
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

// ===== ColorPicker 组件 =====

export interface ColorPickerProps {
  modelValue?: string;
  showAlpha?: boolean;
  showClear?: boolean;
  showPreset?: boolean;
  showHistory?: boolean;
  presets?: string[];
  history?: string[];
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (color: string) => void;
  onClear?: () => void;
}

export interface ColorPickerSlots {
  default?: () => VNode[];
}

export interface ColorPickerSetupProps extends Record<string, unknown> {
  modelValue: string;
  showAlpha: boolean;
  showClear: boolean;
  showPreset: boolean;
  showHistory: boolean;
  presets: string[];
  history: string[];
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (color: string) => void;
  onClear?: () => void;
}

// ===== Descriptions 组件 =====

export interface DescriptionsItemData {
  label: string;
  value: string;
  span?: number;
  labelStyle?: Record<string, string>;
  contentStyle?: Record<string, string>;
}

export interface DescriptionsProps {
  title?: string;
  column?: number;
  border?: boolean;
  size?: ComponentSize;
  layout?: 'horizontal' | 'vertical';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface DescriptionsSetupProps extends Record<string, unknown> {
  title: string;
  column: number;
  border: boolean;
  size: ComponentSize;
  layout: 'horizontal' | 'vertical';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

export interface DescriptionsSlots {
  default?: () => VNode[];
  title?: () => VNode[];
}

export interface DescriptionsItemProps {
  label?: string;
  span?: number;
  labelStyle?: Record<string, string>;
  contentStyle?: Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface DescriptionsItemSetupProps extends Record<string, unknown> {
  label: string;
  span: number;
  labelStyle?: Record<string, string>;
  contentStyle?: Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
}

export interface DescriptionsItemSlots {
  default?: () => VNode[];
  label?: () => VNode[];
}

// ===== Drawer 组件 =====

export type DrawerDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';

export interface DrawerProps {
  modelValue?: boolean;
  title?: string;
  size?: string | number;
  direction?: DrawerDirection;
  showClose?: boolean;
  closeOnClickModal?: boolean;
  closeOnPressEscape?: boolean;
  lockScroll?: boolean;
  appendToBody?: boolean;
  withHeader?: boolean;
  customClass?: string;
  class?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaModal?: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface DrawerSlots {
  default?: () => VNode[];
  header?: () => VNode[];
  footer?: () => VNode[];
}

export interface DrawerSetupProps extends Record<string, unknown> {
  modelValue: boolean;
  title: string;
  size: string | number;
  direction: DrawerDirection;
  showClose: boolean;
  closeOnClickModal: boolean;
  closeOnPressEscape: boolean;
  lockScroll: boolean;
  appendToBody: boolean;
  withHeader: boolean;
  customClass: string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaModal: boolean;
  onBeforeOpen?: () => boolean | void | Promise<boolean | void>;
  onBeforeClose?: () => boolean | void | Promise<boolean | void>;
  onOpen?: () => void;
  onClose?: () => void;
}

// ===== Rate 组件 =====

export interface RateProps {
  modelValue?: number;
  max?: number;
  allowHalf?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  showText?: boolean;
  showScore?: boolean;
  texts?: string[];
  voidIcon?: string;
  voidColor?: string;
  disabledVoidColor?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (value: number) => void;
}

export interface RateSlots {
  default?: () => VNode[];
}

export interface RateSetupProps extends Record<string, unknown> {
  modelValue: number;
  max: number;
  allowHalf: boolean;
  readonly: boolean;
  disabled: boolean;
  showText: boolean;
  showScore: boolean;
  texts: string[];
  voidIcon: string;
  voidColor: string;
  disabledVoidColor: string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (value: number) => void;
}

// ===== CheckboxGroup 组件 =====

export interface CheckboxGroupProps {
  modelValue?: (string | number | boolean)[];
  disabled?: boolean;
  min?: number;
  max?: number;
  size?: ComponentSize;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  onChange?: (value: (string | number | boolean)[]) => void;
}

export interface CheckboxGroupSlots {
  default?: () => VNode[];
}

export interface CheckboxGroupSetupProps extends Record<string, unknown> {
  modelValue: (string | number | boolean)[];
  disabled: boolean;
  min: number;
  max: number;
  size: ComponentSize;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaRequired: boolean;
  onChange?: (value: (string | number | boolean)[]) => void;
}

// ===== RadioGroup 组件 =====

export interface RadioGroupProps {
  modelValue?: string | number | boolean;
  disabled?: boolean;
  size?: ComponentSize;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  onChange?: (value: string | number | boolean) => void;
}

export interface RadioGroupSlots {
  default?: () => VNode[];
}

export interface RadioGroupSetupProps extends Record<string, unknown> {
  modelValue: string | number | boolean;
  disabled: boolean;
  size: ComponentSize;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaRequired: boolean;
  onChange?: (value: string | number | boolean) => void;
}

// ===== Progress 组件 =====

export interface ProgressProps {
  percentage?: number;
  type?: 'line' | 'circle' | 'dashboard';
  status?: 'success' | 'exception' | 'warning';
  strokeWidth?: number;
  textInside?: boolean;
  showText?: boolean;
  color?: string | string[] | Record<string, string>;
  width?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  format?: (percentage: number) => string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface ProgressSlots {
  default?: () => VNode[];
}

export interface ProgressSetupProps extends Record<string, unknown> {
  percentage: number;
  type: 'line' | 'circle' | 'dashboard';
  status: 'success' | 'exception' | 'warning' | '';
  strokeWidth: number;
  textInside: boolean;
  showText: boolean;
  color: string | string[] | Record<string, string>;
  width: number;
  strokeLinecap: 'butt' | 'round' | 'square';
  format?: (percentage: number) => string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== Slider 组件 =====

export interface SliderProps {
  modelValue?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  showInput?: boolean;
  showInputControls?: boolean;
  inputSize?: ComponentSize;
  showStops?: boolean;
  showTooltip?: boolean;
  formatTooltip?: (value: number) => string;
  disabled?: boolean;
  range?: boolean;
  vertical?: boolean;
  height?: string;
  label?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  tabIndex?: number;
  onChange?: (value: number | number[]) => void;
  onInput?: (value: number | number[]) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

export interface SliderSlots {
  default?: () => VNode[];
}

export interface SliderSetupProps extends Record<string, unknown> {
  modelValue: number | number[];
  min: number;
  max: number;
  step: number;
  showInput: boolean;
  showInputControls: boolean;
  inputSize: ComponentSize;
  showStops: boolean;
  showTooltip: boolean;
  formatTooltip?: (value: number) => string;
  disabled: boolean;
  range: boolean;
  vertical: boolean;
  height: string;
  label: string;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  ariaRequired: boolean;
  ariaInvalid: boolean;
  tabIndex?: number;
  onChange?: (value: number | number[]) => void;
  onInput?: (value: number | number[]) => void;
  onKeydown?: (event: KeyboardEvent) => void;
}

// ===== Avatar 组件 =====

export interface AvatarProps {
  size?: number | ComponentSize;
  shape?: 'circle' | 'square';
  icon?: string;
  src?: string;
  srcSet?: string;
  alt?: string;
  fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onError?: () => boolean;
}

export interface AvatarSlots {
  default?: () => VNode[];
}

export interface AvatarSetupProps extends Record<string, unknown> {
  size: number | ComponentSize;
  shape: 'circle' | 'square';
  icon: string;
  src: string;
  srcSet: string;
  alt: string;
  fit: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onError?: () => boolean;
}

// ===== Card 组件 =====

export interface CardProps {
  header?: string;
  bodyStyle?: Record<string, string>;
  shadow?: 'always' | 'hover' | 'never';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface CardSlots {
  default?: () => VNode[];
  header?: () => VNode[];
}

export interface CardSetupProps extends Record<string, unknown> {
  header: string;
  bodyStyle: Record<string, string>;
  shadow: 'always' | 'hover' | 'never';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== Timeline 时间轴组件 =====
export interface TimelineItem {
  color?: string;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'large' | 'default' | 'small';
  dot?: VNode | string;
  timestamp?: string;
  placement?: 'top' | 'bottom';
  hideTimestamp?: boolean;
  content?: string | VNode;
}

export interface TimelineProps {
  reverse?: boolean;
  mode?: 'left' | 'right' | 'alternate';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface TimelineSlots {
  default?: () => VNode[];
}

export interface TimelineSetupProps extends Record<string, unknown> {
  reverse: boolean;
  mode: 'left' | 'right' | 'alternate';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== TimelineItem 时间轴项组件 =====
export interface TimelineItemProps {
  color?: string;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'large' | 'default' | 'small';
  dot?: VNode | string;
  timestamp?: string;
  placement?: 'top' | 'bottom';
  hideTimestamp?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface TimelineItemSlots {
  default?: () => VNode[];
  dot?: () => VNode[];
}

export interface TimelineItemSetupProps extends Record<string, unknown> {
  color: string;
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size: 'large' | 'default' | 'small';
  dot: VNode | string;
  timestamp: string;
  placement: 'top' | 'bottom';
  hideTimestamp: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== Steps 步骤条组件 =====
export interface Step {
  title?: string;
  description?: string;
  icon?: string | VNode;
  status?: 'wait' | 'process' | 'finish' | 'error' | 'success';
}

export interface StepsProps {
  active?: number;
  processStatus?: 'process' | 'finish' | 'error' | 'success';
  finishStatus?: 'wait' | 'process' | 'finish' | 'error' | 'success';
  direction?: 'horizontal' | 'vertical';
  alignCenter?: boolean;
  simple?: boolean;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (active: number) => void;
}

export interface StepsSlots {
  default?: () => VNode[];
}

export interface StepsSetupProps extends Record<string, unknown> {
  active: number;
  processStatus: 'process' | 'finish' | 'error' | 'success';
  finishStatus: 'wait' | 'process' | 'finish' | 'error' | 'success';
  direction: 'horizontal' | 'vertical';
  alignCenter: boolean;
  simple: boolean;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (active: number) => void;
}

// ===== Step 步骤项组件 =====
export interface StepProps {
  title?: string;
  description?: string;
  icon?: string | VNode;
  status?: 'wait' | 'process' | 'finish' | 'error' | 'success';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface StepSlots {
  default?: () => VNode[];
  icon?: () => VNode[];
  title?: () => VNode[];
  description?: () => VNode[];
}

export interface StepSetupProps extends Record<string, unknown> {
  title: string;
  description: string;
  icon: string | VNode;
  status: 'wait' | 'process' | 'finish' | 'error' | 'success';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== Carousel 走马灯组件 =====
export interface CarouselProps {
  initialIndex?: number;
  height?: string;
  trigger?: 'click' | 'hover';
  autoplay?: boolean;
  interval?: number;
  indicatorPosition?: 'outside' | 'none';
  arrow?: 'always' | 'hover' | 'never';
  type?: '' | 'card';
  loop?: boolean;
  direction?: 'horizontal' | 'vertical';
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onChange?: (index: number, prevIndex: number) => void;
}

export interface CarouselSlots {
  default?: () => VNode[];
}

export interface CarouselSetupProps extends Record<string, unknown> {
  initialIndex: number;
  height: string;
  trigger: 'click' | 'hover';
  autoplay: boolean;
  interval: number;
  indicatorPosition: 'outside' | 'none';
  arrow: 'always' | 'hover' | 'never';
  type: '' | 'card';
  loop: boolean;
  direction: 'horizontal' | 'vertical';
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
  onChange?: (index: number, prevIndex: number) => void;
}

// ===== CarouselItem 走马灯项组件 =====
export interface CarouselItemProps {
  name?: string | number;
  label?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export interface CarouselItemSlots {
  default?: () => VNode[];
}

export interface CarouselItemSetupProps extends Record<string, unknown> {
  name: string | number;
  label: string;
  class: string;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  style?: string | Record<string, string>;
}

// ===== Popconfirm 气泡确认框组件 =====
export interface PopconfirmProps {
  title?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonType?: string;
  cancelButtonType?: string;
  icon?: string;
  iconColor?: string;
  hideIcon?: boolean;
  disabled?: boolean;
  width?: number;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface PopconfirmSlots {
  default?: () => VNode[];
  reference?: () => VNode[];
  icon?: () => VNode[];
}

export interface PopconfirmSetupProps extends Record<string, unknown> {
  title: string;
  confirmButtonText: string;
  cancelButtonText: string;
  confirmButtonType: string;
  cancelButtonType: string;
  icon: string;
  iconColor: string;
  hideIcon: boolean;
  disabled: boolean;
  width: number;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}



export type { VNode, Component };

// ===== RichTextEditor 富文本编辑器组件 =====

export interface RichTextEditorProps {
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  height?: string;
  class?: string;
  style?: string | Record<string, string>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  onInput?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

export interface RichTextEditorSlots {
  default?: () => VNode[];
  toolbar?: () => VNode[];
}

export interface RichTextEditorSetupProps extends Record<string, unknown> {
  modelValue: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  height: string;
  class: string;
  style?: string | Record<string, string>;
  id: string;
  ariaLabel: string;
  ariaDescribedBy: string;
  onInput?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}
