/**
 * Lyt.js MiniApp 渲染器 — 独立入口
 *
 * 仅包含小程序渲染相关的 API。
 * 使用者可通过 `import '@lytjs/renderer/miniapp'` 仅加载 MiniApp 渲染器。
 *
 * 模块概览：
 *   - MiniAppRenderer    — 核心渲染器，将 VNode 映射为小程序模板描述树
 *   - MiniAppCompiler    — 模板编译器，将 Lyt.js 模板编译为 WXML/AXML/TTML
 *   - MiniAppStyleCompiler — 样式编译器，将 CSS 转换为 WXSS
 *   - MiniAppEventBridge — 事件桥接层，处理事件名映射和参数解析
 *   - MiniAppLifecycleAdapter — 生命周期适配器，映射 Lyt.js 生命周期到小程序
 *   - MiniAppApiAdapter  — API 适配器，提供 Promise 化的存储/网络/路由 API
 *   - GlobalStateManager — 全局状态管理器，支持跨页面状态共享
 */

// ---- 核心接口与类型 ----
export type { LytRenderer, RendererInstance } from '../renderer-interfaces';
export type { VNode } from '../vnode';

// ---- 核心函数与常量 ----
export {
  createRenderer,
} from '../create-renderer';
export {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
} from '../vnode';

// ---- 小程序渲染器 ----
export { MiniAppRenderer, miniAppRenderer, createMiniAppRenderer } from './miniapp-renderer';
export type { MiniAppNode, MiniAppPlatform } from './miniapp-renderer';

// ---- 小程序模板编译器 ----
export { MiniAppCompiler } from './miniapp-compiler';
export type {
  MiniAppCompileResult,
  MiniAppPageConfig,
  MiniAppPageOutput,
  MiniAppComponentConfig,
  MiniAppComponentOutput,
} from './miniapp-compiler';

// ---- 小程序样式编译器 ----
export { MiniAppStyleCompiler, miniAppStyleCompiler, compileMiniAppStyle } from './style-compiler';
export type { StyleCompileOptions, StyleCompileResult } from './style-compiler';

// ---- 小程序事件桥接 ----
export { MiniAppEventBridge } from './miniapp-event-bridge';
export type {
  MiniAppNativeEvent,
  ParsedEventArgs,
  DataBinder,
  BridgeHandlerMap,
} from './miniapp-event-bridge';

// ---- 小程序生命周期适配器 ----
export { MiniAppLifecycleAdapter } from './miniapp-lifecycle';
export type {
  LifecycleMapping,
  PageLifecycleHooks,
  ComponentLifecycleHooks,
} from './miniapp-lifecycle';

// ---- 小程序 API 适配器 ----
export {
  MiniAppApiAdapter,
  createApiAdapter,
  getApiAdapter,
  GlobalStateManager,
  createGlobalState,
} from './api-adapter';
export type {
  MiniAppGlobal,
  RequestConfig,
  Response,
  NavigateOptions,
  StorageAdapter,
} from './api-adapter';

// ---- 小程序工具函数 ----
export {
  camelToKebab,
  kebabToCamel,
  parseStyleObject,
  parseClassObject,
  generatePageJson,
  generateComponentJson,
  normalizeProps,
  createWxsModule,
  escapeHtml,
  isNativeTag,
} from './miniapp-utils';
export type {
  PageJsonConfig,
  ComponentJsonConfig,
  NormalizedProps,
} from './miniapp-utils';
