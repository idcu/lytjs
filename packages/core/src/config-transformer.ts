// src/config-transformer.ts
// @lytjs/core - 插件配置转换器

import type { ConfigSchema, ConfigTransformReport, ConfigValidationError } from './config-schema';
import { ConfigValidator } from './config-validator';

/**
 * 配置转换器
 * @description 负责应用默认值、类型转换和预处理
 */
export class ConfigTransformer {
  private validator: ConfigValidator;

  constructor() {
    this.validator = new ConfigValidator();
  }

  /**
   * 转换并验证配置
   * @param value - 原始配置值
   * @param schema - 配置 Schema
   * @param path - 当前路径
   * @returns 转换报告
   */
  transform<T>(
    value: unknown,
    schema: ConfigSchema<T>,
    path: string = '',
  ): ConfigTransformReport<T> {
    const warnings: string[] = [];
    const transforms: string[] = [];
    const errors: ConfigValidationError[] = [];
    let transformed = value;

    // 1. 处理 undefined → 应用默认值
    if (transformed === undefined) {
      if (schema.default !== undefined) {
        transformed = schema.default;
        transforms.push(`Applied default value: ${JSON.stringify(schema.default)}`);
      } else if (schema.required) {
        errors.push({
          path,
          code: 'required',
          message: 'Value is required',
        });
        return { config: undefined as unknown as T, success: false, errors, warnings, transforms };
      }
    }

    // 2. 处理 null
    if (transformed === null) {
      if (schema.nullable) {
        // null 是允许的
      } else if (schema.default !== undefined) {
        transformed = schema.default;
        transforms.push(`Applied default value for null: ${JSON.stringify(schema.default)}`);
        warnings.push('Null value was replaced with default');
      } else {
        errors.push({
          path,
          code: 'type_error',
          message: 'Value cannot be null',
        });
        return { config: null as unknown as T, success: false, errors, warnings, transforms };
      }
    }

    // 3. 应用类型转换
    if (transformed !== undefined && transformed !== null) {
      if (schema.transform) {
        try {
          const original = transformed;
          transformed = schema.transform(transformed);
          if (original !== transformed) {
            transforms.push(`Applied transform function`);
          }
        } catch (err) {
          errors.push({
            path,
            code: 'custom_error',
            message: `Transform failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          return { config: transformed as T, success: false, errors, warnings, transforms };
        }
      }
    }

    // 4. 递归处理复杂类型
    if (
      schema.type === 'object' &&
      schema.object &&
      typeof transformed === 'object' &&
      transformed !== null
    ) {
      const objectResult = this.transformObject(
        transformed as Record<string, unknown>,
        schema as ConfigSchema<Record<string, unknown>>,
        path,
      );
      transformed = objectResult.value as unknown as T;
      errors.push(...objectResult.errors);
      warnings.push(...objectResult.warnings);
      transforms.push(...objectResult.transforms);
    } else if (schema.type === 'array' && schema.array && Array.isArray(transformed)) {
      const arrayResult = this.transformArray(
        transformed,
        schema as unknown as ConfigSchema<unknown[]>,
        path,
      );
      transformed = arrayResult.value as unknown as T;
      errors.push(...arrayResult.errors);
      warnings.push(...arrayResult.warnings);
      transforms.push(...arrayResult.transforms);
    }

    // 5. 验证转换后的值
    if (transformed !== undefined && transformed !== null) {
      const validationReport = this.validator.validate(
        transformed,
        schema as ConfigSchema<unknown>,
        path,
      );
      errors.push(...validationReport.errors);
    }

    return {
      config: transformed as T,
      success: errors.length === 0,
      errors,
      warnings,
      transforms,
    };
  }

  /**
   * 转换对象配置
   */
  private transformObject(
    obj: Record<string, unknown>,
    schema: ConfigSchema<Record<string, unknown>>,
    path: string,
  ): {
    value: Record<string, unknown>;
    errors: ConfigValidationError[];
    warnings: string[];
    transforms: string[];
  } {
    const result: Record<string, unknown> = {};
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];
    const transforms: string[] = [];
    const objectSchema = schema.object!;
    const definedKeys = new Set(Object.keys(objectSchema.properties || {}));

    // 处理每个定义的属性
    for (const [key, propertySchema] of Object.entries(objectSchema.properties || {})) {
      const propertyPath = path ? `${path}.${key}` : key;
      const propertyValue = obj[key];

      // 应用属性级别的转换
      if (propertyValue !== undefined) {
        const propertyResult = this.transform(propertyValue, propertySchema, propertyPath);
        result[key] = propertyResult.config;
        errors.push(...propertyResult.errors);
        warnings.push(...propertyResult.warnings);
        transforms.push(...propertyResult.transforms);
      } else if (propertySchema.default !== undefined) {
        result[key] = propertySchema.default;
        transforms.push(`Applied default for "${key}": ${JSON.stringify(propertySchema.default)}`);
      } else if (propertySchema.required) {
        errors.push({
          path: propertyPath,
          code: 'required',
          message: `Property "${key}" is required`,
        });
      }
    }

    // 处理 patternProperties
    if (objectSchema.patternProperties) {
      for (const key of Object.keys(obj)) {
        if (!definedKeys.has(key)) {
          for (const [pattern, patternSchema] of Object.entries(objectSchema.patternProperties)) {
            const regex = new RegExp(pattern);
            if (regex.test(key)) {
              const propertyPath = `${path}.${key}`;
              const propertyResult = this.transform(obj[key], patternSchema, propertyPath);
              result[key] = propertyResult.config;
              errors.push(...propertyResult.errors);
              warnings.push(...propertyResult.warnings);
              transforms.push(...propertyResult.transforms);
            }
          }
        }
      }
    }

    // 处理额外属性
    if (!objectSchema.additionalProperties) {
      for (const key of Object.keys(obj)) {
        if (!definedKeys.has(key)) {
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
            warnings.push(`Additional property "${key}" will be ignored`);
          }
        }
      }
    }

    return { value: result, errors, warnings, transforms };
  }

  /**
   * 转换数组配置
   */
  private transformArray(
    arr: unknown[],
    schema: ConfigSchema<unknown[]>,
    path: string,
  ): {
    value: unknown[];
    errors: ConfigValidationError[];
    warnings: string[];
    transforms: string[];
  } {
    const result: unknown[] = [];
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];
    const transforms: string[] = [];
    const arraySchema = schema.array!;

    for (let i = 0; i < arr.length; i++) {
      const itemPath = `${path}[${i}]`;
      const itemResult = this.transform(arr[i], arraySchema.items!, itemPath);
      result.push(itemResult.config);
      errors.push(...itemResult.errors);
      warnings.push(...itemResult.warnings);
      transforms.push(...itemResult.transforms);
    }

    // 处理元组默认值
    if (arraySchema.tuple) {
      for (let i = arr.length; i < arraySchema.tuple.length; i++) {
        const itemSchema = arraySchema.tuple[i];
        if (itemSchema && itemSchema.default !== undefined) {
          result.push(itemSchema.default);
          transforms.push(`Applied default for tuple[${i}]: ${JSON.stringify(itemSchema.default)}`);
        }
      }
    }

    return { value: result, errors, warnings, transforms };
  }

  /**
   * 合并多个配置（用户配置覆盖默认配置）
   * @param defaults - 默认配置
   * @param overrides - 用户配置
   * @param schema - 配置 Schema
   * @returns 合并后的配置
   */
  merge<T>(
    defaults: Partial<T>,
    overrides: Partial<T>,
    schema: ConfigSchema<T>,
  ): ConfigTransformReport<T> {
    // 深度合并
    const merged = this.deepMerge(
      defaults as Record<string, unknown>,
      overrides as Record<string, unknown>,
    );
    return this.transform(merged, schema as ConfigSchema<T>);
  }

  /**
   * 深度合并两个对象
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof result[key] === 'object' &&
          result[key] !== null &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>,
          );
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * 从配置中提取指定字段
   * @param config - 完整配置
   * @param schema - 配置 Schema
   * @param keys - 要提取的键
   * @returns 提取的配置子集
   */
  extract<T, K extends keyof T>(config: T, schema: ConfigSchema<T>, keys: K[]): Partial<T> {
    const result: Partial<T> = {} as Partial<T>;
    const configObj = config as unknown as Record<string, unknown>;

    for (const key of keys) {
      if (key in configObj) {
        const propertySchema = schema.object?.properties?.[key as string];
        if (propertySchema) {
          const propertyReport = this.transform(
            configObj[key as string],
            propertySchema as ConfigSchema<unknown>,
            String(key),
          );
          if (propertyReport.success) {
            (result as Record<string, unknown>)[key as string] = propertyReport.config;
          }
        } else {
          (result as Record<string, unknown>)[key as string] = configObj[key as string];
        }
      }
    }

    return result;
  }
}

// ==================== 便捷函数 ====================

/**
 * 快速转换配置
 */
export function transformConfig<T>(
  value: unknown,
  schema: ConfigSchema<T>,
): ConfigTransformReport<T> {
  const transformer = new ConfigTransformer();
  return transformer.transform(value, schema);
}

/**
 * 快速合并配置
 */
export function mergeConfig<T>(
  defaults: Partial<T>,
  overrides: Partial<T>,
  schema: ConfigSchema<T>,
): ConfigTransformReport<T> {
  const transformer = new ConfigTransformer();
  return transformer.merge(defaults, overrides, schema);
}
