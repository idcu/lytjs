/**
 * @lytjs/common-assertions
 * 类型断言工具包
 *
 * 提供安全的类型转换和断言工具，替代不安全的 as unknown as 双重断言。
 *
 * @author LytJS Team
 * @since 6.0.0
 */

import { isObject, isString, isFunction, isArray, isNumber } from '@lytjs/common-is';

// ==================== 核心类型断言函数 ====================

/**
 * 安全地将一个值断言为指定类型（不做运行时检查）
 *
 * 这是 as unknown as T 的安全替代品，语义更清晰。
 * 仅在确定类型安全时使用，优先使用其他更安全的断言函数。
 *
 * @param value - 要断言的值
 * @returns 断言后的值
 *
 * @template T - 目标类型
 *
 * @example
 * ```typescript
 * // 不推荐
 * const el = vnode.el as unknown as HTMLElement;
 *
 * // 推荐
 * const el = unsafeCast<HTMLElement>(vnode.el);
 * ```
 */
export function unsafeCast<T>(value: unknown): T {
  return value as T;
}

/**
 * 将 nullish 值转换为指定类型的默认值
 *
 * @param value - 可能为 null 或 undefined 的值
 * @param defaultValue - 默认值
 * @returns 原值或默认值
 *
 * @template T - 值的类型
 */
export function nullishCoalesce<T>(value: T | null | undefined, defaultValue: T): T {
  return value ?? defaultValue;
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

// ==================== VNode / 跨平台专用工具 ====================

/**
 * 检查值是否是具有 __isRendererHost 标记的渲染器宿主对象
 *
 * 用于判断一个对象是否是渲染器的宿主元素，替代 as unknown as Record 的检查。
 *
 * @param value - 要检查的值
 * @returns 是否是渲染器宿主对象
 */
export function isRendererHost(value: unknown): boolean {
  return (
    isObject(value) &&
    '__isRendererHost' in value &&
    (value as Record<string, unknown>).__isRendererHost === true
  );
}

/**
 * 安全地获取对象的任意属性值
 *
 * @param obj - 对象
 * @param key - 属性名
 * @returns 属性值或 undefined
 */
export function safeGetProperty(obj: unknown, key: PropertyKey): unknown {
  if (isObject(obj) && key in obj) {
    return (obj as Record<PropertyKey, unknown>)[key];
  }
  return undefined;
}

/**
 * 安全地将对象转换为 Record 类型
 *
 * @param value - 要转换的值
 * @returns Record 或 undefined（如果不是对象）
 */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (isObject(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

/**
 * 安全地访问嵌套对象属性
 *
 * @param obj - 根对象
 * @param path - 属性路径（如 'a.b.c'）
 * @returns 属性值或 undefined
 */
export function safeGetNested(obj: unknown, path: string): unknown {
  if (!isObject(obj)) return undefined;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// ==================== 基本类型守卫（补充 common-is）====================

/**
 * 检查值是否是数字类型且为有限值
 *
 * @param value - 要检查的值
 * @returns 是否是有限数字
 */
export function isFiniteNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

/**
 * 检查值是否是非空字符串
 *
 * @param value - 要检查的值
 * @returns 是否是非空字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * 检查值是否是非空数组
 *
 * @param value - 要检查的值
 * @returns 是否是非空数组
 */
export function isNonEmptyArray<T = unknown>(value: unknown): value is T[] {
  return isArray(value) && value.length > 0;
}

/**
 * 检查值是否是非空对象（排除 null 和数组）
 *
 * @param value - 要检查的值
 * @returns 是否是非空对象
 */
export function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.keys(value).length > 0;
}

// ==================== 条件断言 ====================

/**
 * 在开发模式下执行断言检查
 *
 * @param condition - 断言条件
 * @param message - 失败时的错误消息
 * @throws 如果条件为 false 且在开发模式下，抛出错误
 */
export function invariant(condition: boolean, message?: string): void {
  if (__DEV__ && !condition) {
    throw new Error(message || 'Invariant failed');
  }
}

/**
 * 在开发模式下发出警告
 *
 * @param condition - 警告条件（为 true 时发出警告）
 * @param message - 警告消息
 */
export function warning(condition: boolean, message?: string): void {
  if (__DEV__ && condition) {
    console.warn(`[LytJS Warning] ${message || 'Warning'}`);
  }
}
