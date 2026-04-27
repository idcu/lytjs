/**
 * Lyt.js 核心入口 — 插件系统（Plugin）
 *
 * 提供插件安装机制和依赖注入（provide/inject）功能。
 *
 * 插件系统：
 * - app.use(plugin, options?) 安装插件
 * - app.unuse(plugin) 卸载插件
 * - app.isInstalled(plugin) 查询插件状态
 * - 插件签名：{ install: (app, options) => void } 或函数
 * - 支持异步插件（install 返回 Promise）
 * - 支持生命周期钩子 onBeforeInstall / onInstalled
 * - 支持插件元数据 name 属性
 *
 * 依赖注入：
 * - app.provide(key, value) 在祖先组件提供值
 * - app.inject(key, defaultValue?) 在后代组件注入值
 *
 * 纯原生零依赖实现。
 */

import { isPromise, isFunction, isPlainObject } from '@lytjs/common';

// ============================================================
// 类型定义
// ============================================================

/** 插件对象（带 install 方法） */
export interface PluginObject {
  /** 安装方法（支持同步和异步） */
  install: (app: AppAPI, ...options: any[]) => void | Promise<void>;
  /** 卸载方法（可选） */
  uninstall?: (app: AppAPI) => void | Promise<void>;
  /** 安装前回调（可选） */
  onBeforeInstall?: (app: AppAPI, ...options: any[]) => void | Promise<void>;
  /** 安装后回调（可选） */
  onInstalled?: (app: AppAPI, ...options: any[]) => void | Promise<void>;
  /** 插件名称（用于调试） */
  name?: string;
}

/** 插件类型：可以是对象或函数 */
export type Plugin = PluginObject | ((app: AppAPI, ...options: any[]) => void | Promise<void>);

/** 应用上下文接口（插件系统使用） */
export interface AppAPI {
  /** 安装插件（同步时返回 AppAPI，异步时返回 Promise<AppAPI>） */
  use(plugin: Plugin, ...options: any[]): AppAPI | Promise<AppAPI>;
  /** 卸载插件 */
  unuse(plugin: Plugin): AppAPI | Promise<AppAPI>;
  /** 查询插件是否已安装 */
  isInstalled(plugin: Plugin): boolean;
  /** 提供依赖 */
  provide<T = any>(key: string | symbol, value: T): void;
  /** 注入依赖 */
  inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined;
  /** 获取全局配置 */
  config: AppConfig;
  /** 全局属性（用于挂载全局方法/属性） */
  globalProperties: Record<string, any>;
}

/** 应用配置 */
export interface AppConfig {
  /** 自定义配置项 */
  [key: string]: any;
  /** 错误处理器 */
  errorHandler?: (err: any, instance: any, info: string) => void;
  /** 警告处理器 */
  warnHandler?: (msg: string, instance: any, trace: string) => void;
}

// ============================================================
// 依赖注入实现
// ============================================================

/**
 * 创建依赖注入容器
 *
 * 依赖注入使用分层结构：
 * - 每个应用实例有自己的 provides
 * - 子组件可以访问父组件提供的值
 * - 通过原型链实现层级查找
 *
 * @param parent - 父级 provides（可选）
 * @returns 注入容器
 */
export function createProvidesContext(
  parent?: Record<string | symbol, any>
): Record<string | symbol, any> {
  // 使用 Object.create 创建原型链
  // 子级找不到的 key 会自动到父级查找
  const context = Object.create(parent || null);
  return context;
}

/**
 * 判断插件是否为对象形式（带 install 方法）
 */
export function isPluginObject(plugin: Plugin): plugin is PluginObject {
  return (
    plugin !== null &&
    typeof plugin === 'object' &&
    typeof (plugin as PluginObject).install === 'function'
  );
}

/**
 * 判断插件是否为函数形式
 */
export function isPluginFunction(plugin: Plugin): plugin is (app: AppAPI, ...options: any[]) => void | Promise<void> {
  return typeof plugin === 'function';
}

/**
 * 获取插件名称（用于调试和日志）
 *
 * @param plugin - 插件对象或函数
 * @returns 插件名称或默认标识
 */
export function getPluginName(plugin: Plugin): string {
  if (isPluginObject(plugin) && plugin.name) {
    return plugin.name;
  }
  if (isPluginFunction(plugin) && plugin.name) {
    return plugin.name;
  }
  return isPluginObject(plugin) ? '[PluginObject]' : '[PluginFunction]';
}

// ============================================================
// 插件安装辅助
// ============================================================

/**
 * 安装插件到应用
 *
 * 支持两种插件形式：
 * 1. 对象形式：{ install: (app, options) => void }
 * 2. 函数形式：(app, options) => void
 *
 * 支持生命周期钩子：
 * - onBeforeInstall: 安装前调用
 * - onInstalled: 安装后调用
 *
 * 支持异步插件：install 返回 Promise 时，本函数也返回 Promise。
 *
 * @param app - 应用 API
 * @param plugin - 插件
 * @param options - 插件选项
 * @returns 同步插件返回 void，异步插件返回 Promise<void>
 */
export function installPlugin(
  app: AppAPI,
  plugin: Plugin,
  ...options: any[]
): void | Promise<void> {
  if (isPluginObject(plugin)) {
    // 对象形式：先执行 onBeforeInstall，再 install，最后 onInstalled
    const beforeResult = plugin.onBeforeInstall
      ? plugin.onBeforeInstall(app, ...options)
      : undefined;

    if (isPromise(beforeResult)) {
      // 异步 onBeforeInstall
      return beforeResult.then(() => {
        const installResult = plugin.install(app, ...options);
        if (isPromise(installResult)) {
          return installResult.then(() => {
            if (plugin.onInstalled) {
              return plugin.onInstalled(app, ...options);
            }
          });
        } else {
          if (plugin.onInstalled) {
            return plugin.onInstalled(app, ...options);
          }
        }
      });
    } else {
      // 同步 onBeforeInstall
      const installResult = plugin.install(app, ...options);
      if (isPromise(installResult)) {
        return installResult.then(() => {
          if (plugin.onInstalled) {
            return plugin.onInstalled(app, ...options);
          }
        });
      } else {
        if (plugin.onInstalled) {
          const afterResult = plugin.onInstalled(app, ...options);
          return afterResult;
        }
      }
    }
  } else if (isPluginFunction(plugin)) {
    // 函数形式：直接调用
    return plugin(app, ...options);
  } else {
    console.warn('[Lyt] 无效的插件：插件必须是带有 install 方法的对象或函数。');
  }
}

/**
 * 卸载插件
 *
 * 如果插件是对象形式且定义了 uninstall 方法，则调用它。
 * 函数形式插件无法卸载（给出警告）。
 *
 * @param app - 应用 API
 * @param plugin - 插件
 * @returns 同步卸载返回 void，异步卸载返回 Promise<void>
 */
export function uninstallPlugin(
  app: AppAPI,
  plugin: Plugin
): void | Promise<void> {
  if (isPluginObject(plugin)) {
    if (typeof plugin.uninstall === 'function') {
      return plugin.uninstall(app);
    } else {
      console.warn(
        `[Lyt] 插件 "${getPluginName(plugin)}" 未定义 uninstall 方法，无法完全卸载。`
      );
    }
  } else if (isPluginFunction(plugin)) {
    console.warn(
      `[Lyt] 函数形式插件 "${getPluginName(plugin)}" 不支持卸载。`
    );
  }
}


