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
export { createRenderer, createDOMRendererOptions } from './patch';

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

// Transition
export {
  nextFrame,
  addTransitionClass,
  removeTransitionClass,
  getTransitionInfo,
  hasCSSTransition,
  performEnterTransition,
  performLeaveTransition,
  cancelTransition,
  createTransitionState,
} from './transition';

export type {
  TransitionProps,
  TransitionDurationInfo,
  TransitionState,
} from './transition';

// TransitionGroup
export {
  recordPositions,
  applyFLIP,
  performGroupEnterTransition,
  performGroupLeaveTransition,
  createFLIPState,
  beforeUpdate as transitionGroupBeforeUpdate,
  afterUpdate as transitionGroupAfterUpdate,
} from './transition-group';

export type {
  TransitionGroupProps,
} from './transition-group';
