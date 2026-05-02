// src/index.ts
// @lytjs/component - Main entry point

// Core component APIs
/** 创建组件实例、设置组件、定义组件等核心 API */
export {
  createComponentInstance,
  setupComponent,
  finishComponentSetup,
  defineComponent,
  defineFunctionalComponent,
  createAppContext,
  provide,
  inject,
  createComponentPublicInstance,
} from './component';

// Props
/** Props 规范化与校验 */
export { normalizePropsOptions, resolvePropValue, validateType } from './props';

// Emit
/** 组件事件发射系统 */
export { emit, normalizeEmitsOptions, isEmitValid } from './emit';

// Slots
/** 插槽初始化与规范化 */
export { initSlots, normalizeSlotValue } from './slots';

// Lifecycle
/** 生命周期钩子注册与调用 */
export {
  setCurrentInstance,
  getCurrentInstance,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
  callLifecycleHook,
  callCreatedHook,
  callMountedHook,
  callUpdatedHook,
  callUnmountedHook,
  handleError,
} from './lifecycle';

// KeepAlive
/** KeepAlive 缓存组件 */
export {
  KeepAlive,
  createKeepAliveInstance,
  matchesPattern,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
} from './keep-alive';
export type { KeepAliveProps } from './keep-alive';

// Suspense
/** Suspense 异步边界组件 */
export {
  Suspense,
  createSuspenseInstance,
  createSuspenseBoundary,
  registerAsyncChild,
  isSuspensePending,
  getSuspenseError,
  resolveSuspense,
  abortSuspense,
} from './suspense';
export type { SuspenseProps, SuspenseAsyncState } from './suspense';

// Transition
/** Transition 过渡组件 */
export { Transition } from './transition';
export type { TransitionComponentProps } from './transition';

// TransitionGroup
/** TransitionGroup 列表过渡组件 */
export { TransitionGroup } from './transition-group';
export type { TransitionGroupComponentProps } from './transition-group';

// Teleport
/** Teleport 传送门组件 */
export { Teleport } from './teleport';
export type { TeleportProps } from './teleport';

// ErrorBoundary
/** 错误边界组件，捕获子组件渲染错误 */
export { ErrorBoundary } from './error-boundary';
export type { ErrorBoundaryProps } from './error-boundary';

// Signal State
/** Signal State 适配器，使 Signal 可以与组件协作 */
export { createSignalState, createComputedState } from './signal-state';
export type { SignalStateOptions } from './signal-state';

// Types
/** 组件相关类型定义 */
export type {
  ComponentOptions,
  ComponentInternalInstance,
  ComponentPublicInstance,
  ComponentIdentity,
  ComponentLifecycleState,
  ComponentRenderState,
  ComponentContextState,
  ComponentParentState,
  SetupContext,
  InternalSlots,
  AppContext,
  PropOptions,
  RenderFunction,
  SlotFunction,
} from './types';
