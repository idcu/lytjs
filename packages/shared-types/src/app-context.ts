// @lytjs/shared-types - 基础 AppContext 类型定义
// 提取 @lytjs/component 和 @lytjs/core 的公共 AppContext 定义

/**
 * 基础 AppConfig 接口
 * 包含所有包共享的最小配置字段
 */
export interface BaseAppConfig {
  /** 全局错误处理器 */
  errorHandler?: (err: Error, instance: unknown, info: string) => void;
  /** 全局警告处理器 */
  warnHandler?: (msg: string, instance: unknown, trace: string) => void;
  /** 性能追踪处理器 */
  performanceTracer?: (startTag: string, endTag: string) => void;
  /** 是否为开发模式 */
  isNativeTag?: (tag: string) => boolean;
  /** 自定义配置字段 */
  [key: string]: unknown;
}

/**
 * 基础 AppContext 接口
 * 包含所有包共享的最小上下文字段
 * @template Config - 配置类型
 */
export interface BaseAppContext<Config = BaseAppConfig> {
  /** 应用配置 */
  config: Config;
  /** 全局 mixins */
  mixins?: unknown[];
  /** 全局注册的组件 */
  components?: Record<string, unknown>;
  /** 全局注册的指令 */
  directives?: Record<string, unknown>;
  /** provide/inject 提供的值 */
  provides?: Record<string | symbol, unknown>;
  /** 应用版本 */
  version?: string;
}

/**
 * 应用插件接口
 */
export interface Plugin<T = Record<string, unknown>, App = unknown> {
  /** 插件安装函数 */
  install: (app: App, options?: T) => void;
  /** 插件名称 */
  name?: string;
}
