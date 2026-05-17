// src/types.ts
// 类型定义（公共 API 类型）

import type { ReactiveEffect } from './effect';
import type { Ref, ShallowRef, ComputedRef } from './ref';
import type {
  Signal,
  ComputedSignal,
  WritableSignal,
  WritableComputedSignal,
  ReadonlySignal,
  Subscriber,
} from './signal';

// ==================== ReactiveEffect 类型 ====================

export type ReactiveEffectRunner<T = unknown> = {
  (): T;
  effect: ReactiveEffect;
};

export type EffectScheduler = (...args: unknown[]) => unknown;

export interface ReactiveEffectOptions {
  lazy?: boolean;
  scheduler?: EffectScheduler;
  allowRecurse?: boolean;
  onStop?: () => void;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
}

/**
 * 调试事件
 * 注意：此版本使用具体的 ReactiveEffect 类引用（生产者视角），
 * 与 @lytjs/shared-types 中使用脱敏 ReactiveEffectRef 的版本不同。
 * 保持此定义以避免类型不兼容（type: string vs 'track' | 'trigger'）。
 */
export interface DebuggerEvent {
  effect: ReactiveEffect;
  target: object;
  type: 'track' | 'trigger';
  key?: string | symbol;
  newValue?: unknown;
  oldValue?: unknown;
}

// ==================== Watch 类型 ====================

export interface WatchOptions<Immediate = boolean> {
  immediate?: Immediate;
  deep?: boolean;
  flush?: 'pre' | 'post' | 'sync';
  once?: boolean;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  scheduler?: WatchScheduler;
  allowRecurse?: boolean;
}

export interface WatchEffectOptions {
  flush?: 'pre' | 'post' | 'sync';
  once?: boolean;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  scheduler?: WatchScheduler;
  allowRecurse?: boolean;
}

export type WatchSource<T = unknown> = Ref<T> | (() => T) | object;

export type WatchCallback<T = unknown, S = T> = (
  newValue: T,
  oldValue: S,
  onCleanup: OnCleanup,
) => void;

/**
 * immediate 模式下 oldValue 为 undefined，否则为 T | undefined。
 * 用于 watch 函数的回调类型推断。
 */
export type WatchCallbackWithImmediate<T, Immediate extends boolean> = WatchCallback<
  T,
  Immediate extends true ? undefined : T | undefined
>;

export type OnCleanup = (cleanupFn: () => void) => void;

export type WatchHandle = () => void;

export type WatchScheduler = (...args: unknown[]) => unknown;

// ==================== Computed 类型 ====================

export type ComputedGetter<T> = () => T;
export type ComputedSetter<T> = (newValue: T) => void;

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>;
  set: ComputedSetter<T>;
}

export type WritableComputedRef<T = unknown> = ComputedRef<T> & {
  value: T;
};

// ==================== 工具类型 ====================

export type UnwrapRef<T> =
  T extends ShallowRef<infer V> ? V : T extends Ref<infer V> ? UnwrapRef<V> : T;
export type UnwrapNestedRefs<T> =
  T extends Ref<infer V>
    ? UnwrapRef<V>
    : T extends object | ((...args: unknown[]) => unknown)
      ? { [K in keyof T]: UnwrapNestedRefs<T[K]> }
      : T;
export type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
export type ToRefs<T = unknown> = { [K in keyof T]: Ref<T[K]> };
export type ReactiveObject<T extends object = object> = {
  [K in keyof T]: T[K];
} & { __v_isReactive: true };

// Re-export
export type {
  Ref,
  ShallowRef,
  ComputedRef,
  Signal,
  ComputedSignal,
  WritableComputedSignal,
  WritableSignal,
  ReadonlySignal,
  Subscriber,
};
