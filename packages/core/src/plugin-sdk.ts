// src/plugin-sdk.ts
// @lytjs/core - 插件开发 SDK
/* eslint-disable no-console */

import type { EnhancedPlugin, App } from './types';
import type { ConfigSchema, ConfigValidationReport, ConfigTransformReport } from './config-schema';
import { ConfigTransformer, transformConfig } from './config-transformer';
import { validateConfig } from './config-validator';

/**
 * 插件配置选项
 */
export interface PluginConfig<TOptions = unknown> {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version?: string;
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 关键词 */
  keywords?: string[];
  /** 插件选项 Schema */
  schema?: ConfigSchema<TOptions>;
  /** 安装函数 */
  install: (app: App, options: TOptions) => void | Promise<void>;
}

/**
 * 插件定义结果
 */
export interface PluginDefinition<TOptions = unknown> extends EnhancedPlugin<TOptions> {
  /** 配置验证报告 */
  configReport?: ConfigValidationReport;
}

/**
 * 创建插件定义
 * @description 提供类型安全的插件定义方式
 *
 * @example
 * ```typescript
 * const myPlugin = definePlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My awesome plugin',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       theme: { type: 'string', string: { enum: ['light', 'dark'] }, default: 'light' },
 *       debug: { type: 'boolean', default: false },
 *     },
 *   },
 *   install: (app, options) => {
 *     console.log('Plugin installed with options:', options);
 *   },
 * });
 * ```
 */
export function definePlugin<TOptions = unknown>(
  config: PluginConfig<TOptions>,
): PluginDefinition<TOptions> {
  const { name, version, description, author, keywords, schema, install } = config;

  const plugin: PluginDefinition<TOptions> = {
    name,
    version,
    meta: {
      description,
      author,
      keywords,
    },
    configSchema: schema,
    install: async (app, ...options) => {
      const rawOptions = options[0] as TOptions | undefined;

      // 如果有 Schema，验证和转换配置
      if (schema) {
        const transformer = new ConfigTransformer();
        const report = transformer.transform(rawOptions, schema);

        if (!report.success) {
          const errors = report.errors.map((e) => `${e.path}: ${e.message}`).join(', ');
          throw new Error(`Plugin "${name}" configuration validation failed: ${errors}`);
        }

        await install(app, report.config);
      } else {
        await install(app, rawOptions as TOptions);
      }
    },
  };

  return plugin;
}

/**
 * 验证插件配置
 * @description 验证用户提供的配置是否符合 Schema
 *
 * @example
 * ```typescript
 * const result = validatePluginConfig(myPlugin, { theme: 'dark', debug: true });
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validatePluginConfig<TOptions>(
  plugin: EnhancedPlugin<TOptions>,
  userConfig: unknown,
): ConfigValidationReport {
  if (!plugin.configSchema) {
    return { valid: true, errors: [], errorCount: 0, warningCount: 0 };
  }
  return validateConfig(userConfig, plugin.configSchema);
}

/**
 * 转换插件配置
 * @description 验证并转换用户配置，应用默认值
 *
 * @example
 * ```typescript
 * const result = transformPluginConfig(myPlugin, { debug: true });
 * // result.config = { theme: 'light', debug: true } (theme 从 default 填充)
 * ```
 */
export function transformPluginConfig<TOptions>(
  plugin: EnhancedPlugin<TOptions>,
  userConfig: unknown,
): ConfigTransformReport<TOptions> {
  if (!plugin.configSchema) {
    return {
      config: userConfig as TOptions,
      success: true,
      errors: [],
      warnings: [],
      transforms: [],
    };
  }
  return transformConfig(userConfig, plugin.configSchema);
}

/**
 * 合并插件默认配置
 * @description 将用户配置与插件默认配置合并
 *
 * @example
 * ```typescript
 * const result = mergePluginConfig(myPlugin, { theme: 'dark' }, userConfig);
 * ```
 */
export function mergePluginConfig<TOptions>(
  plugin: EnhancedPlugin<TOptions>,
  defaults: Partial<TOptions>,
  overrides: Partial<TOptions>,
): ConfigTransformReport<TOptions> {
  if (!plugin.configSchema) {
    const merged = { ...defaults, ...overrides } as TOptions;
    return {
      config: merged,
      success: true,
      errors: [],
      warnings: [],
      transforms: [],
    };
  }

  const transformer = new ConfigTransformer();
  return transformer.merge(defaults, overrides, plugin.configSchema);
}

/**
 * 创建插件测试器
 * @description 用于在隔离环境中测试插件
 */
export interface PluginTesterOptions {
  /** 测试用的 App 配置 */
  appConfig?: {
    performance?: boolean;
    globalProperties?: Record<string, unknown>;
  };
  /** 是否启用调试日志 */
  debug?: boolean;
  /** 配置验证回调 */
  onValidationError?: (errors: ConfigValidationReport) => void;
  /** 安装前回调 */
  onBeforeInstall?: (app: App) => void;
  /** 安装后回调 */
  onAfterInstall?: (app: App) => void;
  /** 清理回调 */
  onCleanup?: () => void;
}

/**
 * 插件测试器
 * @description 提供插件测试的辅助功能
 */
export class PluginTester {
  private options: Required<PluginTesterOptions>;
  private app: App | null = null;
  private installedPlugins: Set<string> = new Set();

  constructor(options: PluginTesterOptions = {}) {
    this.options = {
      appConfig: options.appConfig || {},
      debug: options.debug || false,
      onValidationError: options.onValidationError || (() => {}),
      onBeforeInstall: options.onBeforeInstall || (() => {}),
      onAfterInstall: options.onAfterInstall || (() => {}),
      onCleanup: options.onCleanup || (() => {}),
    };
  }

  /**
   * 创建测试 App
   */
  async createApp(): Promise<App> {
    const { createApp, h } = await import('./index');

    const app = createApp({
      render: () => h('div'),
    });

    this.app = app;
    return app;
  }

  /**
   * 安装插件进行测试
   */
  async installPlugin(plugin: EnhancedPlugin, options?: unknown): Promise<void> {
    if (!this.app) {
      await this.createApp();
    }

    // 配置验证
    if (plugin.configSchema) {
      const report = validatePluginConfig(plugin, options);
      if (!report.valid) {
        this.options.onValidationError(report);
        if (this.options.debug) {
          console.error('[PluginTester] Validation errors:', report.errors);
        }
      }
    }

    // beforeInstall 钩子
    this.options.onBeforeInstall(this.app!);

    if (this.options.debug) {
      console.log(`[PluginTester] Installing plugin: ${plugin.name}`);
    }

    // 安装
    this.app!.use(plugin, options);

    this.installedPlugins.add(plugin.name);

    // afterInstall 钩子
    this.options.onAfterInstall(this.app!);
  }

  /**
   * 卸载插件进行测试
   */
  uninstallPlugin(name: string): void {
    if (!this.app || !this.installedPlugins.has(name)) {
      return;
    }

    if (this.options.debug) {
      console.log(`[PluginTester] Uninstalling plugin: ${name}`);
    }

    this.app._pluginRegistry.unregister(name);
    this.installedPlugins.delete(name);
  }

  /**
   * 运行清理
   */
  cleanup(): void {
    if (this.app) {
      this.app.unmount();
    }
    this.app = null;
    this.installedPlugins.clear();
    this.options.onCleanup();
  }

  /**
   * 获取已安装插件列表
   */
  getInstalledPlugins(): string[] {
    return Array.from(this.installedPlugins);
  }

  /**
   * 获取 App 实例
   */
  getApp(): App | null {
    return this.app;
  }
}

/**
 * 快速创建插件测试器
 */
export function createPluginTester(options?: PluginTesterOptions): PluginTester {
  return new PluginTester(options);
}

/**
 * 测试插件安装
 * @description 在隔离环境中测试插件安装
 */
export async function testPluginInstall(
  plugin: EnhancedPlugin,
  options?: unknown,
  testerOptions?: PluginTesterOptions,
): Promise<{ success: boolean; error?: Error; app?: App }> {
  const tester = createPluginTester(testerOptions);

  try {
    await tester.installPlugin(plugin, options);
    return { success: true, app: tester.getApp()! };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    tester.cleanup();
  }
}
