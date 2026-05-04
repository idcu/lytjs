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
} from '@lytjs/common-vnode';

export type {
  VNode,
  VNodeTypes,
  VNodeChildren,
  VNodeSourceLocation,
  VNodeData,
  ComponentPublicInstance,
  ComponentInternalInstance,
  BaseComponentOptions,
} from '@lytjs/common-vnode';

// Re-export from @lytjs/host-contract
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

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
} from './vnode';

// Patch logic and renderer
export { createRenderer } from './patch';

// Types
export type {
  Props,
  HostElement,
  HostNode,
  Component,
  RendererOptions,
  SuspenseBoundary,
  InternalComponentInstance,
} from './types';

// Diff utilities
export { canUseFastDiff, countNewNodes, countRemovedNodes } from './diff';

// Fragment utilities
export {
  isFragmentVNode,
  getFragmentChildren,
  getFragmentChildCount,
  createFragment,
} from './fragment';

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
} from './utils';

// Block Tree runtime
export {
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
  getCurrentBlock,
  getBlockStackDepth,
  resetBlockStack,
} from './block';

export type { Block } from './block';

// List diff
export {
  registerDOMOperations,
  patchKeyedChildren,
  patchUnkeyedChildren,
} from './list-diff';
export type { DOMOperations } from './list-diff';

// Suspense linker registration (for cross-package boundary linking)
export { registerSuspenseLinker } from './patch-suspense';
