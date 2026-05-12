/**
 * @lytjs/common-assertions
 * Type assertion utilities for LytJS
 *
 * @author LytJS Team
 * @since 6.0.0
 */

import { isObject, isString, isFunction } from '@lytjs/common-is';

// ==================== 类型断言函数 ====================

/**
 * 安全地将一个值断言为指定类型（不做运行时检查）
 * 用于替代 as unknown as T 的双重断言
 *
 * @param value - 要断言的值
 * @returns 断言后的值
 *
 * @template T - 目标类型
 */
export function unsafeCast<T>(value: unknown): T {
  return value as T;
}

/**
 * 类型断言函数：将一个值断言为指定类型，并在开发模式下进行验证
 *
 * @param value - 要断言的值
 * @param validator - 验证函数，用于检查值是否符合预期类型
 * @param errorMessage - 可选的错误消息
 * @throws 如果验证失败，在开发模式下抛出错误
 * @returns 断言后的值
 *
 * @template T - 目标类型
 */
export function assertType<T>(
  value: unknown,
  validator?: (v: unknown) => boolean,
  errorMessage?: string,
): asserts value is T {
  if (__DEV__ && validator && !validator(value)) {
    throw new TypeError(
      errorMessage || `Value is not of expected type`,
    );
  }
}

/**
 * 安全的类型转换：结合类型守卫 + 类型断言
 *
 * @param value - 要转换的值
 * @param typeGuard - 类型守卫函数
 * @param defaultValue - 如果类型不匹配时的默认值
 * @returns 转换后的值或默认值
 *
 * @template T - 目标类型
 */
export function safeCast<T>(
  value: unknown,
  typeGuard: (v: unknown) => v is T,
  defaultValue?: T,
): T | undefined {
  if (typeGuard(value)) {
    return value;
  }
  return defaultValue;
}

// ==================== 常见类型守卫组合 ====================

/**
 * 检查值是否是具有特定属性的对象
 *
 * @param value - 要检查的值
 * @param key - 属性名
 * @returns 是否具有该属性的对象
 */
export function hasProperty<K extends PropertyKey>(
  value: unknown,
  key: K,
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

/**
 * 检查值是否是具有多个特定属性的对象
 *
 * @param value - 要检查的值
 * @param keys - 属性名数组
 * @returns 是否具有所有属性的对象
 */
export function hasProperties<K extends PropertyKey>(
  value: unknown,
  keys: K[],
): value is Record<K, unknown> {
  return (
    isObject(value) && keys.every((key) => key in value)
  );
}

/**
 * 检查值是否是具有特定类型属性的对象
 *
 * @param value - 要检查的值
 * @param key - 属性名
 * @param typeGuard - 属性值的类型守卫
 * @returns 是否是具有特定类型属性的对象
 */
export function hasTypedProperty<K extends PropertyKey, V>(
  value: unknown,
  key: K,
  typeGuard: (v: unknown) => v is V,
): value is Record<K, V> {
  return (
    isObject(value) &&
    key in value &&
    typeGuard((value as Record<K, unknown>)[key])
  );
}

// ==================== 实例类型守卫 ====================

/**
 * 检查值是否是特定类的实例
 *
 * @param value - 要检查的值
 * @param constructor - 构造函数
 * @returns 是否是该类的实例
 */
export function isInstanceOf<T>(
  value: unknown,
  constructor: new (...args: any[]) => T,
): value is T {
  return value instanceof constructor;
}

/**
 * 检查值是否是数组且数组中的每个元素都通过类型守卫检查
 *
 * @param value - 要检查的值
 * @param elementGuard - 元素类型守卫
 * @returns 是否是符合要求的数组
 */
export function isArrayOf<T>(
  value: unknown,
  elementGuard: (v: unknown) => v is T,
): value is T[] {
  return Array.isArray(value) && value.every(elementGuard);
}

// ==================== 字符串类型的安全访问 ====================

/**
 * 安全地访问对象的字符串属性
 *
 * @param obj - 对象
 * @param key - 属性名
 * @returns 属性值或 undefined
 */
export function safeGetString(
  obj: unknown,
  key: PropertyKey,
): string | undefined {
  if (hasTypedProperty(obj, key, isString)) {
    return obj[key];
  }
  return undefined;
}

/**
 * 安全地访问对象的函数属性
 *
 * @param obj - 对象
 * @param key - 属性名
 * @returns 函数或 undefined
 */
export function safeGetFunction(
  obj: unknown,
  key: PropertyKey,
): ((...args: any[]) => any) | undefined {
  if (hasTypedProperty(obj, key, isFunction)) {
    return obj[key];
  }
  return undefined;
}
