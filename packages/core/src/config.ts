/**
 * @lytjs/core - 全局配置系统
 *
 * 提供运行时配置管理和合并功能
 *
 * @module @lytjs/core/config
 * @version 6.0.0
 */

import { deepClone, hasChanged, isObject, isFunction } from '@lytjs/common-object';

// ============================================================
// 类型定义
// ============================================================

/**
 * 配置变更监听器
 */
export type ConfigChangeCallback<T = unknown> = (
  newValue: T,
  oldValue: T,
  path: string,
) => void;

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
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ConfigObject
  | ConfigArray;

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
 * 全局配置管理器
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
   *
   * @example
   * ```ts
   * config.get('api.baseURL') // '/api'
   * config.get('api.timeout', 5000) // 5000 (如果不存在)
   * config.get('theme.colors.primary') // 嵌套值
   * ```
   */
  get<T = ConfigValue>(path: string, defaultValue?: T): T | undefined {
    const keys = path.split('.');
    let value: ConfigValue = this.config;

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
   *
   * @example
   * ```ts
   * config.set('api.timeout', 10000)
   * config.set('theme.colors.primary', '#ff0000')
   * ```
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

    // FIX: P1-10 在修改值之前，收集所有父路径的旧值快照
    const parentOldValues = new Map<string, unknown>();
    const parentParts = path.split('.');
    while (parentParts.length > 1) {
      parentParts.pop();
      const parentPath = parentParts.join('.');
      const parentVal = this.get(parentPath);
      parentOldValues.set(
        parentPath,
        parentVal !== null && typeof parentVal === 'object'
          ? deepClone(parentVal)
          : parentVal,
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
   *
   * @example
   * ```ts
   * config.setMultiple({
   *   'api.timeout': 10000,
   *   'theme.primary': '#ff0000'
   * })
   * ```
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
    let value: ConfigValue = this.config;

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
    let target: ConfigValue = this.config;

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
   *
   * @example
   * ```ts
   * config.merge({
   *   api: { timeout: 10000 },
   *   newKey: 'value'
   * })
   * ```
   */
  merge(config: ConfigObject, deep = true): void {
    if (!this.options.mutable) {
      console.warn('[ConfigManager] Configuration is immutable');
      return;
    }

    // FIX: P2-v11-08 merge() 合并后遍历合并的键通知路径特定监听器，
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
    this.globalListeners.forEach((cb) =>
      cb(this.config, this.config, ''),
    );
  }

  /**
   * 深度合并对象，并在值变更时通知监听器
   * FIX: P2-v11-08 替代原 deepMerge，在合并过程中收集变更的键并通知监听器
   */
  private deepMergeNotify(target: ConfigObject, source: ConfigObject, prefix: string, mergedKeys: string[]): void {
    Object.entries(source).forEach(([key, value]) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (
        isObject(target[key]) &&
        isObject(value)
      ) {
        this.deepMergeNotify(target[key] as ConfigObject, value as ConfigObject, fullPath, mergedKeys);
      } else {
        const oldValue = target[key];
        target[key] = isObject(value)
          ? (deepClone(value) as ConfigValue)
          : value;
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
    this.globalListeners.forEach((cb) =>
      cb(this.config, oldConfig, ''),
    );
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
   *
   * @example
   * ```ts
   * // 监听特定路径
   * const unwatch = config.watch('api.timeout', (newVal, oldVal) => {
   *   console.log(`timeout 从 ${oldVal} 变为 ${newVal}`)
   * })
   *
   * // 监听所有变更
   * config.watch('', (newConfig) => {
   *   console.log('配置已更新:', newConfig)
   * })
   * ```
   */
  watch<T = ConfigValue>(
    path: string,
    callback: ConfigChangeCallback<T>,
  ): () => void {
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
  // FIX: P1-10 增加 parentOldValues 参数，由调用方在修改值之前收集父路径旧值快照
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
    // FIX: P1-10 使用调用方传入的 parentOldValues 快照，确保获取的是变更前的旧值
    const parts = path.split('.');
    while (parts.length > 1) {
      parts.pop();
      const parentPath = parts.join('.');
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        const parentValue = this.get(parentPath);
        const parentOldValue = parentOldValues?.get(parentPath);
        parentListeners.forEach((cb) =>
          cb(parentValue, parentOldValue, path),
        );
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
   * FIX: P2-v11-09 简化 isMutable()：mutable 在构造函数中已设置默认值为 true，
   * 不可能为 undefined，因此 ?? true 是冗余的
   */
  isMutable(): boolean {
    return this.options.mutable;
  }
}

// ============================================================
// 全局配置实例
// ============================================================

/**
 * 默认全局配置
 */
const defaultGlobalConfig: ConfigObject = {
  // 开发配置
  dev: {
    warnOnImmutable: true,
    logLevel: 'warn',
  },

  // 性能配置
  performance: {
    asyncComponentTimeout: 5000,
    keepAliveMax: 10,
    transitionDuration: 300,
  },

  // 编译配置
  compiler: {
    comments: false,
    sourceMap: true,
    optimize: true,
  },

  // 运行时配置
  runtime: {
    errorHandler: null,
    warnHandler: null,
    globalProperties: {},
  },
};

/**
 * 全局配置管理器实例
 */
let globalConfigManager: ConfigManager | null = null;

/**
 * 获取全局配置管理器
 *
 * @returns 全局配置管理器实例
 */
export function getGlobalConfig(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(defaultGlobalConfig);
  }
  return globalConfigManager;
}

/**
 * 设置全局配置
 *
 * @param config - 配置对象
 * @param merge - 是否合并
 */
export function setGlobalConfig(
  config: ConfigObject,
  merge = true,
): void {
  if (merge) {
    getGlobalConfig().merge(config);
  } else {
    getGlobalConfig().reset(config);
  }
}

/**
 * 获取全局配置值
 *
 * @param path - 配置路径
 * @param defaultValue - 默认值
 */
export function getConfig<T = ConfigValue>(
  path: string,
  defaultValue?: T,
): T | undefined {
  return getGlobalConfig().get(path, defaultValue);
}

/**
 * 设置全局配置值
 *
 * @param path - 配置路径
 * @param value - 配置值
 */
export function setConfig<T = ConfigValue>(path: string, value: T): boolean {
  return getGlobalConfig().set(path, value);
}

/**
 * 监听全局配置变更
 *
 * @param path - 配置路径
 * @param callback - 变更回调
 */
export function watchConfig<T = ConfigValue>(
  path: string,
  callback: ConfigChangeCallback<T>,
): () => void {
  return getGlobalConfig().watch(path, callback);
}

// ============================================================
// 配置预设
// ============================================================

/**
 * 配置预设
 */
export const configPresets = {
  /**
   * 开发环境预设
   */
  development: (): ConfigObject => ({
    dev: {
      warnOnImmutable: true,
      logLevel: 'debug',
    },
    compiler: {
      comments: true,
      sourceMap: true,
      optimize: false,
    },
  }),

  /**
   * 生产环境预设
   */
  production: (): ConfigObject => ({
    dev: {
      warnOnImmutable: false,
      logLevel: 'error',
    },
    compiler: {
      comments: false,
      sourceMap: false,
      optimize: true,
    },
  }),

  /**
   * 测试环境预设
   */
  test: (): ConfigObject => ({
    dev: {
      warnOnImmutable: true,
      logLevel: 'silent',
    },
    performance: {
      asyncComponentTimeout: 1000,
      keepAliveMax: 5,
      transitionDuration: 0,
    },
  }),
};

/**
   * 应用配置预设
   *
   * @param preset - 预设名称
   */
export function applyConfigPreset(
  preset: keyof typeof configPresets,
): void {
  const config = configPresets[preset]();
  setGlobalConfig(config, true);
}

// FIX: P2-batch2-5 删除底部重复的 export 块，
// 所有符号已在定义处通过 export class/function/const 直接导出
