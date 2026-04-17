/**
 * Lyt.js 组件系统 — 统一导出入口
 *
 * 导出所有公共 API 和类型定义。
 * 纯原生实现，零外部依赖。
 */

// ============================================================
// 组件定义
// ============================================================

export {
  defineComponent,
  createComponentInstance,
  setupComponent,
  setupStatefulComponent,
  setupFunctionComponent,
  mountComponent,
  updateComponent,
  unmountComponent,
} from './define-component';

export type {
  ComponentOptions,
  ComponentDefine,
  ComponentPublicInstance,
  ComponentInternalInstance,
  RenderFunction,
  CreateElement,
  ComputedOptions,
  WatchOptions,
  FunctionalComponent,
  EmitFunction,
  ReactivityMode,
} from './define-component';

// ============================================================
// Props 系统
// ============================================================

export {
  normalizePropsOptions,
  validateProp,
  initProps,
  getPropDefaultValue,
} from './props';

export type {
  PropType,
  PropOptions,
  NormalizedPropsOptions,
  NormalizedProps,
} from './props';

// ============================================================
// 事件发射
// ============================================================

export {
  emit,
  normalizeEmits,
  camelizeToHyphen,
  hyphenToCamel,
} from './emit';

export type {
  EmitsOptions,
  NormalizedEmitsOptions,
  EmitInstance,
} from './emit';

// ============================================================
// 生命周期
// ============================================================

export {
  LifecycleHook,
  createLifecycleHook,
  callLifecycleHook,
  setCurrentInstance,
  onInit,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  currentInstance,
} from './lifecycle';

export type {
  LifecycleHookCallback,
  LifecycleInstance,
} from './lifecycle';

// ============================================================
// 插槽系统
// ============================================================

export {
  initSlots,
  normalizeSlotValue,
  renderSlot,
  hasSlot,
} from './slots';

export type {
  SlotValue,
  Slots,
  SlotChildren,
  SlotsInstance,
} from './slots';

// ============================================================
// 内置组件
// ============================================================

export {
  Transition,
  TransitionGroup,
  KeepAlive,
  Suspense,
  defineAsyncComponent,
} from './builtins';

export type {
  TransitionProps,
  TransitionGroupProps,
  KeepAliveProps,
  SuspenseProps,
  AsyncComponentOptions,
} from './builtins';

// ============================================================
// Composition API
// ============================================================

export {
  onMounted as compositionOnMounted,
  onUnmounted as compositionOnUnmounted,
  onUpdated as compositionOnUpdated,
  onBeforeMount as compositionOnBeforeMount,
  onBeforeUnmount as compositionOnBeforeUnmount,
  provide,
  inject,
  getCurrentInstance,
  runSetup,
} from './composition-api';

export type {
  SetupFunction,
} from './composition-api';

// ============================================================
// Signal State Adapter
// ============================================================

export {
  createSignalState,
  createSignalStateProxy,
  getSignalStateSnapshot,
  patchSignalState,
  disposeSignalState,
} from './signal-state';

export type {
  SignalState,
  SignalStateProxy,
} from './signal-state';
