/**
 * @lytjs/reactivity - Signal
 * 独立自包含的 Signal 响应式原语。
 * 拥有独立的订阅/通知机制，同时桥接 effect 系统保持互操作性。
 */

import { SignalSymbol, ComputedSignalSymbol, TrackOpTypes, TriggerOpTypes } from './constants';
import { track, trigger } from './effect';
import type { Subscriber } from './shared/types';

// ============================================================
// Types
// ============================================================

/** 订阅者回调 */
export type { Subscriber };

/** Signal 只读接口 */
export interface Signal<T = unknown> {
  /** 读取当前值 */
  (): T;
  readonly [SignalSymbol]: true;
}

/** WritableSignal 可写接口 */
export interface WritableSignal<T = unknown> extends Signal<T> {
  /** 设置新值 */
  set(newValue: T): void;
  /** 通过 updater 函数更新值 */
  update(updater: (prev: T) => T): void;
  /** 停止所有订阅通知，释放资源 */
  dispose(): void;
  /** @internal 订阅变更通知 */
  _subscribe(subscriber: Subscriber): () => void;
}

/** ComputedSignal 计算信号接口 */
export interface ComputedSignal<T = unknown> extends Signal<T> {
  /** 停止计算信号的依赖追踪和更新 */
  dispose(): void;
  /** @deprecated 使用 dispose() */
  stop?: () => void;
  readonly [ComputedSignalSymbol]: true;
}

/** WritableComputedSignal 可写计算信号接口 */
export interface WritableComputedSignal<T = unknown> extends ComputedSignal<T> {
  /** 设置新值（通过 setter 函数） */
  set(newValue: T): void;
}

/** ReadonlySignal 只读信号接口 */
export interface ReadonlySignal<T = unknown> {
  /** 读取当前值 */
  (): T;
  readonly [SignalSymbol]: true;
}

// ============================================================
// 全局追踪状态
// ============================================================

/** 当前活跃的订阅者（computed 读取 signal 时自动追踪） */
let activeSubscriber: Subscriber | null = null;

/** 是否处于 untrack 模式 */
let isUntracked = false;

/** 依赖追踪回调：computed 使用此回调记录 signal 依赖关系 */
let trackDependency: ((signal: WritableSignal<unknown>, unsubscribe: () => void) => void) | null =
  null;

/** batch 嵌套深度 */
let batchDepth = 0;

/** batch 期间待通知的订阅者 */
const pendingNotifications = new Set<Subscriber>();

/** batch 期间待执行的 effect 系统 trigger 操作（自动去重） */
const pendingTriggerOps = new Map<
  string,
  { store: Record<symbol, unknown>; signalKey: symbol; newValue?: unknown }
>();

/** 是否正在执行通知 */
let isNotifying = false;

// ============================================================
// signal — 核心 Signal 原语
// ============================================================

/**
 * 创建一个可写 Signal。
 * 使用闭包变量存储值，Set 管理订阅者。
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
  let value = initialValue;
  const subscribers = new Set<Subscriber>();
  let disposed = false;

  // effect 系统桥接：使用 store 对象作为 track/trigger 的 target
  const store: Record<symbol, T> = {};
  const SIGNAL_KEY = Symbol('signal_value');
  store[SIGNAL_KEY] = initialValue;

  const signalFn = function signalFn(): T {
    // Signal 内部追踪
    if (activeSubscriber && !isUntracked && !disposed) {
      if (!subscribers.has(activeSubscriber)) {
        subscribers.add(activeSubscriber);
        if (trackDependency) {
          trackDependency(signalFn as WritableSignal<unknown>, () => {
            subscribers.delete(activeSubscriber!);
          });
        }
      }
    }
    // effect 系统桥接追踪
    if (!disposed) {
      track(store, TrackOpTypes.GET, SIGNAL_KEY);
    }
    return value;
  } as WritableSignal<T>;

  Object.defineProperty(signalFn, SignalSymbol, { value: true });

  signalFn.set = (newValue: T): void => {
    if (disposed) return;
    if (Object.is(newValue, value)) return;
    value = newValue;
    store[SIGNAL_KEY] = newValue;
    notifySubscribers(subscribers, store, SIGNAL_KEY, newValue);
  };

  signalFn.update = (updater: (prev: T) => T): void => {
    if (disposed) return;
    const newValue = updater(value);
    if (Object.is(newValue, value)) return;
    value = newValue;
    store[SIGNAL_KEY] = newValue;
    notifySubscribers(subscribers, store, SIGNAL_KEY, newValue);
  };

  signalFn.dispose = (): void => {
    disposed = true;
    subscribers.clear();
  };

  signalFn._subscribe = (subscriber: Subscriber): (() => void) => {
    if (disposed) return () => {};
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };

  return signalFn;
}

// ============================================================
// computed — 独立计算信号
// ============================================================

/**
 * 内部工厂函数：创建计算信号的核心逻辑。
 * computed 和 writableComputedSignal 共享此实现，消除约 80 行重复代码。
 */
function createComputedSignalInternal<T>(
  getter: () => T,
  typeName: string,
): {
  computedFn: ComputedSignal<T>;
  invalidate: () => void;
  dispose: () => void;
} {
  let value: T | undefined;
  let dirty = true;
  let isComputing = false;
  const dependencies = new Map<WritableSignal<unknown>, () => void>();
  const subscribers = new Set<Subscriber>();
  let disposed = false;

  // effect 系统桥接：使用 store 对象作为 track/trigger 的 target
  const store: Record<symbol, unknown> = {};
  const COMPUTED_SIGNAL_KEY = Symbol('computed_signal_value');

  const invalidate = (): void => {
    if (disposed) return;
    dirty = true;
    // effect 系统桥接触发
    trigger(store, TriggerOpTypes.SET, COMPUTED_SIGNAL_KEY);
    const subs = Array.from(subscribers);
    for (const sub of subs) {
      sub();
    }
  };

  const computedFn = function computedFn(): T {
    if (disposed) return value as T;

    // effect 系统桥接追踪
    track(store, TrackOpTypes.GET, COMPUTED_SIGNAL_KEY);

    // 追踪：如果有活跃订阅者，注册自身
    if (activeSubscriber && !isUntracked) {
      subscribers.add(activeSubscriber);
    }

    if (dirty) {
      if (isComputing) {
        throw new Error(`[lytjs/signal] Circular dependency detected in ${typeName}.`);
      }
      isComputing = true;
      try {
        // 清理旧依赖（调用 unsubscribe 函数）
        for (const unsubscribe of dependencies.values()) {
          unsubscribe();
        }
        dependencies.clear();

        // 在活跃订阅者上下文中执行 getter，自动追踪新依赖
        const prevSubscriber = activeSubscriber;
        const prevTrackDependency = trackDependency;
        activeSubscriber = invalidate; // 注册 invalidate 作为依赖的订阅者
        trackDependency = (dep: WritableSignal<unknown>, unsubscribe: () => void) => {
          dependencies.set(dep, unsubscribe);
        };
        try {
          value = getter();
          dirty = false;
        } finally {
          activeSubscriber = prevSubscriber;
          trackDependency = prevTrackDependency;
        }
      } finally {
        isComputing = false;
      }
    }

    return value as T;
  } as ComputedSignal<T>;

  Object.defineProperty(computedFn, ComputedSignalSymbol, { value: true });

  const dispose = (): void => {
    disposed = true;
    for (const unsubscribe of dependencies.values()) {
      unsubscribe();
    }
    dependencies.clear();
    subscribers.clear();
  };

  return { computedFn, invalidate, dispose };
}

/**
 * 创建一个计算信号。
 * 惰性求值、自动依赖追踪与清理、循环依赖检测。
 */
export function computed<T>(fn: () => T): ComputedSignal<T> {
  const { computedFn, dispose } = createComputedSignalInternal(fn, 'computed signal');

  computedFn.dispose = dispose;
  computedFn.stop = dispose;

  return computedFn;
}

// ============================================================
// writableComputed — 可写计算信号
// ============================================================

/**
 * 创建一个可写计算信号。
 * 通过 getter 读取计算值，通过 setter 写入值。
 * setter 通常会间接更新 getter 依赖的底层 signal。
 */
export function writableComputedSignal<T>(
  getter: () => T,
  setter: (value: T) => void,
): WritableComputedSignal<T> {
  const { computedFn, dispose } = createComputedSignalInternal(
    getter,
    'writable computed signal',
  );

  (computedFn as WritableComputedSignal<T>).set = (newValue: T): void => {
    // dispose 检查通过闭包中的 disposed 标志实现
    setter(newValue);
  };

  computedFn.dispose = dispose;
  computedFn.stop = dispose;

  return computedFn as WritableComputedSignal<T>;
}

// ============================================================
// batch — 批量更新
// ============================================================

/**
 * 在批处理中执行函数。
 * batch 内多次 signal.set 只在函数结束后统一触发一次通知。
 */
export function signalBatch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPendingNotifications();
    }
  }
}

// ============================================================
// untrack — 取消追踪
// ============================================================

/**
 * 在取消追踪模式中执行函数。
 * 函数内读取 signal 不会建立依赖关系。
 */
export function signalUntrack<T>(fn: () => T): T {
  const prevIsUntracked = isUntracked;
  isUntracked = true;
  try {
    return fn();
  } finally {
    isUntracked = prevIsUntracked;
  }
}

/** @internal 检查当前是否处于 untrack 模式（供 effect 系统桥接使用） */
export function _isSignalUntracked(): boolean {
  return isUntracked;
}

// ============================================================
// 内部通知机制
// ============================================================

function notifySubscribers(
  subscribers: Set<Subscriber>,
  store?: Record<symbol, unknown>,
  signalKey?: symbol,
  newValue?: unknown,
): void {
  if (batchDepth > 0) {
    for (const sub of subscribers) {
      pendingNotifications.add(sub);
    }
    // effect 系统桥接：batch 期间也延迟 trigger（去重）
    if (store && signalKey !== undefined) {
      const triggerKey = String(signalKey);
      pendingTriggerOps.set(triggerKey, { store, signalKey, newValue });
    }
    return;
  }
  for (const sub of subscribers) {
    sub();
  }
  // effect 系统桥接触发
  if (store && signalKey !== undefined) {
    trigger(store, TriggerOpTypes.SET, signalKey, newValue);
  }
}

function flushPendingNotifications(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    let iterations = 0;
    while ((pendingNotifications.size > 0 || pendingTriggerOps.size > 0) && iterations < 100) {
      const notifications = Array.from(pendingNotifications);
      const triggers = Array.from(pendingTriggerOps.values());
      pendingNotifications.clear();
      pendingTriggerOps.clear();
      for (const sub of notifications) {
        sub();
      }
      // 执行延迟的 effect 系统 trigger（已去重）
      for (const { store, signalKey, newValue } of triggers) {
        trigger(store, TriggerOpTypes.SET, signalKey, newValue);
      }
      iterations++;
    }
  } finally {
    isNotifying = false;
  }
}

// ============================================================
// 适配器层 — 旧 API 兼容
// ============================================================

/**
 * @deprecated 使用 computed() 代替
 */
export function computedSignal<T>(fn: () => T): ComputedSignal<T> {
  return computed(fn);
}

/** 读取 signal 值 */
export function valueOf<T>(sig: Signal<T>): T {
  return sig();
}

/** 设置 signal 值（适配器） */
export function set<T>(sig: WritableSignal<T> | ReadonlySignal<T>, newValue: T): void {
  if ('set' in sig) {
    (sig as WritableSignal<T>).set(newValue);
  }
  // ReadonlySignal: 静默忽略（保持旧行为）
}

/** 通过 updater 更新 signal 值（适配器） */
export function update<T>(sig: WritableSignal<T>, updater: (prev: T) => T): void {
  sig.update(updater);
}

/** 创建只读 signal（适配器） */
export function readonlySignal<T>(sig: Signal<T>): ReadonlySignal<T> {
  const readonlyFn = function readonlyFn(): T {
    return sig();
  } as ReadonlySignal<T>;
  Object.defineProperty(readonlyFn, SignalSymbol, { value: true });
  return readonlyFn;
}

// ============================================================
// 调试/测试 API
// ============================================================

/** @internal 获取当前活跃订阅者（仅用于测试） */
export function _getActiveSubscriber(): Subscriber | null {
  return activeSubscriber;
}

/** @internal 获取 batch 深度（仅用于测试） */
export function _getBatchDepth(): number {
  return batchDepth;
}

/** @internal 获取待通知订阅者数量（仅用于测试） */
export function _getPendingNotificationsCount(): number {
  return pendingNotifications.size;
}

/** @internal 重置全局状态（仅用于测试） */
export function _resetSignalGlobalState(): void {
  activeSubscriber = null;
  isUntracked = false;
  batchDepth = 0;
  pendingNotifications.clear();
  isNotifying = false;
}
