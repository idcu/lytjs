/**
 * @lytjs/reactivity - Signal
 * 独立自包含的 Signal 响应式原语。
 * 拥有独立的订阅/通知机制，同时桥接 effect 系统保持互操作性。
 */

import { SignalSymbol, ComputedSignalSymbol, TrackOpTypes, TriggerOpTypes } from './constants';
import { track, trigger } from './effect';

// ============================================================
// Types
// ============================================================

/** 订阅者回调 */
export type Subscriber = () => void;

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
let trackDependency: ((signal: WritableSignal<unknown>, unsubscribe: () => void) => void) | null = null;

/** batch 嵌套深度 */
let batchDepth = 0;

/** batch 期间待通知的订阅者 */
const pendingNotifications = new Set<Subscriber>();

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
    notifySubscribers(subscribers);
    // effect 系统桥接触发
    trigger(store, TriggerOpTypes.SET, SIGNAL_KEY, newValue);
  };

  signalFn.update = (updater: (prev: T) => T): void => {
    if (disposed) return;
    const newValue = updater(value);
    if (Object.is(newValue, value)) return;
    value = newValue;
    store[SIGNAL_KEY] = newValue;
    notifySubscribers(subscribers);
    trigger(store, TriggerOpTypes.SET, SIGNAL_KEY, newValue);
  };

  signalFn.dispose = (): void => {
    disposed = true;
    subscribers.clear();
  };

  signalFn._subscribe = (subscriber: Subscriber): (() => void) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };

  return signalFn;
}

// ============================================================
// computed — 独立计算信号
// ============================================================

/**
 * 创建一个计算信号。
 * 惰性求值、自动依赖追踪与清理、循环依赖检测。
 */
export function computed<T>(fn: () => T): ComputedSignal<T> {
  let value: T;
  let dirty = true;
  let isComputing = false;
  const dependencies = new Map<WritableSignal<unknown>, () => void>();
  const subscribers = new Set<Subscriber>();
  let disposed = false;

  // 专门的失效回调：当依赖 signal 变更时调用
  const invalidate = (): void => {
    if (disposed) return;
    dirty = true;
    // 通知 computed 的订阅者
    for (const sub of subscribers) {
      sub();
    }
  };

  const computedFn = function computedFn(): T {
    if (disposed) return value;

    // 追踪：如果有活跃订阅者，注册自身
    if (activeSubscriber && !isUntracked) {
      subscribers.add(activeSubscriber);
    }

    if (dirty) {
      if (isComputing) {
        throw new Error('[lytjs/signal] Circular dependency detected in computed signal.');
      }
      isComputing = true;
      try {
        // 清理旧依赖（调用 unsubscribe 函数）
        for (const unsubscribe of dependencies.values()) {
          unsubscribe();
        }
        dependencies.clear();

        // 在活跃订阅者上下文中执行 fn，自动追踪新依赖
        const prevSubscriber = activeSubscriber;
        const prevTrackDependency = trackDependency;
        activeSubscriber = invalidate; // 注册 invalidate 作为依赖的订阅者
        trackDependency = (dep: WritableSignal<unknown>, unsubscribe: () => void) => {
          dependencies.set(dep, unsubscribe);
        };
        try {
          value = fn();
          dirty = false;
        } finally {
          activeSubscriber = prevSubscriber;
          trackDependency = prevTrackDependency;
        }
      } finally {
        isComputing = false;
      }
    }

    return value;
  } as ComputedSignal<T>;

  Object.defineProperty(computedFn, ComputedSignalSymbol, { value: true });

  computedFn.dispose = (): void => {
    disposed = true;
    for (const unsubscribe of dependencies.values()) {
      unsubscribe();
    }
    dependencies.clear();
    subscribers.clear();
  };

  computedFn.stop = (): void => {
    computedFn.dispose();
  };

  return computedFn;
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

// ============================================================
// 内部通知机制
// ============================================================

function notifySubscribers(subscribers: Set<Subscriber>): void {
  if (batchDepth > 0) {
    // batch 模式：延迟通知
    for (const sub of subscribers) {
      pendingNotifications.add(sub);
    }
    return;
  }
  // 立即通知
  for (const sub of subscribers) {
    sub();
  }
}

function flushPendingNotifications(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    const notifications = Array.from(pendingNotifications);
    pendingNotifications.clear();
    for (const sub of notifications) {
      sub();
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

/** 获取当前活跃订阅者（仅用于测试） */
export function _getActiveSubscriber(): Subscriber | null {
  return activeSubscriber;
}

/** 获取 batch 深度（仅用于测试） */
export function _getBatchDepth(): number {
  return batchDepth;
}

/** 获取待通知订阅者数量（仅用于测试） */
export function _getPendingNotificationsCount(): number {
  return pendingNotifications.size;
}

/** 重置全局状态（仅用于测试） */
export function _resetSignalGlobalState(): void {
  activeSubscriber = null;
  isUntracked = false;
  batchDepth = 0;
  pendingNotifications.clear();
  isNotifying = false;
}
