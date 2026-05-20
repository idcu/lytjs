/**
 * @lytjs/common-validate
 * 轻量级验证工具
 */

declare const __DEV__: boolean;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type ValidationRule = {
  name: string;
  validate: (value: unknown) => boolean | string;
  message?: string;
};

/**
 * 验证值是否符合所有规则
 *
 * @param value - 待验证的值
 * @param rules - 验证规则列表
 * @returns 验证结果
 */
export function validate(value: unknown, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const result = rule.validate(value);
    if (result === false) {
      errors.push(rule.message || `Validation failed: ${rule.name}`);
    } else if (typeof result === 'string') {
      errors.push(result);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 创建一个可复用的验证器函数
 *
 * @param rules - 验证规则列表
 * @returns 验证函数
 */
export function createValidator(rules: ValidationRule[]): (value: unknown) => ValidationResult {
  return (value: unknown) => validate(value, rules);
}

// --- 内置规则 ---

/**
 * 必填规则
 */
export const required: ValidationRule = {
  name: 'required',
  validate: (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  },
  message: 'This field is required',
};

/**
 * 最小长度规则
 */
export function minLength(n: number): ValidationRule {
  return {
    name: 'minLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string') return true; // Skip non-strings
      return value.length >= n;
    },
    message: `Must be at least ${n} characters`,
  };
}

/**
 * 最大长度规则
 */
export function maxLength(n: number): ValidationRule {
  return {
    name: 'maxLength',
    validate: (value: unknown) => {
      if (typeof value !== 'string') return true;
      return value.length <= n;
    },
    message: `Must be at most ${n} characters`,
  };
}

/**
 * 正则匹配规则
 */
export function pattern(regex: RegExp, message?: string): ValidationRule {
  return {
    name: 'pattern',
    validate: (value: unknown) => {
      if (typeof value !== 'string') return true;
      return regex.test(value);
    },
    message: message || 'Value does not match the required pattern',
  };
}

/**
 * 邮箱格式规则
 */
export const email: ValidationRule = {
  name: 'email',
  validate: (value: unknown) => {
    if (typeof value !== 'string') return true;
    if (value === '') return true; // Empty strings are handled by required
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  message: 'Must be a valid email address',
};

/**
 * URL 格式规则
 */
export const url: ValidationRule = {
  name: 'url',
  validate: (value: unknown) => {
    if (typeof value !== 'string') return true;
    if (value === '') return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  message: 'Must be a valid URL',
};

/**
 * 数字规则
 */
export const number: ValidationRule = {
  name: 'number',
  validate: (value: unknown) => {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'number' || !isNaN(Number(value));
  },
  message: 'Must be a number',
};

/**
 * 最小值规则
 */
export function min(n: number): ValidationRule {
  return {
    name: 'min',
    validate: (value: unknown) => {
      if (typeof value !== 'number') return true;
      return value >= n;
    },
    message: `Must be at least ${n}`,
  };
}

/**
 * 最大值规则
 */
export function max(n: number): ValidationRule {
  return {
    name: 'max',
    validate: (value: unknown) => {
      if (typeof value !== 'number') return true;
      return value <= n;
    },
    message: `Must be at most ${n}`,
  };
}

/**
 * 枚举值规则
 */
export function oneOf(values: unknown[]): ValidationRule {
  return {
    name: 'oneOf',
    validate: (value: unknown) => {
      return values.includes(value);
    },
    message: `Must be one of: ${values.join(', ')}`,
  };
}

/**
 * 自定义验证规则
 */
export function custom(fn: (value: unknown) => boolean, message: string): ValidationRule {
  return {
    name: 'custom',
    validate: fn,
    message,
  };
}

/** 所有内置规则的集合 */
export const builtInRules = {
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  number,
  min,
  max,
  oneOf,
  custom,
};
