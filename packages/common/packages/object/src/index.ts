/**
 * @lytjs/common-object
 * 对象操作工具函数集合
 */

import { isPlainObject, isArray, isNullish, hasOwn } from "@lytjs/common-is";

/**
 * 危险 key 列表，用于防止原型污染
 */
const PROTO_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * 浅合并多个对象
 */
export function mergeObjects<T extends Record<string, any>>(
  ...sources: Partial<T>[]
): T {
  const result = {} as T;
  for (const source of sources) {
    if (source) {
      for (const key in source) {
        if (hasOwn(source, key) && !PROTO_POLLUTION_KEYS.has(key)) {
          (result as any)[key] = source[key];
        }
      }
    }
  }
  return result;
}

/**
 * 深度合并两个对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key in source) {
    if (hasOwn(source, key) && !PROTO_POLLUTION_KEYS.has(key)) {
      const sourceVal = source[key];
      const targetVal = result[key];
      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        result[key] = deepMerge(
          targetVal as Record<string, any>,
          sourceVal as Record<string, any>,
        ) as any;
      } else {
        result[key] = sourceVal as any;
      }
    }
  }
  return result;
}

/**
 * 创建对象的浅快照
 */
export function createSnapshot<T extends Record<string, any>>(obj: T): T {
  return { ...obj };
}

/**
 * 对象差异结果
 */
export interface ObjectDiff<T = any> {
  added: Record<string, T>;
  removed: Record<string, T>;
  changed: Record<string, { from: T; to: T }>;
}

/**
 * 比较两个对象的差异
 */
export function diffObjects<T extends Record<string, any>>(
  oldObj: T,
  newObj: T,
): ObjectDiff {
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const changed: Record<string, { from: any; to: any }> = {};

  // 检查新增和变更
  for (const key in newObj) {
    if (hasOwn(newObj, key)) {
      if (!hasOwn(oldObj, key)) {
        added[key] = newObj[key];
      } else if (oldObj[key] !== newObj[key]) {
        changed[key] = { from: oldObj[key], to: newObj[key] };
      }
    }
  }

  // 检查删除
  for (const key in oldObj) {
    if (hasOwn(oldObj, key) && !hasOwn(newObj, key)) {
      removed[key] = oldObj[key];
    }
  }

  return { added, removed, changed };
}

/**
 * 从对象中选取指定的属性
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (hasOwn(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * 从对象中排除指定的属性
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(
  source: T,
  seen = new WeakMap<object, unknown>(),
): T {
  // 基本类型直接返回
  if (source === null || typeof source !== "object") return source;

  // 循环引用检测
  if (seen.has(source as object)) return seen.get(source as object) as T;

  // 特殊对象类型
  if (source instanceof Date) return new Date(source.getTime()) as T;
  if (source instanceof RegExp) return new RegExp(source) as T;
  if (source instanceof Map) {
    const clone = new Map();
    seen.set(source, clone);
    source.forEach((value, key) => {
      clone.set(deepClone(key, seen), deepClone(value, seen));
    });
    return clone as T;
  }
  if (source instanceof Set) {
    const clone = new Set();
    seen.set(source, clone);
    source.forEach((value) => {
      clone.add(deepClone(value, seen));
    });
    return clone as T;
  }

  // 数组
  if (isArray(source)) {
    const clone: unknown[] = [];
    seen.set(source, clone);
    for (let i = 0; i < source.length; i++) {
      clone[i] = deepClone(source[i], seen);
    }
    return clone as T;
  }

  // 普通对象
  const clone = {} as Record<string | symbol, unknown>;
  seen.set(source, clone);
  for (const key of Object.keys(source)) {
    clone[key] = deepClone((source as Record<string, unknown>)[key], seen);
  }
  return clone as T;
}

/**
 * 浅比较两个对象是否相等
 */
export function shallowEqual(
  a: Record<string, any>,
  b: Record<string, any>,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key] || !hasOwn(b, key)) {
      return false;
    }
  }

  return true;
}

/**
 * 深度比较两个值是否相等
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === "number" && Number.isNaN(a) && Number.isNaN(b)) return true;

  if (typeof a !== "object") return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * 通过路径获取对象中的值
 */
export function get<T = any>(
  obj: Record<string, any>,
  path: string,
  defaultValue?: T,
): T | undefined {
  if (!path) return obj as T;
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current == null) return defaultValue;
    current = current[key];
  }
  return isNullish(current) ? defaultValue : current;
}

/**
 * 通过路径设置对象中的值（不修改原对象）
 */
export function set<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any,
): T {
  if (!path) return obj;
  const keys = path.split(".");
  const result = { ...obj };
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    } else {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  current[keys[keys.length - 1]!] = value;
  return result;
}
