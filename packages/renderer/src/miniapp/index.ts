/**
 * Lyt.js MiniApp 渲染器 — 独立入口
 *
 * 仅包含小程序渲染相关的 API。
 * 使用者可通过 `import '@lytjs/renderer/miniapp'` 仅加载 MiniApp 渲染器。
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

// ---- 小程序支持 ----
export { MiniAppRenderer, miniAppRenderer } from './miniapp-renderer';
export type { MiniAppNode } from './miniapp-renderer';

// ---- 小程序编译器 ----
export { MiniAppCompiler } from './miniapp-compiler';
export type {
  MiniAppCompileResult,
  MiniAppPageConfig,
  MiniAppPageOutput,
  MiniAppComponentConfig,
  MiniAppComponentOutput,
} from './miniapp-compiler';

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
