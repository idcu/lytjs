/**
 * @lytjs/common-object
 * 对象操作工具函数集合
 */

import {
  isPlainObject,
  isArray,
  isNullish,
} from '@lytjs/common-is'

/**
 * 浅合并多个对象
 */
export function mergeObjects<T extends Record<string, any>>(
  ...sources: Partial<T>[]
): T {
  const result = {} as T
  for (const source of sources) {
    if (source) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          ;(result as any)[key] = source[key]
        }
      }
    }
  }
  return result
}

/**
 * 深度合并两个对象
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target }
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceVal = source[key]
      const targetVal = result[key]
      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        result[key] = deepMerge(
          targetVal as Record<string, any>,
          sourceVal as Record<string, any>
        ) as any
      } else {
        result[key] = sourceVal as any
      }
    }
  }
  return result
}

/**
 * 创建对象的浅快照
 */
export function createSnapshot<T extends Record<string, any>>(obj: T): T {
  return { ...obj }
}

/**
 * 对象差异结果
 */
export interface ObjectDiff<T = any> {
  added: Record<string, T>
  removed: Record<string, T>
  changed: Record<string, { from: T; to: T }>
}

/**
 * 比较两个对象的差异
 */
export function diffObjects<T extends Record<string, any>>(
  oldObj: T,
  newObj: T
): ObjectDiff {
  const added: Record<string, any> = {}
  const removed: Record<string, any> = {}
  const changed: Record<string, { from: any; to: any }> = {}

  // 检查新增和变更
  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      if (!Object.prototype.hasOwnProperty.call(oldObj, key)) {
        added[key] = newObj[key]
      } else if (oldObj[key] !== newObj[key]) {
        changed[key] = { from: oldObj[key], to: newObj[key] }
      }
    }
  }

  // 检查删除
  for (const key in oldObj) {
    if (
      Object.prototype.hasOwnProperty.call(oldObj, key) &&
      !Object.prototype.hasOwnProperty.call(newObj, key)
    ) {
      removed[key] = oldObj[key]
    }
  }

  return { added, removed, changed }
}

/**
 * 从对象中选取指定的属性
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * 从对象中排除指定的属性
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as any
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as any
  }

  if (isArray(value)) {
    return value.map((item) => deepClone(item)) as any
  }

  if (isPlainObject(value)) {
    const result = {} as Record<string, any>
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = deepClone(value[key])
      }
    }
    return result as T
  }

  return value
}

/**
 * 浅比较两个对象是否相等
 */
export function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  if (a === b) return true
  if (!a || !b) return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (a[key] !== b[key] || !Object.prototype.hasOwnProperty.call(b, key)) {
      return false
    }
  }

  return true
}

/**
 * 深度比较两个值是否相等
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false

  if (typeof a === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true

  if (typeof a !== 'object') return false

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) => deepEqual(a[key], b[key]))
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  return false
}

/**
 * 通过路径获取对象中的值
 */
export function get<T = any>(
  obj: Record<string, any>,
  path: string,
  defaultValue?: T
): T | undefined {
  if (!path) return obj as T
  const keys = path.split('.')
  let current: any = obj
  for (const key of keys) {
    if (current == null) return defaultValue
    current = current[key]
  }
  return isNullish(current) ? defaultValue : current
}

/**
 * 通过路径设置对象中的值（不修改原对象）
 */
export function set<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any
): T {
  if (!path) return obj
  const keys = path.split('.')
  const result = { ...obj }
  let current: any = result

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {}
    } else {
      current[key] = { ...current[key] }
    }
    current = current[key]
  }

  current[keys[keys.length - 1]!] = value
  return result
}
