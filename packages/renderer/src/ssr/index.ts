/**
 * Lyt.js SSR 渲染器 — 独立入口
 *
 * 仅包含服务端渲染（SSR）相关的 API。
 * 使用者可通过 `import '@lytjs/renderer/ssr'` 仅加载 SSR 渲染器。
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

// ---- SSR 支持 ----
export { StringRenderer, ssrRenderer, renderToString, renderToStream, renderToStreamGenerator } from './ssr-renderer';
export type { SSRVNode, SSRTextVNode, ComponentOptions, RenderToStreamOptions } from './ssr-renderer';

// ---- Hydration ----
export {
  hydrate,
  isHydrating,
  setHydrating,
  onHydrated,
  getHydrateStats,
  resetHydrateStats,
  hydrateIsland,
  hydrateAllIslands,
  createHydrationIsland,
  registerIslandComponent,
  unmountIsland,
  getIslandRegistry,
  clearIslandRegistry,
  getMismatchWarnings,
  clearMismatchWarnings,
} from './hydration';
export type { HydrateOptions, HydrateResult, ComponentOptions as IslandComponentOptions } from './hydration';
