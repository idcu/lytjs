/**
 * @lytjs/common-is
 * 类型检查工具函数集合
 */

/**
 * 空函数，用于占位
 */
export const NOOP = (): void => {};

/**
 * 冻结的空对象，用于避免重复创建
 */
export const EMPTY_OBJ: Readonly<Record<string, never>> = Object.freeze({});

/**
 * 检查值是否为字符串
 */
export const isString = (val: unknown): val is string =>
  typeof val === "string";

/**
 * 检查值是否为数字（排除 NaN）
 */
export const isNumber = (val: unknown): val is number =>
  typeof val === "number" && !Number.isNaN(val);

/**
 * 检查值是否为布尔值
 */
export const isBoolean = (val: unknown): val is boolean =>
  typeof val === "boolean";

/**
 * 检查值是否为 Symbol
 */
export const isSymbol = (val: unknown): val is symbol =>
  typeof val === "symbol";

/**
 * 检查值是否为 BigInt
 */
export const isBigInt = (val: unknown): val is bigint =>
  typeof val === "bigint";

/**
 * 检查值是否为对象（非 null）
 */
export const isObject = (val: unknown): val is object =>
  val !== null && (typeof val === "object" || typeof val === "function");

/**
 * 检查值是否为纯对象（plain object）
 */
export const isPlainObject = (val: unknown): val is Record<string, any> =>
  Object.prototype.toString.call(val) === "[object Object]";

/**
 * 检查值是否为数组
 */
export const isArray = Array.isArray;

/**
 * 检查值是否为函数
 */
export const isFunction = (val: unknown): val is Function =>
  typeof val === "function";

/**
 * 检查值是否为 Promise
 */
export const isPromise = (val: unknown): val is Promise<any> =>
  isObject(val) &&
  isFunction((val as any).then) &&
  isFunction((val as any).catch);

/**
 * 检查值是否为 null 或 undefined
 */
export const isNullish = (val: unknown): val is null | undefined => val == null;

/**
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 */
export const isEmpty = (val: unknown): boolean => {
  if (val == null) return true;
  if (isString(val)) return val.length === 0;
  if (isArray(val)) return val.length === 0;
  if (isObject(val)) return Object.keys(val).length === 0;
  return false;
};

/**
 * 检查值是否为字符串或数字
 */
export const isStringOrNumber = (val: unknown): val is string | number =>
  isString(val) || isNumber(val);

/**
 * 检查对象是否拥有指定的自身属性
 */
export const hasOwn = (obj: object, key: string | number | symbol): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * 检查值是否发生了变化（使用 Object.is 比较）
 */
export const hasChanged = (value: unknown, oldValue: unknown): boolean =>
  !Object.is(value, oldValue);

/**
 * 获取值的内部 [[Class]] 标签
 * 等价于 Object.prototype.toString.call(val) 的结果
 */
export const toTypeString = (val: unknown): string =>
  Object.prototype.toString.call(val);

/**
 * 检查值是否为 Map 类型
 */
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === "[object Map]";

/**
 * 检查值是否为 Set 类型
 */
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === "[object Set]";

/**
 * 检查值是否为 WeakMap 类型
 */
export const isWeakMap = (val: unknown): val is WeakMap<any, any> =>
  toTypeString(val) === "[object WeakMap]";

/**
 * 检查值是否为 WeakSet 类型
 */
export const isWeakSet = (val: unknown): val is WeakSet<any> =>
  toTypeString(val) === "[object WeakSet]";

/**
 * 检查值是否为 Date 类型
 */
export const isDate = (val: unknown): val is Date =>
  toTypeString(val) === "[object Date]";

/**
 * 检查值是否为 RegExp 类型
 */
export const isRegExp = (val: unknown): val is RegExp =>
  toTypeString(val) === "[object RegExp]";
