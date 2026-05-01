// src/signal.ts
// Signal 响应式原语
// 复用 @lytjs/common-is: hasChanged
// 复用 effect 系统实现依赖追踪

import { hasChanged } from "@lytjs/common-is";
import { ReactiveEffect, track, trigger } from "./effect";
import {
  SignalSymbol,
  ComputedSignalSymbol,
  TrackOpTypes,
  TriggerOpTypes,
} from "./constants";

// ==================== Signal 类型 ====================

export interface Signal<T = unknown> {
  (): T;
  (value: T): void;
  readonly [SignalSymbol]: true;
}

export interface ComputedSignal<T = unknown> {
  (): T;
  /** 停止计算信号的依赖追踪和更新 */
  stop?: () => void;
  readonly [ComputedSignalSymbol]: true;
}

export interface WritableSignal<T = unknown> extends Signal<T> {}

export interface ReadonlySignal<T = unknown> {
  (): T;
  readonly [SignalSymbol]: true;
}

// ==================== Signal 内部标记 ====================

const SIGNAL_KEY = Symbol("signal_value");

// ==================== Signal 实现 ====================

export function signal<T>(initialValue: T): WritableSignal<T> {
  // 使用普通对象存储值，利用 effect 系统追踪
  const store: { [key: symbol]: T } = { [SIGNAL_KEY]: initialValue };

  // signalFn 内部实现：重载调用签名，支持读取和写入
  const signalFn = function signalFn(valueOrNothing?: T): T | void {
    if (arguments.length > 0) {
      if (hasChanged(valueOrNothing, store[SIGNAL_KEY])) {
        // valueOrNothing 的类型由泛型 T 约束，运行时由 hasChanged 保证值比较正确。
        // 此处的 as T 断言是安全的：调用方通过 WritableSignal<T> 的函数签名保证类型一致性。
        store[SIGNAL_KEY] = valueOrNothing as T;
        trigger(store, TriggerOpTypes.SET, SIGNAL_KEY, valueOrNothing);
      }
      return;
    }
    track(store, TrackOpTypes.GET, SIGNAL_KEY);
    return store[SIGNAL_KEY] as T;
  } as WritableSignal<T> & ((valueOrNothing?: T) => T | void);

  Object.defineProperty(signalFn, SignalSymbol, { value: true });
  return signalFn;
}

export function computedSignal<T>(fn: () => T): ComputedSignal<T> {
  const store: { [key: symbol]: T | undefined } = { [SIGNAL_KEY]: undefined };
  let dirty = true;

  const runner = new ReactiveEffect(
    () => {
      try {
        store[SIGNAL_KEY] = fn();
        dirty = false;
      } catch (e) {
        dirty = true;
        throw e;
      }
    },
    // 调度器：标记为脏值并触发依赖更新，实现缓存失效
    () => {
      dirty = true;
      trigger(store, TriggerOpTypes.SET, SIGNAL_KEY);
    },
  );

  const computedFn = function computedFn(): T {
    track(store, TrackOpTypes.GET, SIGNAL_KEY);
    if (dirty) {
      runner.run();
    }
    return store[SIGNAL_KEY] as T;
  } as ComputedSignal<T>;

  Object.defineProperty(computedFn, ComputedSignalSymbol, { value: true });
  Object.defineProperty(computedFn, "stop", {
    value: () => runner.stop(),
    writable: false,
    enumerable: false,
    configurable: true,
  });
  return computedFn;
}

export function valueOf<T>(sig: Signal<T>): T {
  return sig();
}

export function set<T>(sig: WritableSignal<T>, newValue: T): void {
  sig(newValue);
}

export function update<T>(
  sig: WritableSignal<T>,
  updater: (prev: T) => T,
): void {
  sig(updater(sig()));
}

export function readonlySignal<T>(sig: Signal<T>): ReadonlySignal<T> {
  const readonlyFn = function readonlyFn(): T {
    return sig();
  } as ReadonlySignal<T>;
  Object.defineProperty(readonlyFn, SignalSymbol, { value: true });
  return readonlyFn;
}
