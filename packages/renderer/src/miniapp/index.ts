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
