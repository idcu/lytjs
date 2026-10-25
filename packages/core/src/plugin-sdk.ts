// src/plugin-sdk.ts
// @lytjs/core - 插件开发 SDK
/* eslint-disable no-console */

import type { EnhancedPlugin, App } from './types';
import { createApp } from './create-app';
import { h } from './h';
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
 * 把 JSON-Schema 风格的「顶层 `properties`」归一化成校验器要求的嵌套形态。
 *
 * ★ 2026-10-24：`@lytjs/config` 的校验器读的是 `schema.object.properties`
 *   （见 `config-validator.ts` 的 `const objectSchema = schema.object; if (!objectSchema) return errors;`），
 *   而**本文件原先的 JSDoc 示例写的是顶层 `properties`** —— 于是按示例写出来的插件：
 *   - `validateConfig()` 恒返回 `valid: true`（对象分支直接 return，**一个字段都不校验**）；
 *   - `transformConfig()` 不报错但也**不填默认值**。
 *   ⇒ 「插件配置校验」整套静默失效，非法配置照装不误。
 *   这里同时接受两种写法（顶层 `properties` 归一化为 `object.properties`），
 *   让示例与实现一致；`ConfigSchema` 的类型定义不受影响。
 */
function normalizeConfigSchema<T>(
  schema: ConfigSchema<T> | undefined,
): ConfigSchema<T> | undefined {
  if (!schema || schema.type !== 'object' || schema.object) return schema;

  const flat = schema as unknown as {
    properties?: Record<string, ConfigSchema>;
    required?: string[];
  };
  if (!flat.properties) return schema;

  // ⚠️ **原地补字段、不克隆**：调用方可能依赖 `plugin.configSchema === 传入的 schema`
  //   （既有测试 `plugin-sdk.test.ts` 就断言了这个同一性）。
  (schema as { object?: unknown }).object = {
    properties: flat.properties,
    required: flat.required,
  };
  return schema;
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
 *   // ⚠️ 字段定义必须放在 `object.properties` 下（JSON-Schema 的顶层 `properties`
 *   //    也兼容，会被归一化，但推荐用下面的写法）
 *   schema: {
 *     type: 'object',
 *     object: {
 *       properties: {
 *         theme: { type: 'string', string: { enum: ['light', 'dark'] }, default: 'light' },
 *         debug: { type: 'boolean', default: false },
 *       },
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
  const { name, version, description, author, keywords, install } = config;
  const schema = normalizeConfigSchema(config.schema);

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

        // ★ 2026-10-24：`configReport` 此前**声明了却从未赋值**（装饰性字段）。
        //   现在记录最近一次安装的校验结果，便于测试与面板读取。
        plugin.configReport = {
          valid: report.success,
          errors: report.errors,
          errorCount: report.errors.length,
          warningCount: report.warnings.length,
        };

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
  /**
   * 测试用 App 的配置。
   *
   * ★ 2026-10-25：删掉了同批的 `performance?: boolean` —— 它**没有任何运行时消费点**
   *   （`AppOptions` 只有 `rendererMode`，全仓也没有"性能开关"这个能力），
   *   留着等于对使用者承诺一个不存在的能力。需要性能观测请在测试里直接装
   *   `@lytjs/devtools` 的 `initPerformanceMonitor()`。
   */
  appConfig?: {
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
    // ★ 2026-10-24：原实现 `await import('./index')` 在 `createApp()` 里**动态导入本包入口** ——
    //   入口会连带加载 compiler 等一大串模块，在整套测试并行跑时首次导入可能久到超时
    //   （实测：单跑 30ms，整包并行时 5s 超时）。这里直接静态引用实际需要的两个模块，
    //   依赖方向是 `plugin-sdk → create-app / h`，不存在循环。
    const app = createApp({
      render: () => h('div'),
    });

    // ★ 2026-10-24：`appConfig` 此前**完全被忽略**（选项声明了但没有任何消费点）。
    //   `globalProperties` 直接挂到 app.config 上；同批的 `performance` 已于 2026-10-25
    //   删除（无运行时消费者，见 `PluginTesterOptions.appConfig` 的注释）。
    const globalProperties = this.options.appConfig.globalProperties;
    if (globalProperties) {
      Object.assign(app.config.globalProperties, globalProperties);
    }

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
        // ★ 2026-10-24：**校验失败就不再安装**。此前只是回调报告一声、然后照装
        //   ⇒ `testPluginInstall()` 对非法配置返回 `success: true`（"测试通过"），
        //   与「配置验证」的意图完全相反。
        const detail = report.errors.map((e) => `${e.path}: ${e.message}`).join(', ');
        throw new Error(`Plugin "${plugin.name}" configuration validation failed: ${detail}`);
      }
    }

    // beforeInstall 钩子
    this.options.onBeforeInstall(this.app!);

    if (this.options.debug) {
      console.log(`[PluginTester] Installing plugin: ${plugin.name}`);
    }

    // 安装
    //
    // ★ 2026-10-24：`app.use()` 是**同步**的，它内部 `plugin.install(app, ...)` 的返回值
    //   （异步 install 会返回 Promise）被直接丢弃 ⇒ 异步插件「还没装完」就被当成已安装，
    //   异步失败更是变成 unhandledRejection，而 `testPluginInstall()` 报 `success: true`。
    //   这里用一个包装器把 install 的 Promise 接住，再 await 它。
    let pending: Promise<void> | undefined;
    const probed = {
      ...plugin,
      install: (app: App, ...args: unknown[]) => {
        const result = plugin.install?.(app, ...args);
        if (result && typeof (result as Promise<void>).then === 'function') {
          pending = result as Promise<void>;
        }
        return result;
      },
    } as EnhancedPlugin;

    this.app!.use(probed, options);
    if (pending) {
      await pending;
    }

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
