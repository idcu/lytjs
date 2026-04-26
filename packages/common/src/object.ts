/**
 * Lyt.js Core Shared - Object Utilities
 *
 * 对象操作工具函数
 * 纯原生零依赖实现
 */

import { isPlainObject, isArray, isFunction } from './is';

/**
 * 浅合并对象
 * 将源对象的属性合并到目标对象
 */
export function mergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void {
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    target[keys[i]] = source[keys[i]];
  }
}

/**
 * 深合并对象
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const key in source) {
    const sourceVal = source[key];
    if (isPlainObject(sourceVal) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

/**
 * 创建对象快照（浅克隆）
 */
export function createSnapshot(obj: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key in obj) {
    const val = obj[key];
    if (isPlainObject(val)) {
      snapshot[key] = createSnapshot(val);
    } else if (isArray(val)) {
      snapshot[key] = [...val];
    } else {
      snapshot[key] = val;
    }
  }
  return snapshot;
}

/**
 * 比较两个对象的差异
 */
export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): {
  added: Record<string, unknown>;
  removed: Record<string, unknown>;
  changed: Record<string, { old: unknown; new: unknown }>;
} {
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const hadOld = key in oldObj;
    const hadNew = key in newObj;
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (!hadOld) {
      added[key] = newVal;
    } else if (!hadNew) {
      removed[key] = oldVal;
    } else if (!Object.is(oldVal, newVal)) {
      changed[key] = { old: oldVal, new: newVal };
    }
  }

  return { added, removed, changed };
}

/**
 * 选取对象的部分属性
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * 排除对象的部分属性
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * 深克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (isArray(obj)) {
    return (obj as unknown[]).map(item => deepClone(item)) as T;
  }

  if (isPlainObject(obj)) {
    const cloned: Record<string, unknown> = {};
    for (const key in obj) {
      cloned[key] = deepClone(obj[key]);
    }
    return cloned as T;
  }

  return obj;
}

/**
 * 判断两个对象是否相等（浅比较）
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || (a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * 判断两个对象是否相等（深比较）
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }

  return true;
}

/**
 * 安全获取嵌套属性
 */
export function get<T = unknown>(
  obj: Record<string, unknown>,
  path: string | string[],
  defaultValue?: T
): T | undefined {
  const keys = isArray(path) ? path : path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current === undefined ? defaultValue : current) as T | undefined;
}

/**
 * 安全设置嵌套属性
 */
export function set(
  obj: Record<string, unknown>,
  path: string | string[],
  value: unknown
): void {
  const keys = isArray(path) ? path : path.split('.');
  let current: unknown = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const currentObj = current as Record<string, unknown>;
    if (!(key in currentObj) || !isPlainObject(currentObj[key])) {
      currentObj[key] = {};
    }
    current = currentObj[key];
  }

  (current as Record<string, unknown>)[keys[keys.length - 1]] = value;
}
