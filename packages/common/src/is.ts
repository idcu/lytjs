/**
 * Lyt.js Core Shared - Type Check Utilities
 *
 * 类型检查工具函数
 * 纯原生零依赖实现
 */

/**
 * 判断值是否为字符串或数字
 */
export function isStringOrNumber(val: unknown): val is string | number {
  return typeof val === 'string' || typeof val === 'number';
}

/**
 * 判断值是否为数组
 */
export function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

/**
 * 判断值是否为函数
 */
export function isFunction(val: unknown): val is (...args: unknown[]) => unknown {
  return typeof val === 'function';
}

/**
 * 判断值是否为普通对象（非数组、非null）
 */
export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * 判断值是否为 Promise
 */
export function isPromise(val: unknown): val is Promise<unknown> {
  return val !== null && typeof val === 'object' && typeof (val as Record<string, unknown>).then === 'function';
}

/**
 * 判断值是否为 null 或 undefined
 */
export function isNullish(val: unknown): val is null | undefined {
  return val === null || val === undefined;
}

/**
 * 判断值是否为空
 * - null/undefined -> true
 * - 空字符串/空数组 -> true
 * - 空对象 -> true
 */
export function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (isArray(val) || typeof val === 'string') return val.length === 0;
  if (isPlainObject(val)) return Object.keys(val).length === 0;
  return false;
}

/**
 * 判断值是否为字符串
 */
export function isString(val: unknown): val is string {
  return typeof val === 'string';
}

/**
 * 判断值是否为数字
 */
export function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

/**
 * 判断值是否为布尔值
 */
export function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

/**
 * 判断值是否为 Symbol
 */
export function isSymbol(val: unknown): val is symbol {
  return typeof val === 'symbol';
}

/**
 * 判断值是否为 BigInt
 */
export function isBigInt(val: unknown): val is bigint {
  return typeof val === 'bigint';
}

/**
 * 判断值是否为对象（包括数组、函数等）
 */
export function isObject(val: unknown): val is object {
  return val !== null && (typeof val === 'object' || typeof val === 'function');
}

/**
 * 判断是否是 VNode
 */
export function isVNode(val: unknown): val is { type: unknown; shapeFlag: unknown; [key: string]: unknown } {
  return (
    val !== null &&
    typeof val === 'object' &&
    (val as Record<string, unknown>).type !== undefined &&
    (val as Record<string, unknown>).shapeFlag !== undefined
  );
}
