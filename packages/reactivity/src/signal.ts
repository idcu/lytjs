// src/signal.ts
// Signal 响应式原语
// 复用 @lytjs/common-is: hasChanged
// 复用 effect 系统实现依赖追踪

import { hasChanged } from '@lytjs/common-is';
import { ReactiveEffect, track, trigger } from './effect';
import { SignalSymbol, ComputedSignalSymbol, TrackOpTypes, TriggerOpTypes } from './constants';

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

/**
 * SIGNAL_KEY 是 signal 内部存储值的私有键（Symbol 类型）。
 *
 * 架构设计说明：
 * Signal 的值不直接存储在 signalFn 函数对象上，而是通过一个中间 store 对象间接引用。
 * 这样做的原因是：
 * 1. 利用 effect 系统的 track/trigger 机制进行依赖追踪，需要传入一个可被 Proxy 拦截的目标对象。
 *    函数对象本身不适合作为 Proxy 目标（会影响函数调用行为），因此使用普通对象作为存储载体。
 * 2. Symbol 键确保值存储对外不可见，避免与函数对象自身的属性冲突。
 * 3. store 对象作为 track/trigger 的第一个参数，使 effect 系统能正确建立和触发依赖关系。
 */
const SIGNAL_KEY = Symbol('signal_value');

// 哨兵值：区分 signalFn 调用时"未传参"和"传入 undefined"
const NO_VALUE = Symbol('NO_VALUE');

// ==================== Signal 实现 ====================

export function signal<T>(initialValue: T): WritableSignal<T> {
  // 使用普通对象存储值，利用 effect 系统追踪
  const store: { [key: symbol]: T } = { [SIGNAL_KEY]: initialValue };

  // signalFn 内部实现：重载调用签名，支持读取和写入
  // 使用 NO_VALUE 哨兵值区分"未传参"（读取）和"传入 undefined"（写入）
  const signalFn = function signalFn(newValue?: T | typeof NO_VALUE): T | void {
    if (arguments.length > 0 && newValue !== NO_VALUE) {
      if (hasChanged(newValue as T, store[SIGNAL_KEY])) {
        // newValue 的类型由泛型 T 约束，运行时由 hasChanged 保证值比较正确。
        // 此处的 as T 断言是安全的：调用方通过 WritableSignal<T> 的函数签名保证类型一致性。
        store[SIGNAL_KEY] = newValue as T;
        trigger(store, TriggerOpTypes.SET, SIGNAL_KEY, newValue as T);
      }
      return;
    }
    track(store, TrackOpTypes.GET, SIGNAL_KEY);
    return store[SIGNAL_KEY] as T;
  } as WritableSignal<T> & ((newValue?: T | typeof NO_VALUE) => T | void);

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
    // 如果 getter 首次执行抛出异常，store[SIGNAL_KEY] 仍为 undefined，
    // 此时 runner.run() 已将异常重新抛出，不会到达此处。
    // 额外检查：如果 store 中无有效值且 runner 未成功执行过，重新抛出。
    if (store[SIGNAL_KEY] === undefined && dirty) {
      throw new Error('computedSignal getter threw on initial evaluation.');
    }
    return store[SIGNAL_KEY] as T;
  } as ComputedSignal<T>;

  Object.defineProperty(computedFn, ComputedSignalSymbol, { value: true });
  Object.defineProperty(computedFn, 'stop', {
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

export function update<T>(sig: WritableSignal<T>, updater: (prev: T) => T): void {
  sig(updater(sig()));
}

export function readonlySignal<T>(sig: Signal<T>): ReadonlySignal<T> {
  const readonlyFn = function readonlyFn(): T {
    return sig();
  } as ReadonlySignal<T>;
  Object.defineProperty(readonlyFn, SignalSymbol, { value: true });
  return readonlyFn;
}
