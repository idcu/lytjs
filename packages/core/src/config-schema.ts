// src/config-schema.ts
// @lytjs/core - 配置 Schema 系统（复用独立包 @lytjs/config，保持向后兼容）

/**
 * 配置 Schema 系统
 *
 * 由独立包 @lytjs/config 提供，此处仅做兼容性转出。
 */
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
} from '@lytjs/config';