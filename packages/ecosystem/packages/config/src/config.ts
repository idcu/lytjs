// src/config.ts
// @lytjs/config - 配置管理器（纯通用实现，零框架依赖）

import { deepClone } from '@lytjs/common-object';
import { hasChanged, isObject } from '@lytjs/common-is';

// ============================================================
// 类型定义
// ============================================================

/**
 * 配置变更监听器
 */
export type ConfigChangeCallback<T = unknown> = (newValue: T, oldValue: T, path: string) => void;

/**
 * 配置选项
 */
export interface ConfigOptions {
  /** 是否允许在运行时修改配置 */
  mutable?: boolean;
  /** 是否深度合并配置 */
  deepMerge?: boolean;
  /** 变更时的回调函数 */
  onChange?: ConfigChangeCallback;
}

/**
 * 配置对象类型
 */
export type ConfigValue = string | number | boolean | null | undefined | ConfigObject | ConfigArray;

/**
 * 配置对象
 */
export interface ConfigObject {
  [key: string]: ConfigValue;
}

/**
 * 配置数组
 */
export type ConfigArray = ConfigValue[];

// ============================================================
// 配置管理器
// ============================================================

/**
 * 配置管理器
 *
 * 提供配置存储、合并、变更监听等功能
 *
 * @example
 * ```ts
 * // 创建配置管理器
 * const config = new ConfigManager({
 *   api: { baseURL: '/api', timeout: 5000 },
 *   theme: { primary: '#007bff' }
 * })
 *
 * // 获取配置
 * const baseURL = config.get('api.baseURL')
 *
 * // 设置配置
 * config.set('api.timeout', 10000)
 *
 * // 监听变更
 * config.watch('theme.primary', (newVal, oldVal) => {
 *   console.log(`主题色从 ${oldVal} 变为 ${newVal}`)
 * })
 * ```
 */
export class ConfigManager {
  private config: ConfigObject = {};
  private options: ConfigOptions;
  private listeners = new Map<string, Set<ConfigChangeCallback>>();
  private globalListeners = new Set<ConfigChangeCallback>();

  constructor(initialConfig: ConfigObject = {}, options: ConfigOptions = {}) {
    this.options = {
      mutable: true,
      deepMerge: true,
      ...options,
    };
    this.config = this.options.deepMerge
      ? (deepClone(initialConfig) as ConfigObject)
      : { ...initialConfig };
  }

  /**
   * 获取配置值
   *
   * @param path - 配置路径（支持点号分隔，如 'api.baseURL'）
   * @param defaultValue - 默认值
   * @returns 配置值或默认值
   */
  get<T = ConfigValue>(path: string, defaultValue?: T): T | undefined {
    const keys = path.split('.');
    let value: ConfigValue | undefined = this.config;

    for (const key of keys) {
      if (isObject(value) && key in value) {
        value = (value as ConfigObject)[key];
      } else {
        return defaultValue;
      }
    }

    return value as T;
  }

  /**
   * 设置配置值
   *
   * @param path - 配置路径
   * @param value - 新值
   * @returns 是否设置成功
   */
  set<T = ConfigValue>(path: string, value: T): boolean {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return false;
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: ConfigObject = this.config;

    // 遍历路径创建嵌套对象
    for (const key of keys) {
      if (!isObject(target[key])) {
        target[key] = {};
      }
      target = target[key] as ConfigObject;
    }

    const oldValue = target[lastKey] as T;

    // 检查值是否变化
    if (!hasChanged(value, oldValue)) {
      return false;
    }

    // 在修改值之前，收集所有父路径的旧值快照
    const parentOldValues = new Map<string, unknown>();
    const parentParts = path.split('.');
    while (parentParts.length > 1) {
      parentParts.pop();
      const parentPath = parentParts.join('.');
      const parentVal = this.get(parentPath);
      parentOldValues.set(
        parentPath,
        parentVal !== null && typeof parentVal === 'object' ? deepClone(parentVal) : parentVal,
      );
    }

    // 设置新值
    target[lastKey] = value as ConfigValue;

    // 触发监听器
    this.notify(path, value, oldValue, parentOldValues);

    return true;
  }

  /**
   * 批量设置配置
   *
   * @param config - 配置对象
   * @param merge - 是否合并（true）或替换（false）
   */
  setMultiple(config: Record<string, ConfigValue>, merge = true): void {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return;
    }

    if (!merge) {
      this.config = {};
    }

    Object.entries(config).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * 检查配置是否存在
   *
   * @param path - 配置路径
   * @returns 是否存在
   */
  has(path: string): boolean {
    const keys = path.split('.');
    let value: ConfigValue | undefined = this.config;

    for (const key of keys) {
      if (isObject(value) && key in value) {
        value = (value as ConfigObject)[key];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * 删除配置
   *
   * @param path - 配置路径
   * @returns 是否删除成功
   */
  delete(path: string): boolean {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return false;
    }

    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: ConfigValue | undefined = this.config;

    for (const key of keys) {
      if (isObject(target) && key in target) {
        target = (target as ConfigObject)[key];
      } else {
        return false;
      }
    }

    if (isObject(target) && lastKey in target) {
      const oldValue = (target as ConfigObject)[lastKey];
      delete (target as ConfigObject)[lastKey];
      this.notify(path, undefined, oldValue);
      return true;
    }

    return false;
  }

  /**
   * 合并配置
   *
   * @param config - 要合并的配置
   * @param deep - 是否深度合并
   */
  merge(config: ConfigObject, deep = true): void {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return;
    }

    // merge() 合并后遍历合并的键通知路径特定监听器，
    // 确保通过 merge() 修改的配置项也能触发对应的 watch 回调
    const mergedKeys: string[] = [];

    if (deep) {
      this.deepMergeNotify(this.config, config, '', mergedKeys);
    } else {
      for (const key of Object.keys(config)) {
        const oldValue = this.config[key];
        this.config[key] = config[key];
        if (hasChanged(this.config[key], oldValue)) {
          this.notify(key, this.config[key], oldValue);
          mergedKeys.push(key);
        }
      }
    }

    // 触发全局监听器
    this.globalListeners.forEach((cb) => cb(this.config, this.config, ''));
  }

  /**
   * 深度合并对象，并在值变更时通知监听器
   */
  private deepMergeNotify(
    target: ConfigObject,
    source: ConfigObject,
    prefix: string,
    mergedKeys: string[],
  ): void {
    Object.entries(source).forEach(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (isObject(target[key]) && isObject(value)) {
        this.deepMergeNotify(
          target[key] as ConfigObject,
          value as ConfigObject,
          fullPath,
          mergedKeys,
        );
      } else {
        const oldValue = target[key];
        target[key] = isObject(value) ? (deepClone(value) as ConfigValue) : value;
        if (hasChanged(target[key], oldValue)) {
          this.notify(fullPath, target[key], oldValue);
          mergedKeys.push(fullPath);
        }
      }
    });
  }

  /**
   * 获取所有配置
   *
   * @returns 配置对象的深拷贝
   */
  getAll(): ConfigObject {
    return deepClone(this.config) as ConfigObject;
  }

  /**
   * 重置配置
   *
   * @param newConfig - 新的配置对象
   */
  reset(newConfig: ConfigObject = {}): void {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return;
    }

    const oldConfig = this.config;
    this.config = this.options.deepMerge
      ? (deepClone(newConfig) as ConfigObject)
      : { ...newConfig };

    // 触发全局监听器
    this.globalListeners.forEach((cb) => cb(this.config, oldConfig, ''));
  }

  /**
   * 清空配置
   */
  clear(): void {
    this.reset({});
  }

  /**
   * 监听配置变更
   *
   * @param path - 配置路径（空字符串表示监听所有变更）
   * @param callback - 变更回调
   * @returns 取消监听函数
   */
  watch<T = ConfigValue>(path: string, callback: ConfigChangeCallback<T>): () => void {
    if (path === '') {
      this.globalListeners.add(callback as ConfigChangeCallback);
      return () => {
        this.globalListeners.delete(callback as ConfigChangeCallback);
      };
    }

    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path)!.add(callback as ConfigChangeCallback);

    return () => {
      this.listeners.get(path)?.delete(callback as ConfigChangeCallback);
    };
  }

  /**
   * 通知监听器
   */
  private notify<T>(
    path: string,
    newValue: T,
    oldValue: T,
    parentOldValues?: Map<string, unknown>,
  ): void {
    // 触发特定路径监听器
    const specificListeners = this.listeners.get(path);
    if (specificListeners) {
      specificListeners.forEach((cb) => cb(newValue, oldValue, path));
    }

    // 触发父路径监听器
    const parts = path.split('.');
    while (parts.length > 1) {
      parts.pop();
      const parentPath = parts.join('.');
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        const parentValue = this.get(parentPath);
        const parentOldValue = parentOldValues?.get(parentPath);
        parentListeners.forEach((cb) => cb(parentValue, parentOldValue, path));
      }
    }

    // 触发全局变更回调
    if (this.options.onChange) {
      this.options.onChange(newValue, oldValue, path);
    }

    // 触发全局监听器
    this.globalListeners.forEach((cb) => cb(newValue, oldValue, path));
  }

  /**
   * 设置可变性
   *
   * @param mutable - 是否可变
   */
  setMutable(mutable: boolean): void {
    this.options.mutable = mutable;
  }

  /**
   * 检查是否可变
   */
  isMutable(): boolean {
    return this.options.mutable ?? true;
  }
}