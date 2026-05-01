// src/props.ts
// Props handling - validation, normalization, defaults

import {
  isString,
  isNumber,
  isBoolean,
  isObject,
  isArray,
  isFunction,
  hasOwn,
  EMPTY_OBJ,
} from "@lytjs/common-is";
import type { PropOptions } from "./types";
import type { ComponentInternalInstance } from "./types";

/**
 * Normalize props definition into a consistent Record<string, PropOptions> format.
 * Handles array-based props (e.g., ['a', 'b']) and object-based props.
 */
export function normalizePropsOptions(
  rawProps?: Record<string, PropOptions> | string[],
): Record<string, PropOptions> {
  if (!rawProps) return EMPTY_OBJ as Record<string, PropOptions>;

  if (isArray(rawProps)) {
    // Array-based: ['foo', 'bar'] => { foo: {}, bar: {} }
    const result: Record<string, PropOptions> = {};
    for (let i = 0; i < rawProps.length; i++) {
      const key = rawProps[i]!;
      result[key] = {};
    }
    return result;
  }

  // Object-based: normalize each entry
  const result: Record<string, PropOptions> = {};
  for (const key in rawProps) {
    if (hasOwn(rawProps, key)) {
      const value = rawProps[key]!;
      result[key] =
        (isFunction(value) || isArray(value) ? { type: value } : value) as PropOptions;
    }
  }
  return result;
}

/**
 * Resolve prop value with default and type checking.
 * Handles Boolean casting for absent props.
 */
export function resolvePropValue<T = unknown>(
  propOptions: PropOptions,
  value: unknown,
  _instance?: ComponentInternalInstance,
  key?: string,
): T | undefined {
  const { type, default: defaultValue, required, validator } = propOptions;

  // If value is absent (undefined) and there's a default, use it
  if (value === undefined) {
    // Boolean casting: if type is Boolean and no default, default to false
    if (
      type === Boolean ||
      (isArray(type) && type.includes(Boolean as unknown))
    ) {
      return false as T | undefined;
    }
    if (defaultValue !== undefined) {
      const def = isFunction(defaultValue) ? defaultValue() : defaultValue;
      return def as T | undefined;
    }
    // Check required prop
    if (required && __DEV__) {
      console.warn(`[lytjs]: Missing required prop: "${key}"`);
    }
    return undefined;
  }

  // Type validation
  if (type !== undefined && __DEV__) {
    validateType(value, type);
  }

  // Custom validator
  if (validator && __DEV__) {
    if (!validator(value)) {
      console.warn(`[lytjs]: Prop validation failed for prop "${key}": received ${JSON.stringify(value)}`);
    }
  }

  return value as T | undefined;
}

/**
 * Validate value against a type or array of types.
 */
export function validateType(value: unknown, type: unknown): boolean {
  if (type === null || type === undefined) return true;

  let expectedType: string;

  if (isArray(type)) {
    // Array of types - value must match at least one
    for (let i = 0; i < type.length; i++) {
      if (checkType(value, type[i]! as PropTypeConstructor)) return true;
    }
    expectedType = type.map((t) => getTypeName(t)).join(" | ");
  } else {
    if (checkType(value, type as PropTypeConstructor)) return true;
    expectedType = getTypeName(type);
  }

  if (__DEV__) {
    console.warn(
      `[lytjs]: Invalid prop: expected ${expectedType}, got ${getTypeName(value)}.`,
    );
  }

  return false;
}

/** Prop 类型构造器 */
type PropTypeConstructor =
  | (new (...args: unknown[]) => unknown)
  | { (): unknown };

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
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (isArray(value)) return "Array";
  if (isString(value)) return "String";
  if (isNumber(value)) return "Number";
  if (isBoolean(value)) return "Boolean";
  if (isFunction(value)) return "Function";
  if (isObject(value)) return "Object";
  return String(value);
}
