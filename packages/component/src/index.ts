// src/index.ts
// @lytjs/component - Main entry point

// Core component APIs
/** 创建组件实例、设置组件、定义组件等核心 API */
export {
  createComponentInstance,
  setupComponent,
  finishComponentSetup,
  defineComponent,
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
