/**
 * @lytjs/renderer
 * Rendering backend for the LytJS framework
 * Provides DOM, SSR, and Vapor rendering
 */

// Re-export from vdom
/** 创建渲染器 */
export { createRenderer } from '@lytjs/vdom';
export type { VNode, RendererOptions } from '@lytjs/vdom';

// Re-export first render optimization from reactivity
/** 首次渲染优化 */
export {
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from '@lytjs/reactivity';

// DOM renderer - re-export from @lytjs/adapter-web
/** 创建 DOM 渲染器 */
export { createDOMRenderer } from '@lytjs/adapter-web';
export type { DOMRenderer } from '@lytjs/adapter-web';

// DOM property patching - re-export from @lytjs/adapter-web
/** DOM 属性补丁操作 */
export {
  patchProp,
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr,
  normalizeEventName,
  getEventKey,
  parseEventModifier,
  createInvoker,
  removeAllEventListeners,
} from '@lytjs/adapter-web';
export type { ParsedEvent, EventInvoker } from '@lytjs/adapter-web';
/** 事件名检测 */
export { isOn } from '@lytjs/common-events';

// Hydration - re-export from @lytjs/adapter-web
/** 创建水合（hydration）函数 */
export { createHydrationFunctions } from '@lytjs/adapter-web';
export type { HydrationRenderer } from '@lytjs/adapter-web';

// Re-export from @lytjs/host-contract
/** 渲染器宿主抽象类型 */
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  TransitionDurationInfo,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

// Re-export from @lytjs/adapter-web
/** Web 渲染器宿主实现 */
export { WebRendererHost, createWebHost, wrapDOMEvent } from '@lytjs/adapter-web';

// SSR renderer
/** 将组件渲染为字符串（SSR） */
export { renderToString } from './ssr/ssr-renderer';
export type { SSRInput } from './ssr/ssr-renderer';

// SSR streaming
/** 将 VNode 树流式渲染为 ReadableStream（SSR Streaming） */
export { renderToStream } from './ssr/ssr-stream';
export type { SSRStreamOptions } from './ssr/ssr-stream';

// SSR island architecture
/** Island Architecture 相关函数 */
export { hydrateIsland, registerIslandComponent, createIslandSSRContent } from './ssr/ssr-island';
export type { ComponentOptions as IslandComponentOptions } from './ssr/ssr-island';

// Signal renderer
/** 创建 Signal 模式渲染器（细粒度 DOM 更新） */
export { createSignalRenderer } from './signal/signal-renderer';
export type { SignalRenderer } from './signal/signal-renderer';

// Vapor renderer (alias for Signal renderer)
/** 创建 Vapor 模式渲染器（Signal 渲染器的别名） */
export { createSignalRenderer as createVaporRenderer } from './signal/signal-renderer';
export type { SignalRenderer as VaporRenderer } from './signal/signal-renderer';

// Vapor app API
/** 定义 Vapor 模式组件 */
export { defineVaporComponent, createVaporApp } from './vapor/vapor-app';
export type {
  VaporComponentOptions,
  VaporComponentDefinition,
  VaporApp,
  VaporAppOptions,
  VaporContext,
  PropOptions as VaporPropOptions,
} from './vapor/vapor-app';

// Component resource cleanup
/** 组件资源自动清理：注册事件监听器、effect 订阅、cleanup 钩子，卸载时自动释放 */
export {
  registerComponentEventListener,
  registerComponentEffectSubscription,
  registerComponentCleanup,
  cleanupComponentResources,
} from './unmount';
export type { ResourceCleanupRenderer } from './unmount';

// Utilities
/** HTML 转义、布尔属性判断等工具函数 */
export { escapeHtml, isBooleanAttr, isVoidElement } from './utils';
