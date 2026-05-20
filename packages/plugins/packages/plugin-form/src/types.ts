/**
 * @lytjs/plugin-form - 类型定义
 */

export interface FieldValidationRule {
  /** 校验类型 */
  type:
    | 'required'
    | 'email'
    | 'phone'
    | 'number'
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'custom';
  /** 错误消息 */
  message?: string;
  /** 校验值（如 min/max 值等） */
  value?: unknown;
  /** 自定义校验函数 */
  validator?: (value: unknown, allValues: Record<string, unknown>) => boolean | Promise<boolean>;
}

export interface FieldConfig {
  /** 字段初始值 */
  initialValue?: unknown;
  /** 校验规则 */
  rules?: FieldValidationRule[];
  /** 字段标签 */
  label?: string;
  /** 字段是否禁用 */
  disabled?: boolean;
  /** 字段是否只读 */
  readOnly?: boolean;
}

export interface FormConfig {
  /** 字段配置 */
  fields?: Record<string, FieldConfig>;
  /** 初始值 */
  initialValues?: Record<string, unknown>;
  /** 是否在提交时校验 */
  validateOnSubmit?: boolean;
  /** 是否在字段变化时校验 */
  validateOnChange?: boolean;
  /** 是否在字段失焦时校验 */
  validateOnBlur?: boolean;
}

export interface FieldState {
  /** 字段值 */
  value: unknown;
  /** 字段错误 */
  errors: string[];
  /** 字段是否被触碰过 */
  touched: boolean;
  /** 字段是否禁用 */
  disabled: boolean;
  /** 字段是否只读 */
  readOnly: boolean;
  /** 字段是否正在校验中 */
  validating: boolean;
  /** 字段是否校验通过 */
  valid: boolean;
}

export interface FormState {
  /** 所有字段状态 */
  fields: Record<string, FieldState>;
  /** 表单是否正在提交 */
  isSubmitting: boolean;
  /** 表单是否有效 */
  isValid: boolean;
  /** 表单是否被触碰过 */
  isTouched: boolean;
  /** 表单是否正在校验 */
  isValidating: boolean;
  /** 表单是否被修改过 */
  isDirty: boolean;
}

export interface FormInstance {
  /** 表单当前状态 */
  readonly state: FormState;
  /** 获取字段值 */
  getValue: (name: string) => unknown;
  /** 设置字段值 */
  setValue: (name: string, value: unknown) => void;
  /** 获取所有值 */
  getValues: () => Record<string, unknown>;
  /** 设置多个字段值 */
  setValues: (values: Record<string, unknown>) => void;
  /** 获取字段错误 */
  getErrors: (name: string) => string[];
  /** 设置字段错误 */
  setErrors: (name: string, errors: string[]) => void;
  /** 标记字段为已触碰 */
  touchField: (name: string) => void;
  /** 触碰所有字段 */
  touchAllFields: () => void;
  /** 重置表单 */
  reset: () => void;
  /** 重置为初始值 */
  resetToInitial: () => void;
  /** 校验单个字段 */
  validateField: (name: string) => Promise<boolean>;
  /** 校验整个表单 */
  validate: () => Promise<boolean>;
  /** 提交表单 */
  submit: (
    callback?: (values: Record<string, unknown>) => void | Promise<void>,
  ) => Promise<boolean>;
  /** 设置字段禁用状态 */
  setFieldDisabled: (name: string, disabled: boolean) => void;
  /** 设置字段只读状态 */
  setFieldReadOnly: (name: string, readOnly: boolean) => void;
  /** 获取字段配置 */
  getFieldConfig: (name: string) => FieldConfig | undefined;
  /** 注册新字段 */
  registerField: (name: string, config?: FieldConfig) => void;
  /** 注销字段 */
  unregisterField: (name: string) => void;
}

export interface FormOptions extends FormConfig {
  /** 插件名称 */
  name?: string;
}
