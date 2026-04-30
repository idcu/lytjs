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

export interface Signal<T = any> {
  (): T;
  (value: T): void;
  readonly [SignalSymbol]: true;
}

export interface ComputedSignal<T = any> {
  (): T;
  readonly [ComputedSignalSymbol]: true;
}

export interface WritableSignal<T = any> extends Signal<T> {}

export interface ReadonlySignal<T = any> {
  (): T;
  readonly [SignalSymbol]: true;
}

// ==================== Signal 内部标记 ====================

const SIGNAL_KEY = Symbol("signal_value");

// ==================== Signal 实现 ====================

export function signal<T>(initialValue: T): WritableSignal<T> {
  // 使用普通对象存储值，利用 effect 系统追踪
  const store = { [SIGNAL_KEY]: initialValue };

  const signalFn: any = function signalFn(valueOrNothing?: T): T | void {
    if (arguments.length > 0) {
      if (hasChanged(valueOrNothing, store[SIGNAL_KEY])) {
        store[SIGNAL_KEY] = valueOrNothing as T;
        trigger(store, TriggerOpTypes.SET, SIGNAL_KEY, valueOrNothing);
      }
      return;
    }
    track(store, TrackOpTypes.GET, SIGNAL_KEY);
    return store[SIGNAL_KEY];
  };

  Object.defineProperty(signalFn, SignalSymbol, { value: true });
  return signalFn as WritableSignal<T>;
}

export function computedSignal<T>(fn: () => T): ComputedSignal<T> {
  const store = { [SIGNAL_KEY]: undefined as any };
  let dirty = true;

  const runner = new ReactiveEffect(
    () => {
      try {
        store[SIGNAL_KEY] = fn() as T;
        dirty = false;
        trigger(store, TriggerOpTypes.SET, SIGNAL_KEY);
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

  const computedFn: any = function computedFn(): T {
    track(store, TrackOpTypes.GET, SIGNAL_KEY);
    if (dirty) {
      runner.run();
    }
    return store[SIGNAL_KEY];
  };

  Object.defineProperty(computedFn, ComputedSignalSymbol, { value: true });
  return computedFn as ComputedSignal<T>;
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
  const readonlyFn: any = function readonlyFn(): T {
    return sig();
  };
  Object.defineProperty(readonlyFn, SignalSymbol, { value: true });
  return readonlyFn as ReadonlySignal<T>;
}
