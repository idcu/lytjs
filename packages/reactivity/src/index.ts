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

export {
  // async computed
  asyncComputed,
  useAsyncState,
} from './async-computed';

export type { AsyncComputedRef } from './async-computed';

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
  computedSignal,
  readonlySignal,
  set,
  update,
  valueOf,
} from './signal';

export {
  // effectScope
  effectScope,
  getCurrentScope,
  onScopeDispose,
} from './effect-scope';

export type { EffectScope, EffectScopeOptions } from './effect-scope';

// 类型 re-export
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
