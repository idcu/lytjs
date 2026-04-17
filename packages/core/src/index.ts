/**
 * Lyt.js 核心入口 — 统一导出入口
 *
 * 导出所有公共 API 和类型定义。
 * 纯原生零依赖实现。
 */

// ============================================================
// 应用创建
// ============================================================

export { createApp } from './create-app';

export type {
  App,
  ComponentOptions,
  DirectiveHooks,
  DirectiveBinding,
} from './create-app';

// ============================================================
// 渲染函数
// ============================================================

export { h, Fragment } from './h';

export type {
  VNode,
  Children,
  Props,
} from './h';

export { ShapeFlags } from './h';

// ============================================================
// 插件系统
// ============================================================

export {
  createProvidesContext,
  installPlugin,
  uninstallPlugin,
  isPluginObject,
  isPluginFunction,
  getPluginName,
} from './plugin';

export type {
  Plugin,
  PluginObject,
  AppAPI,
  AppConfig,
} from './plugin';

// ============================================================
// 错误处理（原有）
// ============================================================

export {
  LytError,
  LytErrorCodes,
  ErrorBoundary,
  handleError,
  callWithErrorHandling,
  warn,
  warnOnce,
  setDevMode,
  createMessage,
} from './error-handling';

export type {
  ErrorBoundaryOptions,
} from './error-handling';

// ============================================================
// 错误码系统（新增）
// ============================================================

export {
  LytErrorCodes as NewLytErrorCodes,
  ErrorCategory,
  getErrorMessage,
  getCategory,
} from './error-codes';

export type {
  ErrorCategoryType,
} from './error-codes';

// ============================================================
// LytError 类和工厂函数（新增）
// ============================================================

export {
  LytError as NewLytError,
  createCompilerError,
  createRendererError,
  createComponentError,
} from './lyt-error';

export type {
  SourceLocation,
} from './lyt-error';

// ============================================================
// 警告工具（新增）
// ============================================================

export {
  warn as warnUtil,
  warnOnce as warnOnceUtil,
  error,
  getDevMode,
  resetWarnedMessages,
} from './warn';

// ============================================================
// 开发模式错误增强（新增）
// ============================================================

export {
  formatError,
  getComponentStack,
  createErrorOverlay,
} from './dev-error';

// ============================================================
// Web Component 适配器
// ============================================================

export {
  defineCustomElement,
  registerComponents,
  unregisterElement,
  isBrowser,
  defineCustomElementFromSFC,
} from './web-component';

export type {
  CustomElementOptions,
  ComponentRegistration,
} from './web-component';
