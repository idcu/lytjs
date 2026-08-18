/**
 * @lytjs/core - 全局配置系统
 *
 * 复用独立包 @lytjs/config 的通用配置能力，
 * 并在其之上保留框架层的全局配置实例与环境预设。
 *
 * @module @lytjs/core/config
 * @version 6.0.0
 */

import { ConfigManager } from '@lytjs/config';
import type {
  ConfigChangeCallback,
  ConfigOptions,
  ConfigValue,
  ConfigObject,
  ConfigArray,
} from '@lytjs/config';

// ============================================================
// 通用配置系统（复用独立包）
// ============================================================

export { ConfigManager };
export type {
  ConfigChangeCallback,
  ConfigOptions,
  ConfigValue,
  ConfigObject,
  ConfigArray,
};

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
export function setGlobalConfig(config: ConfigObject, merge = true): void {
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
export function getConfig<T = ConfigValue>(path: string, defaultValue?: T): T | undefined {
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
export function applyConfigPreset(preset: keyof typeof configPresets): void {
  const config = configPresets[preset]();
  setGlobalConfig(config, true);
}