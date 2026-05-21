/**
 * @lytjs/plugin-form
 *
 * LytJS official form plugin for form state management, validation, and submission.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal, signalComputed as computed } from '@lytjs/reactivity';
import type {
  FormOptions,
  FormInstance,
  FormState,
  FieldState,
  FieldConfig,
  FieldValidationRule,
} from './types';
import type { ComputedSignal } from '@lytjs/reactivity';

const defaultMessages: Record<string, string> = {
  required: '此字段为必填项',
  email: '请输入有效的邮箱地址',
  phone: '请输入有效的手机号码',
  number: '请输入数字',
  min: '值不能小于 {min}',
  max: '值不能大于 {max}',
  minLength: '长度不能小于 {minLength}',
  maxLength: '长度不能大于 {maxLength}',
  pattern: '格式不正确',
  custom: '校验失败',
};

function validateRequired(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return true;
}

function validateEmail(value: unknown): boolean {
  if (!value) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(value));
}

function validatePhone(value: unknown): boolean {
  if (!value) return true;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(String(value));
}

function validateNumber(value: unknown): boolean {
  if (value == null || value === '') return true;
  return !isNaN(Number(value));
}

function validateMin(value: unknown, min: number): boolean {
  if (value == null || value === '') return true;
  return Number(value) >= min;
}

function validateMax(value: unknown, max: number): boolean {
  if (value == null || value === '') return true;
  return Number(value) <= max;
}

function validateMinLength(value: unknown, minLength: number): boolean {
  if (value == null || value === '') return true;
  const str = String(value);
  return str.length >= minLength;
}

function validateMaxLength(value: unknown, maxLength: number): boolean {
  if (value == null || value === '') return true;
  const str = String(value);
  return str.length <= maxLength;
}

function validatePattern(value: unknown, pattern: RegExp | string): boolean {
  if (value == null || value === '') return true;
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regex.test(String(value));
}

async function validateFieldValue(
  name: string,
  value: unknown,
  rules: FieldValidationRule[],
  allValues: Record<string, unknown>,
): Promise<string[]> {
  const errors: string[] = [];

  for (const rule of rules) {
    let isValid = true;

    switch (rule.type) {
      case 'required':
        isValid = validateRequired(value);
        break;
      case 'email':
        isValid = validateEmail(value);
        break;
      case 'phone':
        isValid = validatePhone(value);
        break;
      case 'number':
        isValid = validateNumber(value);
        break;
      case 'min':
        isValid = validateMin(value, rule.value as number);
        break;
      case 'max':
        isValid = validateMax(value, rule.value as number);
        break;
      case 'minLength':
        isValid = validateMinLength(value, rule.value as number);
        break;
      case 'maxLength':
        isValid = validateMaxLength(value, rule.value as number);
        break;
      case 'pattern':
        isValid = validatePattern(value, rule.value as RegExp | string);
        break;
      case 'custom':
        if (rule.validator) {
          isValid = await rule.validator(value, allValues);
        }
        break;
    }

    if (!isValid) {
      let message = rule.message || defaultMessages[rule.type];
      if (rule.type === 'min' && rule.value != null) {
        message = message.replace('{min}', String(rule.value));
      }
      if (rule.type === 'max' && rule.value != null) {
        message = message.replace('{max}', String(rule.value));
      }
      if (rule.type === 'minLength' && rule.value != null) {
        message = message.replace('{minLength}', String(rule.value));
      }
      if (rule.type === 'maxLength' && rule.value != null) {
        message = message.replace('{maxLength}', String(rule.value));
      }
      errors.push(message);
    }
  }

  return errors;
}

function createFormManager(options: FormOptions = {}): FormInstance {
  const {
    fields = {},
    initialValues = {},
    validateOnSubmit = true,
    validateOnChange = false,
    validateOnBlur = false,
  } = options;

  const fieldConfigs = new Map<string, FieldConfig>();
  const initialFieldValues = new Map<string, unknown>();
  const fieldStates = new Map<string, ReturnType<typeof createFieldState>>();
  const isSubmittingSignal = signal<boolean>(false);
  const isValidatingSignal = signal<boolean>(false);

  function createFieldState(name: string, config: FieldConfig = {}) {
    const initialValue = config.initialValue ?? initialValues[name];
    initialFieldValues.set(name, initialValue);
    const valueSignal = signal<unknown>(initialValue);
    const errorsSignal = signal<string[]>([]);
    const touchedSignal = signal<boolean>(false);
    const disabledSignal = signal<boolean>(config.disabled ?? false);
    const readOnlySignal = signal<boolean>(config.readOnly ?? false);
    const validatingSignal = signal<boolean>(false);
    const validSignal: ComputedSignal<boolean> = computed<boolean>(
      () => errorsSignal().length === 0,
    );

    return {
      get value() {
        return valueSignal();
      },
      set value(val: unknown) {
        valueSignal.set(val);
      },
      get errors() {
        return errorsSignal();
      },
      set errors(errs: string[]) {
        errorsSignal.set(errs);
      },
      get touched() {
        return touchedSignal();
      },
      set touched(val: boolean) {
        touchedSignal.set(val);
      },
      get disabled() {
        return disabledSignal();
      },
      set disabled(val: boolean) {
        disabledSignal.set(val);
      },
      get readOnly() {
        return readOnlySignal();
      },
      set readOnly(val: boolean) {
        readOnlySignal.set(val);
      },
      get validating() {
        return validatingSignal();
      },
      set validating(val: boolean) {
        validatingSignal.set(val);
      },
      get valid() {
        return validSignal();
      },
      valueSignal,
      errorsSignal,
      touchedSignal,
      disabledSignal,
      readOnlySignal,
      validatingSignal,
    };
  }

  function registerField(name: string, config: FieldConfig = {}) {
    fieldConfigs.set(name, config);
    if (!fieldStates.has(name)) {
      fieldStates.set(name, createFieldState(name, config));
    }
  }

  function unregisterField(name: string) {
    fieldConfigs.delete(name);
    fieldStates.delete(name);
  }

  function initialize() {
    for (const [name, config] of Object.entries(fields)) {
      registerField(name, config);
    }
  }

  const stateSignal: ComputedSignal<FormState> = computed<FormState>(() => {
    const fieldsState: Record<string, FieldState> = {};
    let isTouched = false;
    let hasDirty = false;
    let isValid = true;

    for (const [name, fieldState] of fieldStates) {
      const initialValue = initialFieldValues.get(name);
      fieldsState[name] = {
        value: fieldState.value,
        errors: fieldState.errors,
        touched: fieldState.touched,
        disabled: fieldState.disabled,
        readOnly: fieldState.readOnly,
        validating: fieldState.validating,
        valid: fieldState.valid,
      };

      if (fieldState.touched) isTouched = true;
      if (fieldState.value !== initialValue) hasDirty = true;
      if (!fieldState.valid) isValid = false;
    }

    return {
      fields: fieldsState,
      isSubmitting: isSubmittingSignal(),
      isValid,
      isTouched,
      isValidating: isValidatingSignal(),
      isDirty: hasDirty,
    };
  });

  function getValue(name: string): unknown {
    const fieldState = fieldStates.get(name);
    return fieldState?.value;
  }

  function setValue(name: string, value: unknown) {
    const fieldState = fieldStates.get(name);
    if (!fieldState) return;
    fieldState.value = value;

    if (validateOnChange) {
      validateField(name).catch(() => {});
    }
  }

  function getValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const [name, fieldState] of fieldStates) {
      values[name] = fieldState.value;
    }
    return values;
  }

  function setValues(values: Record<string, unknown>) {
    for (const [name, value] of Object.entries(values)) {
      setValue(name, value);
    }
  }

  function getErrors(name: string): string[] {
    const fieldState = fieldStates.get(name);
    return fieldState?.errors ?? [];
  }

  function setErrors(name: string, errors: string[]) {
    const fieldState = fieldStates.get(name);
    if (fieldState) {
      fieldState.errors = errors;
    }
  }

  function touchField(name: string) {
    const fieldState = fieldStates.get(name);
    if (fieldState) {
      fieldState.touched = true;
      if (validateOnBlur) {
        validateField(name).catch(() => {});
      }
    }
  }

  function touchAllFields() {
    for (const [, fieldState] of fieldStates) {
      fieldState.touched = true;
    }
  }

  function reset() {
    for (const [, fieldState] of fieldStates) {
      fieldState.errors = [];
      fieldState.touched = false;
    }
  }

  function resetToInitial() {
    for (const [name, fieldState] of fieldStates) {
      const initialValue = initialFieldValues.get(name);
      fieldState.value = initialValue;
      fieldState.errors = [];
      fieldState.touched = false;
    }
  }

  async function validateField(name: string): Promise<boolean> {
    const fieldState = fieldStates.get(name);
    const config = fieldConfigs.get(name);
    if (!fieldState || !config?.rules) return true;

    fieldState.validating = true;
    const errors = await validateFieldValue(name, fieldState.value, config.rules, getValues());
    fieldState.errors = errors;
    fieldState.validating = false;
    return errors.length === 0;
  }

  async function validate(): Promise<boolean> {
    isValidatingSignal.set(true);

    let allValid = true;
    for (const name of fieldStates.keys()) {
      const valid = await validateField(name);
      if (!valid) allValid = false;
    }

    isValidatingSignal.set(false);
    return allValid;
  }

  async function submit(
    callback?: (values: Record<string, unknown>) => void | Promise<void>,
  ): Promise<boolean> {
    isSubmittingSignal.set(true);

    try {
      let isValid = true;
      if (validateOnSubmit) {
        isValid = await validate();
      }

      if (isValid && callback) {
        await callback(getValues());
      }

      return isValid;
    } finally {
      isSubmittingSignal.set(false);
    }
  }

  function setFieldDisabled(name: string, disabled: boolean) {
    const fieldState = fieldStates.get(name);
    if (fieldState) {
      fieldState.disabled = disabled;
    }
  }

  function setFieldReadOnly(name: string, readOnly: boolean) {
    const fieldState = fieldStates.get(name);
    if (fieldState) {
      fieldState.readOnly = readOnly;
    }
  }

  function getFieldConfig(name: string): FieldConfig | undefined {
    return fieldConfigs.get(name);
  }

  initialize();

  return {
    get state() {
      return stateSignal();
    },
    getValue,
    setValue,
    getValues,
    setValues,
    getErrors,
    setErrors,
    touchField,
    touchAllFields,
    reset,
    resetToInitial,
    validateField,
    validate,
    submit,
    setFieldDisabled,
    setFieldReadOnly,
    getFieldConfig,
    registerField,
    unregisterField,
  };
}

const pluginForm = definePlugin({
  name: 'form',
  version: '6.0.0',
  description: 'LytJS official form plugin for form state management, validation, and submission',
  author: 'LytJS Team',
  keywords: ['lytjs', 'form', 'validation', 'form-state'],
  schema: {
    type: 'object',
    object: {
      properties: {
        fields: { type: 'object', default: {} },
        initialValues: { type: 'object', default: {} },
        validateOnSubmit: { type: 'boolean', default: true },
        validateOnChange: { type: 'boolean', default: false },
        validateOnBlur: { type: 'boolean', default: false },
      },
    },
  },
  install(app: unknown, options: unknown) {
    const formManager = createFormManager(options as FormOptions);

    // @ts-expect-error - 动态访问属性
    if (app.config?.globalProperties) {
      // @ts-expect-error - 动态访问属性
      app.config.globalProperties.$form = formManager;
    }

    // @ts-expect-error - 动态访问属性
    if (app.provide) {
      // @ts-expect-error - 动态访问属性
      app.provide('lyt-form', formManager);
    }
  },
});

export default pluginForm;
export type { FormOptions, FormInstance, FormState, FieldState, FieldConfig, FieldValidationRule };
export { createFormManager };
