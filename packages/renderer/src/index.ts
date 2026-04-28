/**
 * Lyt.js 渲染器 — 统一导出入口（仅 DOM）
 *
 * 主入口仅导出浏览器 DOM 渲染相关的 API，适用于大多数 Web 端场景。
 * 其他平台（SSR/Native/MiniApp/Vapor）通过子路径独立引入：
 *   - `@lytjs/renderer/ssr`    — 服务端渲染
 *   - `@lytjs/renderer/native` — 移动端原生渲染
 *   - `@lytjs/renderer/miniapp`— 小程序渲染
 *   - `@lytjs/renderer/vapor`  — Vapor Mode（无虚拟 DOM）
 *   - `@lytjs/renderer/dom`    — DOM 渲染器完整 API（子路径）
 *
 * 使用示例：
 * ```ts
 * import {
 *   LytRenderer,
 *   createRenderer,
 *   DOMRenderer,
 *   domRenderer,
 * } from '@lytjs/renderer'
 *
 * // 使用默认 DOM 渲染器创建渲染器实例
 * const renderer = createRenderer(domRenderer)
 *
 * // 或者自定义渲染器
 * const customRenderer = createRenderer(new DOMRenderer())
 * ```
 */

// ---- 核心接口与类型 ----
export type { LytRenderer, RendererInstance } from './renderer-interfaces'
export type { VNode } from './vnode'

// ---- 核心函数与常量 ----
export {
  createRenderer,
} from './create-renderer'
export {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
} from './vnode'

// ---- DOM 渲染器 ----
export { DOMRenderer, domRenderer } from './dom/dom-renderer'

// ---- DOM 操作辅助 ----
export {
  setDOMProp,
  removeDOMProp,
  patchDOMProps,
  isSVGElement,
  getSVGPropName,
} from './dom/dom-ops'

// ---- 属性精确更新 ----
export {
  patchClass,
  patchStyle,
  patchEventOnElement,
  patchDOMProp,
  patchProp,
  patchAllProps,
  patchElementProps,
} from './dom/patch-props'

// ---- 事件系统 ----
export {
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  patchEvent,
  removeAllEventListeners,
} from './dom/patch-events'
export type { ParsedEvent, EventInvoker } from './dom/patch-events'
