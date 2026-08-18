// src/index.ts
// @lytjs/config - 独立通用配置系统

// 配置管理器
export { ConfigManager } from './config';
export type {
  ConfigChangeCallback,
  ConfigOptions,
  ConfigValue,
  ConfigObject,
  ConfigArray,
} from './config';

// 配置 Schema 系统
export type {
  ConfigSchema,
  SchemaType,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ObjectSchema,
  ArraySchema,
  EnumSchema,
  UnionSchema,
  StringFormat,
  ConfigValidationReport,
  ConfigValidationError,
  ValidationErrorCode,
  ConfigTransformReport,
  ValidationContext,
  ValidationResult,
} from './config-schema';

// 配置验证器
export { ConfigValidator, validateConfig } from './config-validator';

// 配置转换器
export { ConfigTransformer, transformConfig, mergeConfig } from './config-transformer';