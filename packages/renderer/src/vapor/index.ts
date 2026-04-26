/**
 * Lyt.js Vapor Mode — 独立入口
 *
 * 仅包含 Vapor Mode 相关的 API（无虚拟 DOM，直接操作真实 DOM）。
 * 使用者可通过 `import '@lytjs/renderer/vapor'` 仅加载 Vapor 渲染器。
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

// ---- Vapor Mode ----
export {
  createVaporElement,
  renderVaporNode,
  vaporPatch,
  vaporMount,
  setVaporDOMFactory,
  getVaporDOMFactory,
} from './vapor-renderer';
export type {
  VaporNode,
  VaporBinding,
  VaporBindingType,
  VaporContainer,
  VaporComponentOptions,
  VaporApp,
  VaporElement,
  BindingCleanup,
} from './vapor-renderer';

export {
  bindText,
  bindProp,
  bindAttr,
  bindClass,
  bindEvent,
  bindIf,
  bindEach,
} from './vapor-reactive';

export {
  compileToVapor,
  parseTemplate,
} from './vapor-compiler';
export type { VaporRenderFunction, VaporCompileResult } from './vapor-compiler';

export {
  defineVaporComponent,
  createVaporApp,
  renderVaporComponent,
} from './vapor-component';
export type { VaporComponentInstance } from './vapor-component';
