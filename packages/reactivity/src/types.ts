// src/types.ts
// 类型定义（公共 API 类型）

import type { ReactiveEffect } from "./effect";
import type { Ref, ShallowRef, ComputedRef } from "./ref";
import type {
  Signal,
  ComputedSignal,
  WritableSignal,
  ReadonlySignal,
} from "./signal";

// ==================== ReactiveEffect 类型 ====================

export type ReactiveEffectRunner<T = any> = {
  (): T;
  effect: ReactiveEffect;
};

export type EffectScheduler = (...args: any[]) => any;

export interface ReactiveEffectOptions {
  lazy?: boolean;
  scheduler?: EffectScheduler;
  allowRecurse?: boolean;
  onStop?: () => void;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
}

export interface DebuggerEvent {
  effect: ReactiveEffect;
  target: object;
  type: string;
  key: unknown;
}

// ==================== Watch 类型 ====================

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate;
  deep?: boolean;
  flush?: "pre" | "post" | "sync";
  once?: boolean;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  scheduler?: WatchScheduler;
  allowRecurse?: boolean;
}

export interface WatchEffectOptions {
  flush?: "pre" | "post" | "sync";
  once?: boolean;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  scheduler?: WatchScheduler;
  allowRecurse?: boolean;
}

export type WatchSource<T = any> = Ref<T> | (() => T) | object;

export type WatchCallback<T = any, S = T> = (
  newValue: T,
  oldValue: S,
  onCleanup: OnCleanup,
) => void;

export type OnCleanup = (cleanupFn: () => void) => void;

export type WatchHandle = () => void;

export type WatchScheduler = (...args: any[]) => any;

// ==================== Computed 类型 ====================

export type ComputedGetter<T> = () => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

export type WritableComputedRef<T = any> = ComputedRef<T> & {
  value: T;
};

// ==================== 工具类型 ====================

export type UnwrapRef<T> = T extends Ref<infer V> ? UnwrapRef<V> : T;
export type UnwrapNestedRefs<T> =
  T extends Ref<infer V>
    ? UnwrapRef<V>
    : T extends object | Function
      ? { [K in keyof T]: UnwrapNestedRefs<T[K]> }
      : T;
export type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
export type ToRefs<T = any> = { [K in keyof T]: Ref<T[K]> };
export type ReactiveObject<T extends object = object> = { [K in keyof T]: T[K] } & { __v_isReactive: true };

// Re-export
export type {
  Ref,
  ShallowRef,
  ComputedRef,
  Signal,
  ComputedSignal,
  WritableSignal,
  ReadonlySignal,
};
