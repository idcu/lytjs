/**
 * Lyt.js 渲染器 — 统一导出入口
 *
 * 将所有模块的公共 API 统一导出，使用者只需从此文件导入即可。
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
  PatchFlags as PatchPropFlags,
} from './dom/patch-props'

// ---- 事件系统 ----
export {
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  getEventInvokers,
  patchEvent,
  removeAllEventListeners,
} from './dom/patch-events'
export type { ParsedEvent, EventInvoker } from './dom/patch-events'

// ---- SSR 支持 ----
export { StringRenderer, ssrRenderer, renderToString, renderToStream, renderToStreamGenerator } from './ssr/ssr-renderer'
export type { SSRVNode, SSRTextVNode, ComponentOptions, RenderToStreamOptions } from './ssr/ssr-renderer'
export {
  hydrate,
  isHydrating,
  setHydrating,
  onHydrated,
  getHydrateStats,
  resetHydrateStats,
} from './ssr/hydration'
export type { HydrateOptions, HydrateResult } from './ssr/hydration'

// ---- Partial Hydration（Islands Architecture）----
export {
  hydrateIsland,
  hydrateAllIslands,
  createHydrationIsland,
  registerIslandComponent,
  unmountIsland,
  getIslandRegistry,
  clearIslandRegistry,
  getMismatchWarnings,
  clearMismatchWarnings,
} from './ssr/hydration'
export type { ComponentOptions as IslandComponentOptions } from './ssr/hydration'

// ---- 移动端支持 ----
export { NativeRenderer, nativeRenderer } from './native/native-renderer'
export type { NativeNode } from './native/native-renderer'

// ---- 小程序支持 ----
export { MiniAppRenderer, miniAppRenderer } from './miniapp/miniapp-renderer'
export type { MiniAppNode } from './miniapp/miniapp-renderer'

// ---- Vapor Mode ----
export {
  createVaporElement,
  renderVaporNode,
  vaporPatch,
  vaporMount,
  setVaporDOMFactory,
  getVaporDOMFactory,
} from './vapor/vapor-renderer'
export type {
  VaporNode,
  VaporBinding,
  VaporBindingType,
  VaporContainer,
  VaporComponentOptions,
  VaporApp,
  VaporElement,
  BindingCleanup,
} from './vapor/vapor-renderer'

export {
  bindText,
  bindProp,
  bindAttr,
  bindClass,
  bindEvent,
  bindIf,
  bindEach,
} from './vapor/vapor-reactive'

export {
  compileToVapor,
  parseTemplate,
} from './vapor/vapor-compiler'
export type { VaporRenderFunction, VaporCompileResult } from './vapor/vapor-compiler'

export {
  defineVaporComponent,
  createVaporApp,
  renderVaporComponent,
} from './vapor/vapor-component'
export type { VaporComponentInstance } from './vapor/vapor-component'
