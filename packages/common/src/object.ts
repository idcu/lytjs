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
  target: Record<string, any>,
  source: Record<string, any>
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
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
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
export function createSnapshot(obj: Record<string, any>): Record<string, any> {
  const snapshot: Record<string, any> = {};
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
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Record<string, { old: any; new: any }>;
} {
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const changed: Record<string, { old: any; new: any }> = {};
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
export function pick<T extends Record<string, any>, K extends keyof T>(
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
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result;
}

/**
 * 深克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (isArray(obj)) {
    return (obj as any[]).map(item => deepClone(item)) as T;
  }

  if (isPlainObject(obj)) {
    const cloned: Record<string, any> = {};
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
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * 判断两个对象是否相等（深比较）
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * 安全获取嵌套属性
 */
export function get<T = any>(
  obj: Record<string, any>,
  path: string | string[],
  defaultValue?: T
): T | undefined {
  const keys = isArray(path) ? path : path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}

/**
 * 安全设置嵌套属性
 */
export function set(
  obj: Record<string, any>,
  path: string | string[],
  value: any
): void {
  const keys = isArray(path) ? path : path.split('.');
  let current: any = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || !isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
