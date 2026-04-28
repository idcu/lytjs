/**
 * Lyt.js 虚拟 DOM 引擎 — 统一导出入口
 *
 * 将所有模块的公共 API 统一导出，使用者只需从此文件导入即可。
 *
 * 使用示例：
 * ```ts
 * import {
 *   createVNode,
 *   createTextVNode,
 *   patch,
 *   registerPatchDOMOperations,
 *   ShapeFlags,
 *   PatchFlags,
 *   Fragment,
 *   openBlock,
 *   closeBlock,
 *   createBlock,
 * } from './src'
 * ```
 */

// ---- PatchFlag 位标记 ----
export { PatchFlags, hasPatchFlag } from './patch-flag'

// ---- VNode 系统 ----
export {
  ShapeFlags,
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  isSameVNodeType,
  normalizeChildren,
} from './vnode'
export type {
  VNode,
  ComponentInstance,
  AppContext,
  RefFn,
} from './vnode'

// ---- Fragment 多根节点 ----
export { Fragment, isFragment, isFragmentType } from './fragment'
export type { FragmentType } from './fragment'

// ---- Block Tree ----
export {
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
} from './block'
export type { Block } from './block'

// ---- 列表 Diff ----
export {
  patchKeyedChildren,
  patchUnkeyedChildren,
  registerDOMOperations,
} from './list-diff'
export type { DOMOperations } from './list-diff'
// 重新导出自 @lytjs/common，保持向后兼容性
export { getSequence } from '@lytjs/common'

// ---- Patch 主流程 ----
export {
  patch,
  patchElement,
  processFragment,
  registerPatchDOMOperations,
} from './patch'
export type { PatchDOMOperations } from './patch'
