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
} from "./reactive";

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
} from "./ref";

export {
  // computed
  computed,
} from "./computed";

export {
  // watch
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
} from "./watch";

export {
  // effect
  effect,
  stop,
  pauseTracking,
  enableTracking,
  resetTracking,
  batch,
  onEffectCleanup,
} from "./effect";

export {
  // effectScope
  effectScope,
  getCurrentScope,
  onScopeDispose,
} from "./effect-scope";

export type { EffectScope, EffectScopeOptions } from "./effect-scope";

// 类型 re-export
export type {
  Ref,
  ShallowRef,
  ComputedRef,
  WritableComputedRef,
  ReactiveEffectRunner,
  Signal,
  ComputedSignal,
  WritableSignal,
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
} from "./types";

export {
  RefSymbol,
  ShallowRefSymbol,
  ComputedRefSymbol,
  ReactiveSymbol,
  ReadonlySymbol,
} from "./constants";
