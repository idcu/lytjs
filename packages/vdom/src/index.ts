/**
 * @lytjs/vdom
 * Virtual DOM package for LytJS
 * Provides vnode creation, diffing algorithm, patch flags, and rendering
 */

// Re-export from common-vnode (types and constants)
export {
  Fragment,
  Text,
  Comment,
  ShapeFlags,
  PatchFlags,
  isVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
  isFragment,
  isTextVNode,
  isCommentVNode,
} from '@lytjs/common-vnode'

export type {
  VNode,
  VNodeTypes,
  VNodeChildren,
  VNodeSourceLocation,
  VNodeData,
  ComponentPublicInstance,
  ComponentInternalInstance,
  BaseComponentOptions,
} from '@lytjs/common-vnode'

// VNode creation and manipulation
export {
  createVNode,
  createTextVNode,
  createCommentVNode,
  cloneVNode,
  mergeProps,
  normalizeChildren,
  getShapeFlag,
  EMPTY_OBJ,
} from './vnode'

// Patch logic and renderer
export {
  createRenderer,
  createDOMRendererOptions,
} from './patch'

// Props storage (internal but exported for advanced usage)
export {
  setVNodeProps,
  getVNodeProps,
} from './props-map'

// Types
export type {
  Props,
  HostElement,
  HostNode,
  Component,
  RendererOptions,
  SuspenseBoundary,
  InternalComponentInstance,
} from './types'

// Diff utilities
export {
  isSameVNodeType as isSameVNodeTypeFromDiff,
  canUseFastDiff,
  countNewNodes,
  countRemovedNodes,
} from './diff'

// Fragment utilities
export {
  isFragmentVNode,
  getFragmentChildren,
  getFragmentChildCount,
  createFragment,
} from './fragment'

// Utility functions
export {
  isStaticVNode,
  isDynamicVNode,
  getVNodeText,
  hasDynamicChildren,
  collectDynamicChildren,
  hasArrayChildren,
  hasTextChildren,
  getArrayChildren,
} from './utils'
