// src/props.ts
// Props 处理 - 验证、规范化、默认值

import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  hasOwn,
  EMPTY_OBJ,
} from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { PropOptions } from './types';
import type { ComponentInternalInstance } from './types';

/**
 * 将 props 定义规范化为统一的 Record<string, PropOptions> 格式。
 * 处理数组形式的 props（如 ['a', 'b']）和对象形式的 props。
 */
export function normalizePropsOptions(
  rawProps?: Record<string, PropOptions> | string[],
): Record<string, PropOptions> {
  if (!rawProps) return EMPTY_OBJ as Record<string, PropOptions>;

  if (isArray(rawProps)) {
    // 数组形式：['foo', 'bar'] => { foo: {}, bar: {} }
    const result: Record<string, PropOptions> = {};
    for (let i = 0; i < rawProps.length; i++) {
      const key = rawProps[i]!;
      result[key] = {};
    }
    return result;
  }

  // 对象形式：规范化每个条目
  const result: Record<string, PropOptions> = {};
  for (const key in rawProps) {
    if (hasOwn(rawProps, key)) {
      const value = rawProps[key]!;
      result[key] = (isFunction(value) || isArray(value) ? { type: value } : value) as PropOptions;
    }
  }
  return result;
}

/**
 * 解析 prop 值，处理默认值和类型检查。
 * 处理缺失 prop 的布尔类型转换。
 */
export function resolvePropValue<T = unknown>(
  propOptions: PropOptions,
  value: unknown,
  _instance?: ComponentInternalInstance,
  key?: string,
): T | undefined {
  const { type, default: defaultValue, required, validator } = propOptions;

  // 如果值缺失（undefined）且有默认值，使用默认值
  if (value === undefined) {
    // FIX: P1-10 先检查 defaultValue，再处理 Boolean 类型
    // 如果存在默认值，优先使用默认值（包括 Boolean 类型的 default: true）
    if (defaultValue !== undefined) {
      let def: unknown;
      if (isFunction(defaultValue)) {
        try {
          def = defaultValue();
        } catch (e) {
          if (__DEV__) {
            warn(`Failed to resolve default value for prop "${key}": ${(e as Error).message}`);
          }
          def = undefined;
        }
      } else {
        def = defaultValue;
      }
      return def as T | undefined;
    }
    // 布尔类型转换：如果类型为 Boolean 且无默认值，默认为 false
    // 类型断言 `Boolean as unknown` 是必要的，因为 PropOptions.type 的类型
    // 为 Constructor | Constructor[]，而 Boolean 构造函数需要通过 unknown 中间
    // 类型才能与数组元素类型兼容
    if (type === Boolean || (isArray(type) && type.includes(Boolean as unknown))) {
      return false as T | undefined;
    }
    // 检查必填 prop
    if (required && __DEV__) {
      warn(`Missing required prop: "${key}"`);
    }
    return undefined;
  }

  // 类型验证
  if (type !== undefined && __DEV__) {
    validateType(value, type, key);
  }

  // 自定义验证器
  if (validator && __DEV__) {
    if (!validator(value)) {
      warn(
        `Prop validation failed for prop "${key}": received ${(() => {
          try {
            return JSON.stringify(value);
          } catch {
            return '[object Object]';
          }
        })()}`,
      );
    }
  }

  return value as T | undefined;
}

/**
 * 根据类型或类型数组验证值。
 */
export function validateType(value: unknown, type: unknown, key?: string): boolean {
  if (type === null || type === undefined) return true;

  let expectedType: string;
  const actualType = getTypeName(value);

  if (isArray(type)) {
    // 类型数组 - 值必须至少匹配其中一个
    for (let i = 0; i < type.length; i++) {
      // type[i] 的静态类型为 unknown，需要断言为 PropTypeConstructor 以调用 checkType
      if (checkType(value, type[i]! as PropTypeConstructor)) return true;
    }
    expectedType = type.map((t) => getTypeName(t)).join(' | ');
  } else {
    if (checkType(value, type as PropTypeConstructor)) return true;
    expectedType = getTypeName(type);
  }

  if (__DEV__) {
    const keyInfo = key ? ` "${key}"` : '';
    warn(
      `Invalid prop${keyInfo}: expected type ${expectedType}, got ${actualType}.` +
        (value !== null && value !== undefined
          ? ` (value: ${(() => {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            })()})`
          : ''),
    );
  }

  return false;
}

/** Prop 类型构造器 */
type PropTypeConstructor = (new (...args: unknown[]) => unknown) | { (): unknown };

function checkType(value: unknown, type: PropTypeConstructor | PropTypeConstructor[]): boolean {
  if (type === String) return isString(value);
  if (type === Number) return isNumber(value);
  if (type === Boolean) return isBoolean(value);
  if (type === Object) return isObject(value) && !isArray(value);
  if (type === Array) return isArray(value);
  if (type === Function) return isFunction(value);
  return false;
}

function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (isArray(value)) return 'Array';
  if (isString(value)) return 'String';
  if (isNumber(value)) return 'Number';
  if (isBoolean(value)) return 'Boolean';
  if (isFunction(value)) return 'Function';
  if (isObject(value)) return 'Object';
  return String(value);
}
