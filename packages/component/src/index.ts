// src/index.ts
// @lytjs/component - Main entry point

// Core component APIs
export {
  createComponentInstance,
  setupComponent,
  finishComponentSetup,
  defineComponent,
  createAppContext,
  provide,
  inject,
  createComponentPublicInstance,
} from "./component";

// Props
export { normalizePropsOptions, resolvePropValue, validateType } from "./props";

// Emit
export { emit, normalizeEmitsOptions, isEmitValid } from "./emit";

// Slots
export { initSlots, normalizeSlotValue } from "./slots";

// Lifecycle
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
  callLifecycleHook,
  callCreatedHook,
  callMountedHook,
  callUpdatedHook,
  callUnmountedHook,
  handleError,
} from "./lifecycle";

// KeepAlive
export {
  KeepAlive,
  createKeepAliveInstance,
  matchesPattern,
  cacheInstance,
  getCachedInstance,
  removeCachedInstance,
  activateInstance,
  deactivateInstance,
} from "./keep-alive";
export type { KeepAliveProps } from "./keep-alive";

// Suspense
export {
  Suspense,
  createSuspenseInstance,
  createSuspenseBoundary,
  registerAsyncChild,
  isSuspensePending,
  getSuspenseError,
  resolveSuspense,
  abortSuspense,
} from "./suspense";
export type { SuspenseProps, SuspenseAsyncState } from "./suspense";

// Types
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
} from "./types";
