/**
 * @lytjs/renderer
 * Rendering backend for the LytJS framework
 * Provides DOM, SSR, and Vapor rendering
 */

// Re-export from vdom
export { createRenderer } from '@lytjs/vdom'
export type { VNode, RendererOptions } from '@lytjs/vdom'

// DOM renderer
export { createDOMRenderer } from './dom/dom-renderer'
export type { DOMRenderer } from './dom/dom-renderer'

// DOM property patching
export {
  patchProp,
  patchClass,
  patchStyle,
  patchEvent,
  patchAttr,
  isOn,
  isBooleanAttr as isDOMBooleanAttr,
} from './dom/patch-props'

// Hydration
export { createHydrationFunctions } from './dom/hydration'
export type { HydrationRenderer } from './dom/hydration'

// SSR renderer
export { renderToString } from './ssr/ssr-renderer'
export type { SSRInput } from './ssr/ssr-renderer'

// Utilities
export { escapeHtml, isBooleanAttr, isVoidElement } from './utils'
