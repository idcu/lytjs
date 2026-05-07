/**
 * @lytjs/vdom
 * Virtual DOM package for LytJS
 * 提供 VNode 创建、diff 算法、patch flags 和渲染功能
 */

// 从 common-vnode 重新导出（类型和常量）
export {
  Fragment,
  Text,
  Comment,
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
  // FIX: DTS build error - const enums must be exported as types
  ShapeFlags,
  PatchFlags,
} from '@lytjs/common-vnode';

// 从 @lytjs/host-contract 重新导出
export type {
  RendererHost,
  HostRect,
  HostStyleDeclaration,
  HostEvent,
  HostEventHandler,
  HostEventOptions,
} from '@lytjs/host-contract';

// VNode 创建和操作
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

// Patch 逻辑和渲染器
export { createRenderer } from './patch';

// 类型定义
export type {
  Props,
  HostElement,
  HostNode,
  Component,
  RendererOptions,
  SuspenseBoundary,
  InternalComponentInstance,
} from './types';

// Diff 工具函数
export { canUseFastDiff, countNewNodes, countRemovedNodes } from './diff';

// Fragment 工具函数
export {
  isFragmentVNode,
  getFragmentChildren,
  getFragmentChildCount,
  createFragment,
} from './fragment';

// 工具函数
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

// Block Tree 运行时
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

// 列表 diff
export {
  registerDOMOperations,
  patchKeyedChildren,
  patchUnkeyedChildren,
} from './list-diff';
export type { DOMOperations } from './list-diff';

// Suspense linker 注册（用于跨包边界链接）
export { registerSuspenseLinker } from './patch-suspense';
