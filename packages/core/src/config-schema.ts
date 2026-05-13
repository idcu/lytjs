// src/config-schema.ts
// @lytjs/core - 插件配置 Schema 系统

/**
 * 配置 Schema 类型
 * @description JSON Schema 风格的结构化配置验证
 */

/** Schema 类型枚举 */
export type SchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'enum'
  | 'union';

/** JSON Schema 风格的配置 Schema */
export interface ConfigSchema<T = unknown> {
  /** Schema 类型 */
  type: SchemaType;
  /** 字段描述（用于文档生成） */
  description?: string;
  /** 默认值 */
  default?: T;
  /** 是否必填 */
  required?: boolean;
  /** 是否可为空 */
  nullable?: boolean;

  // 类型特定验证

  /** 字符串验证 */
  string?: StringSchema;
  /** 数字验证 */
  number?: NumberSchema;
  /** 布尔验证 */
  boolean?: BooleanSchema;
  /** 对象验证 */
  object?: ObjectSchema<T>;
  /** 数组验证 */
  array?: ArraySchema;
  /** 枚举验证 */
  enum?: EnumSchema<T>;
  /** 联合类型验证 */
  union?: UnionSchema;

  /** 自定义验证函数 */
  validate?: (value: T, context: ValidationContext) => ValidationResult;
  /** 转换函数（用于预处理用户输入） */
  transform?: (value: unknown) => T;
}

/** 字符串 Schema */
export interface StringSchema {
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 正则表达式模式 */
  pattern?: string | RegExp;
  /** 格式校验 */
  format?: StringFormat;
  /** 枚举值 */
  enum?: string[];
}

/** 字符串格式 */
export type StringFormat =
  | 'date'
  | 'time'
  | 'date-time'
  | 'email'
  | 'url'
  | 'uri'
  | 'uuid'
  | 'semver';

/** 数字 Schema */
export interface NumberSchema {
  /** 最小值 */
  minimum?: number;
  /** 最大值 */
  maximum?: number;
  /** 排除最小值 */
  exclusiveMinimum?: number;
  /** 排除最大值 */
  exclusiveMaximum?: number;
  /** 必须为整数 */
  integer?: boolean;
  /** 枚举值 */
  enum?: number[];
}

/** 布尔 Schema */
export interface BooleanSchema {
  /** 默认值时的说明 */
  defaultDescription?: string;
}

/** 对象 Schema */
export interface ObjectSchema<T = unknown> {
  /** 属性定义 */
  properties: Record<string, ConfigSchema>;
  /** 必需属性 */
  required?: string[];
  /** 额外属性是否允许 */
  additionalProperties?: boolean;
  /** 属性名模式 */
  patternProperties?: Record<string, ConfigSchema>;
  /** 最大属性数 */
  maxProperties?: number;
  /** 最小属性数 */
  minProperties?: number;
  /** 对象级别验证 */
  validate?: (obj: T, context: ValidationContext) => ValidationResult;
}

/** 数组 Schema */
export interface ArraySchema {
  /** 元素类型 */
  items?: ConfigSchema;
  /** 元组类型（固定长度） */
  tuple?: ConfigSchema[];
  /** 最少元素数 */
  minItems?: number;
  /** 最多元素数 */
  maxItems?: number;
  /** 是否允许重复 */
  uniqueItems?: boolean;
}

/** 枚举 Schema */
export interface EnumSchema<T = unknown> {
  /** 允许的值 */
  values: T[];
  /** 默认值 */
  default?: T;
}

/** 联合类型 Schema */
export interface UnionSchema {
  /** 可选的类型 */
  anyOf: ConfigSchema[];
  /** 精确匹配类型 */
  oneOf?: ConfigSchema[];
  /** 不允许的类型 */
  not?: ConfigSchema;
}

/** 验证上下文 */
export interface ValidationContext {
  /** 当前路径（用于错误报告） */
  path: string;
  /** 根对象 */
  root: unknown;
  /** 自定义数据 */
  data?: Record<string, unknown>;
}

/** 验证结果 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 */
  message?: string;
  /** 错误路径 */
  path?: string;
}

/** 验证错误 */
export interface ConfigValidationError {
  /** 错误路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 期望的值类型 */
  expected?: string;
  /** 实际的值 */
  actual?: unknown;
  /** 错误代码 */
  code: ValidationErrorCode;
}

/** 验证错误代码 */
export type ValidationErrorCode =
  | 'type_error'
  | 'required'
  | 'enum_mismatch'
  | 'pattern_mismatch'
  | 'format_error'
  | 'min_length'
  | 'max_length'
  | 'minimum'
  | 'maximum'
  | 'min_items'
  | 'max_items'
  | 'unique_items'
  | 'additional_properties'
  | 'custom_error';

/** 配置验证报告 */
export interface ConfigValidationReport {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ConfigValidationError[];
  /** 错误数量 */
  errorCount: number;
  /** 警告数量 */
  warningCount: number;
}

/** 配置转换报告 */
export interface ConfigTransformReport<T = unknown> {
  /** 转换后的配置 */
  config: T;
  /** 是否成功 */
  success: boolean;
  /** 错误列表 */
  errors: ConfigValidationError[];
  /** 警告列表 */
  warnings: string[];
  /** 应用的转换 */
  transforms: string[];
}
