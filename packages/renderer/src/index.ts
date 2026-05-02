/**
 * @lytjs/renderer
 * Rendering backend for the LytJS framework
 * Provides DOM, SSR, and Vapor rendering
 */

// Re-export from vdom
/** 创建渲染器 */
export { createRenderer } from '@lytjs/vdom';
export type { VNode, RendererOptions } from '@lytjs/vdom';

// DOM renderer
/** 创建 DOM 渲染器 */
export { createDOMRenderer } from './dom/dom-renderer';
export type { DOMRenderer } from './dom/dom-renderer';

// DOM property patching
/** DOM 属性补丁操作 */
export { patchProp, patchClass, patchStyle, patchEvent, patchAttr } from './dom/patch-props';
/** 事件名检测 */
export { isOn } from '@lytjs/common-events';

// Hydration
/** 创建水合（hydration）函数 */
export { createHydrationFunctions } from './dom/hydration';
export type { HydrationRenderer } from './dom/hydration';

// SSR renderer
/** 将组件渲染为字符串（SSR） */
export { renderToString } from './ssr/ssr-renderer';
export type { SSRInput } from './ssr/ssr-renderer';

// Utilities
/** HTML 转义、布尔属性判断等工具函数 */
export { escapeHtml, isBooleanAttr, isVoidElement } from './utils';
