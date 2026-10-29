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
  Teleport,
  Suspense,
  isVNode,
  isSameVNodeType,
  hasPatchFlag,
  describePatchFlag,
  isFragment,
  isTextVNode,
  isCommentVNode,
} from '@lytjs/common-vnode';

// 重新导出 ShapeFlags 和 PatchFlags（enum 既是类型也是值）
export { ShapeFlags, PatchFlags } from '@lytjs/common-vnode';

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
  getVNodePoolStats,
  resetVNodePoolStats,
  releaseVNode,
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
  setBlockTracking,
  isBlockTrackingEnabled,
} from './block';

// 渲染期 helper —— **编译器产物的 import 契约**
// （toDisplayString / renderList / createElementVNode 等 9 个名字此前缺失，
//   见 render-helpers.ts 顶部说明与 scripts/check-runtime-contract.ts）
export {
  createElementVNode,
  createStaticVNode,
  renderList,
  toDisplayString,
  normalizeProps,
  guardReactiveProps,
  toHandlerKey,
  withCtx,
  createSlots,
} from './render-helpers';

export type { Block } from './block';

// 列表 diff
export { registerDOMOperations, patchKeyedChildren, patchUnkeyedChildren } from './list-diff';
export type { DOMOperations } from './list-diff';

// Suspense linker 注册（用于跨包边界链接）
export {
  registerSuspenseLinker,
  registerSuspensePendingChild,
  notifySuspenseChildResolved,
} from './patch-suspense';

// ============================================================
// ★ 2026-10-29：过渡机制（`<Transition>` 需要它）
// ============================================================
//
// ⚠️ 这些函数此前**没有从 barrel 导出**，因此 `@lytjs/component` 的 `<Transition>`
//   根本拿不到它们 —— 只能把插槽原样渲染出去（pass-through），动画完全不发生。
//   780 行的过渡实现（enter / leave / 等待结束 / FLIP）一直只被自己的单测调用。
export {
  performEnterTransition,
  performLeaveTransition,
  nextFrame,
  addTransitionClass,
  removeTransitionClass,
  hasCSSTransition,
  getTransitionInfo,
  getTransitionInfoDOM,
  waitForTransitionEndDOM,
  setTransitionPrefix,
} from './transition';
export type { TransitionProps } from './transition';
