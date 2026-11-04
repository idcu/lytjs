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
 * 危险路径段：会走到**原型链**上而不是配置自己的属性上。
 *
 * ⚠️ 2026-11-04 修（P0 安全）：`set('__proto__.x', 1)` 此前会把 `x` 写进
 *   `Object.prototype`（实测 `({}).x === 1`，**全局污染**，影响进程内所有对象）；
 *   `set('constructor.prototype.x', 1)` 同样成立。
 *   `get` / `has` 也会顺着原型链读到 `toString` 之类的内建成员
 *   （`has('__proto__.toString') === true`）。
 *
 * 现在所有按路径读写的入口都先过 `isSafePath`：命中危险段就当作「路径不存在」，
 * `set` / `delete` 额外给一条告警（静默拒绝会让用户以为写成功了）。
 */
const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** 路径是否安全（不含原型链上的特殊段） */
function isSafePath(keys: string[]): boolean {
  return keys.every((key) => !FORBIDDEN_PATH_SEGMENTS.has(key));
}

/**
 * 只认**自有属性**（不用 `in`，否则会顺着原型链命中 `toString` / `__proto__`）。
 *
 * 不用 `Object.hasOwn`：本包的 lib 目标是 es2020，`Object.hasOwn` 需要 es2022。
 */
function hasOwn(target: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

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
    if (!isSafePath(keys)) return defaultValue;

    let value: ConfigValue | undefined = this.config;

    for (const key of keys) {
      // ⚠️ 用 `Object.hasOwn` 而不是 `in`：`in` 会顺着原型链命中 `toString` / `__proto__`，
      //   于是 `has('toString')` 返回 true、`get('constructor')` 返回函数。
      if (isObject(value) && hasOwn(value, key)) {
        value = (value as ConfigObject)[key];
      } else {
        return defaultValue;
      }
    }

    // ⚠️ 2026-11-04 修（P1）：此前直接返回**内部引用** ⇒
    //   `const api = config.get('api'); api.baseURL = '/hacked'` 会改掉内部状态，
    //   而且**一个监听器都不会触发**（配置静默漂移，谁都不知道）。
    //   `getAll()` 早就返回深拷贝，这里对齐：对象/数组一律拷贝。
    if (isObject(value) || Array.isArray(value)) {
      return deepClone(value) as T;
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

    // ⚠️ 2026-11-04 修（P0）：危险路径段（`__proto__` / `constructor` / `prototype`）
    //   会把值写进 `Object.prototype` —— 全局污染，影响进程内所有对象。
    if (!isSafePath(keys)) {
      console.warn(
        `[ConfigManager] 拒绝写入危险路径 "${path}"（路径段不能是 __proto__ / constructor / prototype）`,
      );
      return false;
    }

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
      // ⚠️ 2026-11-04 修（P1）：此前直接 `this.config = {}` 再逐项 set ——
      //   **被移除的键一个监听器都不触发**（用户的 `watch('api.baseURL')` 永远不知道它没了）。
      //   现在先收集将被移除的叶子路径，替换后逐个以 `undefined` 通知。
      const removedLeaves: string[] = [];
      const collectLeaves = (obj: ConfigObject, prefix: string): void => {
        for (const [key, value] of Object.entries(obj)) {
          const full = prefix ? `${prefix}.${key}` : key;
          if (isObject(value)) collectLeaves(value as ConfigObject, full);
          else removedLeaves.push(full);
        }
      };
      collectLeaves(this.config, '');

      const oldLeaves = new Map<string, ConfigValue>();
      for (const leaf of removedLeaves) {
        oldLeaves.set(leaf, this.get(leaf));
      }

      this.config = {};

      Object.entries(config).forEach(([path, value]) => {
        this.set(path, value);
      });

      // 替换后仍然不存在的键 ⇒ 视为被移除
      for (const [leaf, oldValue] of oldLeaves) {
        if (!this.has(leaf)) this.notify(leaf, undefined, oldValue);
      }
      return;
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
    if (!isSafePath(keys)) return false;

    let value: ConfigValue | undefined = this.config;

    for (const key of keys) {
      // 同上：必须用自有属性判断，否则 `has('toString')` 为 true
      if (isObject(value) && hasOwn(value, key)) {
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
    if (!isSafePath(keys)) {
      console.warn(
        `[ConfigManager] 拒绝删除危险路径 "${path}"（路径段不能是 __proto__ / constructor / prototype）`,
      );
      return false;
    }

    const lastKey = keys.pop()!;
    let target: ConfigValue | undefined = this.config;

    for (const key of keys) {
      if (isObject(target) && hasOwn(target, key)) {
        target = (target as ConfigObject)[key];
      } else {
        return false;
      }
    }

    if (isObject(target) && hasOwn(target, lastKey)) {
      const oldValue = (target as ConfigObject)[lastKey];

      // ⚠️ 2026-11-04 修（P1）：此前只 `notify(path, ...)`，而 `notify` 的父路径分支
      //   需要调用方传入 `parentOldValues` —— 这里没传 ⇒ **父路径监听器收到 undefined 的旧值**，
      //   而实测更糟：`delete('a.b')` 连 `a.b` 的监听器都没触发（`notify` 早退）。
      //   现在与 `set()` 一样先快照父路径旧值，再删除并通知。
      const parentOldValues = new Map<string, unknown>();
      const parentParts = path.split('.');
      while (parentParts.length > 1) {
        parentParts.pop();
        const parentPath = parentParts.join('.');
        const parentVal = this.get(parentPath);
        parentOldValues.set(parentPath, parentVal);
      }

      delete (target as ConfigObject)[lastKey];
      this.notify(path, undefined, oldValue, parentOldValues);
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
