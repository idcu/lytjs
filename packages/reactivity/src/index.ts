// src/index.ts
// @lytjs/reactivity 主入口 - re-export 所有公共 API

export {
  // reactive
  reactive,
  shallowReactive,
  readonly,
  shallowReadonly,
  isReactive,
  isReadonly,
  isProxy,
  toRaw,
  markRaw,
} from './reactive';

export {
  // ref
  ref,
  shallowRef,
  triggerRef,
  isRef,
  unref,
  toRefs,
  toRef,
  customRef,
} from './ref';

export {
  // computed
  computed,
  setSSRMode,
} from './computed';

// scope and async sub-path entries are available at:
//   @lytjs/reactivity/scope   - effectScope, getCurrentScope, onScopeDispose
//   @lytjs/reactivity/async   - asyncComputed, useAsyncState

export {
  // watch
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
} from './watch';

export {
  // effect
  effect,
  stop,
  pauseTracking,
  enableTracking,
  resetTracking,
  batch,
  batchAsync,
  untrack,
  onEffectCleanup,
  // 首次渲染优化
  withFirstRenderOptimization,
  shouldSkipTracking,
  getSkippedTrackingCount,
  resetSkippedTrackingCount,
} from './effect';

export {
  // signal
  signal,
  computed as signalComputed,
  computedSignal,
  readonlySignal,
  set,
  update,
  valueOf,
  // signal batch/untrack
  signalBatch,
  signalUntrack,
} from './signal';

export type {
  Ref,
  ShallowRef,
  ComputedRef,
  WritableComputedRef,
  ReactiveEffectRunner,
  /** 响应式信号类型，表示一个可读的响应式值 */
  Signal,
  /** 计算信号类型，表示一个只读的计算响应式值 */
  ComputedSignal,
  /** 可写信号类型，表示一个可读写的响应式值 */
  WritableSignal,
  /** 只读信号类型 */
  ReadonlySignal,
  /** 订阅者回调类型 */
  Subscriber,
  WatchOptions,
  WatchEffectOptions,
  WatchSource,
  WatchCallback,
  WatchHandle,
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
  ReactiveEffectOptions,
  DebuggerEvent,
  UnwrapRef,
  UnwrapNestedRefs,
  DeepReadonly,
  ToRefs,
  ReactiveObject,
} from './types';

export {
  RefSymbol,
  ShallowRefSymbol,
  ComputedRefSymbol,
  ReactiveSymbol,
  ReadonlySymbol,
} from './constants';
