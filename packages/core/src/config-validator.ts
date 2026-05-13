// src/config-validator.ts
// @lytjs/core - 插件配置验证器

import type {
  ConfigSchema,
  ConfigValidationReport,
  ConfigValidationError,
  ValidationContext,
  ValidationErrorCode,
  StringFormat,
} from './config-schema';

/**
 * 配置验证器
 * @description 根据 ConfigSchema 验证配置值
 */
export class ConfigValidator {
  /** 自定义验证规则 */
  private rules: Array<(value: unknown, schema: ConfigSchema, context: ValidationContext) => ConfigValidationError | null> = [];

  /**
   * 验证配置值
   * @param value - 要验证的值
   * @param schema - 配置 Schema
   * @param path - 当前路径（用于错误报告）
   * @returns 验证报告
   */
  validate(value: unknown, schema: ConfigSchema, path: string = ''): ConfigValidationReport {
    const errors: ConfigValidationError[] = [];
    const context: ValidationContext = { path, root: value };

    // 处理 null/undefined
    if (value === null) {
      if (!schema.nullable && schema.default === undefined) {
        errors.push(this.createError(path, 'type_error', 'Value cannot be null'));
      }
      return { valid: errors.length === 0, errors, errorCount: errors.length, warningCount: 0 };
    }

    if (value === undefined) {
      if (schema.required) {
        errors.push(this.createError(path, 'required', 'Value is required'));
      } else if (schema.default !== undefined) {
        // 使用默认值，不报错
      }
      return { valid: errors.length === 0, errors, errorCount: errors.length, warningCount: 0 };
    }

    // 执行自定义验证（最优先）
    if (schema.validate) {
      const result = schema.validate(value, context);
      if (!result.valid) {
        errors.push(this.createError(path, 'custom_error', result.message || 'Custom validation failed'));
      }
    }

    // 根据类型验证
    switch (schema.type) {
      case 'string':
        errors.push(...this.validateString(value, schema as ConfigSchema<string>, path));
        break;
      case 'number':
        errors.push(...this.validateNumber(value, schema as ConfigSchema<number>, path));
        break;
      case 'boolean':
        errors.push(...this.validateBoolean(value, schema as ConfigSchema<boolean>, path));
        break;
      case 'object':
        errors.push(...this.validateObject(value, schema as ConfigSchema<Record<string, unknown>>, path));
        break;
      case 'array':
        errors.push(...this.validateArray(value, schema as ConfigSchema<unknown[]>, path));
        break;
      case 'enum':
        errors.push(...this.validateEnum(value, schema, path));
        break;
      case 'union':
        errors.push(...this.validateUnion(value, schema, path));
        break;
    }

    // 执行自定义规则
    for (const rule of this.rules) {
      const error = rule(value, schema, context);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      errorCount: errors.length,
      warningCount: 0,
    };
  }

  /**
   * 验证字符串值
   */
  private validateString(value: unknown, schema: ConfigSchema<string>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (typeof value !== 'string') {
      errors.push(this.createError(path, 'type_error', `Expected string, got ${typeof value}`, 'string', value));
      return errors;
    }

    const stringSchema = schema.string || {};

    // minLength
    if (stringSchema.minLength !== undefined && value.length < stringSchema.minLength) {
      errors.push(this.createError(
        path,
        'min_length',
        `String must be at least ${stringSchema.minLength} characters`,
        `minLength: ${stringSchema.minLength}`,
        value.length,
      ));
    }

    // maxLength
    if (stringSchema.maxLength !== undefined && value.length > stringSchema.maxLength) {
      errors.push(this.createError(
        path,
        'max_length',
        `String must be at most ${stringSchema.maxLength} characters`,
        `maxLength: ${stringSchema.maxLength}`,
        value.length,
      ));
    }

    // pattern
    if (stringSchema.pattern) {
      const pattern = typeof stringSchema.pattern === 'string' ? new RegExp(stringSchema.pattern) : stringSchema.pattern;
      if (!pattern.test(value)) {
        errors.push(this.createError(
          path,
          'pattern_mismatch',
          `String does not match pattern: ${stringSchema.pattern}`,
          String(stringSchema.pattern),
          value,
        ));
      }
    }

    // format
    if (stringSchema.format && this.isStringType(value)) {
      const formatError = this.validateFormat(value, stringSchema.format);
      if (formatError) {
        errors.push(this.createError(path, 'format_error', formatError, stringSchema.format, value));
      }
    }

    // enum
    if (stringSchema.enum && !stringSchema.enum.includes(value)) {
      errors.push(this.createError(
        path,
        'enum_mismatch',
        `Value must be one of: ${stringSchema.enum.join(', ')}`,
        stringSchema.enum.join(' | '),
        value,
      ));
    }

    return errors;
  }

  /**
   * 验证数字值
   */
  private validateNumber(value: unknown, schema: ConfigSchema<number>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(this.createError(path, 'type_error', `Expected number, got ${typeof value}`, 'number', value));
      return errors;
    }

    const numberSchema = schema.number || {};

    // integer
    if (numberSchema.integer && !Number.isInteger(value)) {
      errors.push(this.createError(path, 'type_error', 'Value must be an integer', 'integer', value));
    }

    // minimum
    if (numberSchema.minimum !== undefined && value < numberSchema.minimum) {
      errors.push(this.createError(
        path,
        'minimum',
        `Value must be >= ${numberSchema.minimum}`,
        `minimum: ${numberSchema.minimum}`,
        value,
      ));
    }

    // maximum
    if (numberSchema.maximum !== undefined && value > numberSchema.maximum) {
      errors.push(this.createError(
        path,
        'maximum',
        `Value must be <= ${numberSchema.maximum}`,
        `maximum: ${numberSchema.maximum}`,
        value,
      ));
    }

    // exclusiveMinimum
    if (numberSchema.exclusiveMinimum !== undefined && value <= numberSchema.exclusiveMinimum) {
      errors.push(this.createError(
        path,
        'minimum',
        `Value must be > ${numberSchema.exclusiveMinimum}`,
        `exclusiveMinimum: ${numberSchema.exclusiveMinimum}`,
        value,
      ));
    }

    // exclusiveMaximum
    if (numberSchema.exclusiveMaximum !== undefined && value >= numberSchema.exclusiveMaximum) {
      errors.push(this.createError(
        path,
        'maximum',
        `Value must be < ${numberSchema.exclusiveMaximum}`,
        `exclusiveMaximum: ${numberSchema.exclusiveMaximum}`,
        value,
      ));
    }

    // enum
    if (numberSchema.enum && !numberSchema.enum.includes(value)) {
      errors.push(this.createError(
        path,
        'enum_mismatch',
        `Value must be one of: ${numberSchema.enum.join(', ')}`,
        numberSchema.enum.join(' | '),
        value,
      ));
    }

    return errors;
  }

  /**
   * 验证布尔值
   */
  private validateBoolean(value: unknown, _schema: ConfigSchema<boolean>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (typeof value !== 'boolean') {
      errors.push(this.createError(path, 'type_error', `Expected boolean, got ${typeof value}`, 'boolean', value));
    }

    return errors;
  }

  /**
   * 验证对象值
   */
  private validateObject(value: unknown, schema: ConfigSchema<Record<string, unknown>>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(this.createError(path, 'type_error', `Expected object, got ${typeof value}`, 'object', value));
      return errors;
    }

    const objectSchema = schema.object;
    if (!objectSchema) return errors;

    const obj = value as Record<string, unknown>;

    // maxProperties
    const keys = Object.keys(obj);
    if (objectSchema.maxProperties !== undefined && keys.length > objectSchema.maxProperties) {
      errors.push(this.createError(
        path,
        'max_items',
        `Object must have at most ${objectSchema.maxProperties} properties`,
        `maxProperties: ${objectSchema.maxProperties}`,
        keys.length,
      ));
    }

    // minProperties
    if (objectSchema.minProperties !== undefined && keys.length < objectSchema.minProperties) {
      errors.push(this.createError(
        path,
        'min_items',
        `Object must have at least ${objectSchema.minProperties} properties`,
        `minProperties: ${objectSchema.minProperties}`,
        keys.length,
      ));
    }

    // 检查每个属性
    for (const [key, propertySchema] of Object.entries(objectSchema.properties || {})) {
      const propertyPath = path ? `${path}.${key}` : key;
      const propertyValue = obj[key];

      if (propertyValue !== undefined) {
        const propertyReport = this.validate(propertyValue, propertySchema, propertyPath);
        errors.push(...propertyReport.errors);
      } else if (propertySchema.required) {
        errors.push(this.createError(propertyPath, 'required', `Property "${key}" is required`));
      }
    }

    // 检查额外属性
    const definedKeys = new Set(Object.keys(objectSchema.properties || {}));
    if (!objectSchema.additionalProperties) {
      for (const key of keys) {
        if (!definedKeys.has(key)) {
          // 检查 patternProperties
          let matchesPattern = false;
          if (objectSchema.patternProperties) {
            for (const pattern of Object.keys(objectSchema.patternProperties)) {
              const regex = new RegExp(pattern);
              if (regex.test(key)) {
                matchesPattern = true;
                break;
              }
            }
          }
          if (!matchesPattern) {
            errors.push(this.createError(
              `${path}.${key}`,
              'additional_properties',
              `Additional property "${key}" is not allowed`,
              key,
              key,
            ));
          }
        }
      }
    }

    return errors;
  }

  /**
   * 验证数组值
   */
  private validateArray(value: unknown, schema: ConfigSchema<unknown[]>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!Array.isArray(value)) {
      errors.push(this.createError(path, 'type_error', `Expected array, got ${typeof value}`, 'array', value));
      return errors;
    }

    const arraySchema = schema.array || {};

    // minItems
    if (arraySchema.minItems !== undefined && value.length < arraySchema.minItems) {
      errors.push(this.createError(
        path,
        'min_items',
        `Array must have at least ${arraySchema.minItems} items`,
        `minItems: ${arraySchema.minItems}`,
        value.length,
      ));
    }

    // maxItems
    if (arraySchema.maxItems !== undefined && value.length > arraySchema.maxItems) {
      errors.push(this.createError(
        path,
        'max_items',
        `Array must have at most ${arraySchema.maxItems} items`,
        `maxItems: ${arraySchema.maxItems}`,
        value.length,
      ));
    }

    // uniqueItems
    if (arraySchema.uniqueItems) {
      const seen = new Set();
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push(this.createError(
            `${path}[${i}]`,
            'unique_items',
            `Duplicate item found at index ${i}`,
            'uniqueItems',
            item,
          ));
        }
        seen.add(key);
      }
    }

    // 验证每个元素
    if (arraySchema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${path}[${i}]`;
        const itemReport = this.validate(value[i], arraySchema.items, itemPath);
        errors.push(...itemReport.errors);
      }
    }

    // 验证元组
    if (arraySchema.tuple) {
      for (let i = 0; i < Math.min(value.length, arraySchema.tuple.length); i++) {
        const itemPath = `${path}[${i}]`;
        const itemReport = this.validate(value[i], arraySchema.tuple[i]!, itemPath);
        errors.push(...itemReport.errors);
      }
      // 元组长度不匹配
      if (value.length !== arraySchema.tuple.length) {
        errors.push(this.createError(
          path,
          'max_items',
          `Tuple must have exactly ${arraySchema.tuple.length} items, got ${value.length}`,
          `tuple length: ${arraySchema.tuple.length}`,
          value.length,
        ));
      }
    }

    return errors;
  }

  /**
   * 验证枚举值
   */
  private validateEnum<T>(value: unknown, schema: ConfigSchema<T>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const enumSchema = schema.enum!;

    if (!enumSchema.values.includes(value as T)) {
      errors.push(this.createError(
        path,
        'enum_mismatch',
        `Value must be one of: ${enumSchema.values.map((v) => JSON.stringify(v)).join(', ')}`,
        enumSchema.values.map((v) => JSON.stringify(v)).join(' | '),
        value,
      ));
    }

    return errors;
  }

  /**
   * 验证联合类型
   */
  private validateUnion(value: unknown, schema: ConfigSchema<unknown>, path: string): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];
    const unionSchema = schema.union!;

    // anyOf: 至少一个匹配
    if (unionSchema.anyOf) {
      let matched = false;
      for (const subSchema of unionSchema.anyOf) {
        const report = this.validate(value, subSchema, path);
        if (report.valid) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        errors.push(this.createError(
          path,
          'type_error',
          'Value does not match any of the allowed types',
          'union',
          value,
        ));
      }
    }

    // oneOf: 恰好一个匹配
    if (unionSchema.oneOf) {
      let matchCount = 0;
      for (const subSchema of unionSchema.oneOf) {
        const report = this.validate(value, subSchema, path);
        if (report.valid) {
          matchCount++;
        }
      }
      if (matchCount !== 1) {
        errors.push(this.createError(
          path,
          'type_error',
          `Value must match exactly one of the allowed types, matched ${matchCount}`,
          'oneOf',
          value,
        ));
      }
    }

    return errors;
  }

  /**
   * 验证字符串格式
   */
  private validateFormat(value: string, format: StringFormat): string | null {
    switch (format) {
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(Date.parse(value))) {
          return `Invalid date format, expected YYYY-MM-DD`;
        }
        return null;

      case 'time':
        if (!/^\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value)) {
          return `Invalid time format`;
        }
        return null;

      case 'date-time':
        if (isNaN(Date.parse(value))) {
          return `Invalid ISO 8601 date-time format`;
        }
        return null;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `Invalid email format`;
        }
        return null;

      case 'url':
      case 'uri':
        try {
          new URL(value);
          return null;
        } catch {
          return `Invalid URL format`;
        }

      case 'uuid':
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
          return `Invalid UUID format`;
        }
        return null;

      case 'semver':
        if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(value)) {
          return `Invalid semver format, expected MAJOR.MINOR.PATCH`;
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * 创建验证错误
   */
  private createError(
    path: string,
    code: ValidationErrorCode,
    message: string,
    expected?: string,
    actual?: unknown,
  ): ConfigValidationError {
    return { path, code, message, expected, actual };
  }

  /**
   * 添加自定义验证规则
   */
  addRule(rule: (value: unknown, schema: ConfigSchema, context: ValidationContext) => ConfigValidationError | null): void {
    this.rules.push(rule);
  }

  /**
   * 移除自定义验证规则
   */
  removeRule(rule: (value: unknown, schema: ConfigSchema, context: ValidationContext) => ConfigValidationError | null): void {
    const index = this.rules.indexOf(rule);
    if (index !== -1) {
      this.rules.splice(index, 1);
    }
  }

  // ==================== 类型守卫 ====================

  private isStringType(value: unknown): value is string {
    return typeof value === 'string';
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速验证配置
 */
export function validateConfig<T>(value: unknown, schema: ConfigSchema<T>): ConfigValidationReport {
  const validator = new ConfigValidator();
  return validator.validate(value, schema as unknown as ConfigSchema<unknown>);
}
