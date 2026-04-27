/**
 * Lyt.js Native 渲染器 — 独立入口
 *
 * 仅包含移动端原生渲染相关的 API。
 * 使用者可通过 `import '@lytjs/renderer/native'` 仅加载 Native 渲染器。
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

// ---- 移动端支持 ----
export { NativeRenderer, nativeRenderer } from './native-renderer';
export type { NativeNode } from './native-renderer';
