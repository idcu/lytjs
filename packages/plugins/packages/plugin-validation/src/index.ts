/**
 * @lytjs/plugin-validation
 *
 * LytJS official validation plugin for type-safe form validation
 */

import { definePlugin } from '@lytjs/core';
import type {
  ValidationRule,
  ValidationRuleType,
  ValidationSchema,
  ValidationMessages,
  ValidationInstance,
  ValidationResult,
  Validator,
  ValidationPluginOptions,
  FieldValidationConfig,
} from './types';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateNumber,
  validateMin,
  validateMax,
  validateMinLength,
  validateMaxLength,
  validateLength,
  validatePattern,
  validateUrl,
  validateUuid,
  validateDate,
  defaultMessages,
} from './rules';

const builtInValidators: Record<ValidationRuleType, Validator> = {
  required: validateRequired,
  email: validateEmail,
  phone: validatePhone,
  number: validateNumber,
  min: validateMin,
  max: validateMax,
  minLength: validateMinLength,
  maxLength: validateMaxLength,
  length: validateLength,
  pattern: validatePattern,
  url: validateUrl,
  uuid: validateUuid,
  date: validateDate,
  custom: () => true,
};

function getMessage(
  messages: ValidationMessages,
  type: string,
  ruleValue?: unknown,
  label?: string
): string {
  const msg = messages[type];
  if (typeof msg === 'function') {
    return msg(ruleValue, label);
  }
  return msg || '校验失败';
}

async function validateRule(
  rule: ValidationRule,
  value: unknown,
  allValues: Record<string, unknown>,
  validators: Record<ValidationRuleType, Validator>,
  messages: ValidationMessages,
  label?: string
): Promise<string | null> {
  let isValid: boolean;

  if (rule.type === 'custom' && rule.validator) {
    isValid = await rule.validator(value, allValues);
  } else {
    const validator = validators[rule.type];
    if (!validator) return null;
    isValid = await validator(value, rule.value, allValues);
  }

  if (!isValid) {
    return rule.message || getMessage(messages, rule.type, rule.value, label);
  }

  return null;
}

async function validateFieldInternal(
  value: unknown,
  config: FieldValidationConfig,
  allValues: Record<string, unknown>,
  validators: Record<ValidationRuleType, Validator>,
  messages: ValidationMessages,
  stopOnFirstError: boolean = false
): Promise<ValidationResult> {
  const errors: string[] = [];

  for (const rule of config.rules) {
    const error = await validateRule(rule, value, allValues, validators, messages, config.label);
    if (error) {
      errors.push(error);
      if (stopOnFirstError) break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function createValidationInstance(options?: ValidationPluginOptions): ValidationInstance {
  const {
    messages = {},
    stopOnFirstError = false,
  } = options || {};

  const customMessages = { ...defaultMessages, ...messages };
  const customValidators: Record<string, Validator> = {};

  const instance: ValidationInstance = {
    validateField: async (
      field: string,
      value: unknown,
      rules: ValidationRule[],
      allValues?: Record<string, unknown>
    ): Promise<ValidationResult> => {
      return await validateFieldInternal(
        value,
        { rules },
        allValues || {},
        { ...builtInValidators, ...customValidators },
        customMessages,
        stopOnFirstError
      );
    },

    validate: async (
      schema: ValidationSchema,
      values: Record<string, unknown>
    ): Promise<ValidationResult> => {
      const allErrors: string[] = [];

      for (const [field, config] of Object.entries(schema)) {
        const result = await validateFieldInternal(
          values[field],
          config,
          values,
          { ...builtInValidators, ...customValidators },
          customMessages,
          stopOnFirstError
        );
        if (!result.valid) {
          allErrors.push(...result.errors);
        }
      }

      return {
        valid: allErrors.length === 0,
        errors: allErrors,
      };
    },

    setMessages: (newMessages: ValidationMessages) => {
      Object.assign(customMessages, newMessages);
    },

    addRule: (type: ValidationRuleType, validator: Validator, defaultMessage?: string) => {
      customValidators[type] = validator;
      if (defaultMessage) {
        customMessages[type] = defaultMessage;
      }
    },
  };

  return instance;
}

const pluginValidation = definePlugin({
  name: 'validation',
  version: '6.0.0',
  description: 'LytJS official validation plugin for type-safe form validation',
  author: 'LytJS Team',
  keywords: ['lytjs', 'validation', 'form', 'validator'],
  schema: {
    type: 'object',
    object: {
      properties: {
        messages: { type: 'object', default: {} },
        validateOnChange: { type: 'boolean', default: false },
        validateOnBlur: { type: 'boolean', default: false },
        stopOnFirstError: { type: 'boolean', default: false },
      },
    },
  },
  install(app, options) {
    const validation = createValidationInstance(options as ValidationPluginOptions);
    app.config.globalProperties.$validation = validation;
    app.provide('lyt-validation', validation);
  },
});

export default pluginValidation;
export { createValidationInstance };
export type {
  ValidationRule,
  ValidationRuleType,
  ValidationSchema,
  ValidationMessages,
  ValidationResult,
  ValidationInstance,
  ValidationPluginOptions,
  ValidationOptions,
  Validator,
  FieldValidationConfig,
} from './types';
export { defaultMessages } from './rules';
