/**
 * Lyt.js 响应式系统 — 统一导出入口
 *
 * 导出所有公共 API，供外部使用。
 * 纯原生零依赖实现。
 */

// ======================== 副作用系统 ========================
export {
  effect,
  stop,
  ReactiveEffect,
  track,
  trigger,
  ITERATE_KEY,
  activeEffect,
  pauseTracking,
  resetTracking,
} from './effect';

export type {
  EffectFn,
  ReactiveEffectOptions,
  TriggerOpTypes,
} from './effect';

// ======================== 响应式代理 ========================
export {
  reactive,
  readonly,
  shallowReactive,
  toRaw,
  isReactive,
  isReadonly,
  markReadOnly,
  markSkip,
  reactiveFlag,
  readonlyFlag,
  rawSymbol,
} from './reactive';

export type { ReactiveOptions } from './reactive';

// ======================== Ref ========================
export {
  ref,
  shallowRef,
  isRef,
  unref,
  toRef,
  toRefs,
  triggerRef,
  refSymbol,
  shallowRefSymbol,
} from './ref';

export type { Ref, UnwrapRef } from './ref';

// ======================== 计算属性 ========================
export { computed } from './computed';

export type {
  ComputedRef,
  WritableComputedRef,
  ComputedGetter,
  ComputedSetter,
  WritableComputedOptions,
} from './computed';

// ======================== 侦听器 ========================
export { watch, watchEffect, nextTick } from './watch';

export type {
  WatchCallback,
  WatchSource,
  WatchOptions,
  WatchEffectOptions,
  WatchStopHandle,
} from './watch';

// ======================== 调度器 ========================
export {
  queueJob,
  queuePostFlushCb,
  hasPendingJob,
  clearQueue,
} from './scheduler';

export type { SchedulerJob } from './scheduler';

// ======================== Signal 响应式系统 ========================
export {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  untrack,
} from './signal';

export type {
  Signal,
  WritableSignal,
  ComputedSignal,
  EffectCleanup,
} from './signal';

// ======================== Signal 组件集成 ========================
export {
  useSignal,
  useSignalState,
  enterSignalComponentContext,
  onSignalCleanup,
} from './signal-component';
