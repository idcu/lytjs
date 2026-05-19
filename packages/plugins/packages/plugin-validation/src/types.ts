/**
 * @lytjs/plugin-validation - 类型定义
 */

export type ValidationRuleType =
  | 'required'
  | 'email'
  | 'phone'
  | 'number'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'length'
  | 'pattern'
  | 'url'
  | 'uuid'
  | 'date'
  | 'custom';

export interface ValidationRule {
  type: ValidationRuleType;
  message?: string;
  value?: unknown;
  validator?: (value: unknown, allValues?: Record<string, unknown>) => boolean | Promise<boolean>;
}

export interface Validator {
  (
    value: unknown,
    ruleValue?: unknown,
    allValues?: Record<string, unknown>,
  ): boolean | Promise<boolean>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FieldValidationConfig {
  rules: ValidationRule[];
  label?: string;
}

export interface ValidationSchema {
  [field: string]: FieldValidationConfig;
}

export interface ValidationMessages {
  [key: string]: string | ((value?: unknown, label?: string) => string);
}

export interface ValidationOptions {
  messages?: ValidationMessages;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  stopOnFirstError?: boolean;
}

export interface ValidationInstance {
  validate: (
    schema: ValidationSchema,
    values: Record<string, unknown>,
  ) => Promise<ValidationResult>;
  validateField: (
    field: string,
    value: unknown,
    rules: ValidationRule[],
    allValues?: Record<string, unknown>,
  ) => Promise<ValidationResult>;
  setMessages: (messages: ValidationMessages) => void;
  addRule: (type: ValidationRuleType, validator: Validator, defaultMessage?: string) => void;
}

export interface ValidationPluginOptions extends ValidationOptions {
  name?: string;
}

export interface ValidationOptions {
  messages?: ValidationMessages;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  stopOnFirstError?: boolean;
}
