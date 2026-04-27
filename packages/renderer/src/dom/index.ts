/**
 * Lyt.js DOM 渲染器 — 独立入口
 *
 * 仅包含浏览器 DOM 渲染相关的 API，适用于 Web 端按需引入。
 * 使用者可通过 `import '@lytjs/renderer/dom'` 仅加载 DOM 渲染器，
 * 避免引入 SSR / Native / MiniApp / Vapor 等平台代码。
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

// ---- DOM 渲染器 ----
export { DOMRenderer, domRenderer } from './dom-renderer';

// ---- DOM 操作辅助 ----
export {
  setDOMProp,
  removeDOMProp,
  patchDOMProps,
  isSVGElement,
  getSVGPropName,
} from './dom-ops';

// ---- 属性精确更新 ----
export {
  patchClass,
  patchStyle,
  patchEventOnElement,
  patchDOMProp,
  patchProp,
  patchAllProps,
  patchElementProps,
  PatchFlags as PatchPropFlags,
} from './patch-props';

// ---- 事件系统 ----
export {
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  getEventInvokers,
  patchEvent,
  removeAllEventListeners,
} from './patch-events';
export type { ParsedEvent, EventInvoker } from './patch-events';
