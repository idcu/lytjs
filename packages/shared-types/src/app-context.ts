// @lytjs/shared-types - 基础 AppContext 类型定义
// 提取 @lytjs/component 和 @lytjs/core 的公共 AppContext 定义

/**
 * 基础 AppConfig 接口
 * 包含所有包共享的最小配置字段
 */
export interface BaseAppConfig {
  errorHandler?: (...args: unknown[]) => void;
  warnHandler?: (...args: unknown[]) => void;
  [key: string]: unknown;
}

/**
 * 基础 AppContext 接口
 * 包含所有包共享的最小上下文字段
 */
export interface BaseAppContext {
  config: BaseAppConfig;
  mixins?: unknown[];
  components?: Record<string, unknown>;
  directives?: Record<string, unknown>;
  provides?: Map<unknown, unknown>;
}
