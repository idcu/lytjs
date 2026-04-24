/**
 * Lyt.js Signal 响应式系统
 *
 * 基于 Signal 的细粒度响应式实现（类似 Solid.js / Angular Signals / Preact Signals）。
 * 纯原生零依赖实现，无 DOM / 浏览器 API 依赖。
 *
 * 核心概念：
 *   - Signal: 可写信号，存储值并在变化时通知订阅者
 *   - ComputedSignal: 只读计算信号，自动追踪依赖并惰性求值
 *   - Effect: 副作用，自动追踪依赖并在变化时重新执行
 *   - Batch: 批量更新，延迟通知直到最外层 batch 完成
 *   - Untrack: 在不创建订阅的情况下读取信号
 */

// ================================================================
//  类型定义
// ================================================================

/** Signal 只读接口 — 调用即读取值 */
export interface Signal<T> {
  (): T
}

/** WritableSignal — 可写信号，支持 set / update */
export interface WritableSignal<T> extends Signal<T> {
  set(value: T): void
  update(fn: (prev: T) => T): void
}

/** ComputedSignal — 只读计算信号 */
export interface ComputedSignal<T> extends Signal<T> {
  // 无 set/update 方法
}

/** Effect 清理回调 */
export type EffectCleanup = () => void

/** 订阅者接口（effect 或 computed） */
interface Subscriber {
  /** 通知订阅者其依赖已变化 */
  notify(): void
  /** 标记订阅者需要重新计算/执行 */
  _dirty: boolean
}

/** 依赖源接口（signal 或 computed） */
interface Dependency {
  /** 添加订阅者 */
  _subscribe(subscriber: Subscriber): void
  /** 移除订阅者 */
  _unsubscribe(subscriber: Subscriber): void
}

// ================================================================
//  全局状态
// ================================================================

/** 当前正在执行的 effect/computed（用于自动追踪依赖） */
let activeSubscriber: Subscriber | null = null

/** 是否处于 untrack 模式 */
let isUntracked = false

/** batch 嵌套深度 */
let batchDepth = 0

/** 待执行的通知队列（batch 期间收集） */
const pendingNotifications: Set<Subscriber> = new Set()

/** 是否正在执行 batch flush */
let isFlushing = false

// ================================================================
//  Signal 实现
// ================================================================

/**
 * 创建一个可写信号
 *
 * @param initialValue 初始值
 * @returns WritableSignal 实例
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
  let value: T = initialValue
  const subscribers = new Set<Subscriber>()

  const sig = function SignalGetter(): T {
    // 如果有活跃的订阅者且不在 untrack 模式中，建立依赖
    if (activeSubscriber && !isUntracked) {
      subscribers.add(activeSubscriber)
    }
    return value
  } as WritableSignal<T>

  sig.set = function (newValue: T): void {
    // Object.is 比较，值未变化则不通知
    if (Object.is(value, newValue)) return
    value = newValue
    _notifySubscribers(subscribers)
  }

  sig.update = function (fn: (prev: T) => T): void {
    sig.set(fn(value))
  }

  // 实现 Dependency 接口
  ;(sig as any)._subscribe = function (subscriber: Subscriber): void {
    subscribers.add(subscriber)
  }

  ;(sig as any)._unsubscribe = function (subscriber: Subscriber): void {
    subscribers.delete(subscriber)
  }

  return sig
}

// ================================================================
//  Computed 实现
// ================================================================

/**
 * 创建一个计算信号（只读、惰性求值）
 *
 * @param fn 计算函数
 * @returns ComputedSignal 实例
 */
export function computed<T>(fn: () => T): ComputedSignal<T> {
  let cachedValue: T
  let isDirty = true
  let isComputing = false
  const dependencies = new Set<Dependency>()
  const subscribers = new Set<Subscriber>()

  const comp = function ComputedGetter(): T {
    // 如果有活跃的订阅者且不在 untrack 模式中，建立依赖
    if (activeSubscriber && !isUntracked) {
      subscribers.add(activeSubscriber)
    }

    if (isDirty) {
      // 检测循环依赖
      if (isComputing) {
        throw new Error('[lyt:signal] 检测到循环依赖: computed 在其自身的计算图中')
      }
      isComputing = true

      // 先清除旧的依赖
      for (const dep of dependencies) {
        dep._unsubscribe(comp as unknown as Subscriber)
      }
      dependencies.clear()

      // 设置为活跃订阅者以收集新依赖
      const prevSubscriber = activeSubscriber
      activeSubscriber = comp as unknown as Subscriber
      try {
        cachedValue = fn()
      } finally {
        activeSubscriber = prevSubscriber
        isComputing = false
      }
      isDirty = false
    }

    return cachedValue
  } as ComputedSignal<T>

  // 实现 Subscriber 接口
  const subscriberImpl: Subscriber = {
    _dirty: false,
    notify(): void {
      isDirty = true
      _notifySubscribers(subscribers)
    },
  }

  // 将 notify 和 _dirty 挂到 comp 上
  ;(comp as any).notify = subscriberImpl.notify.bind(subscriberImpl)
  ;(comp as any)._dirty = false

  // 实现 Dependency 接口
  ;(comp as any)._subscribe = function (subscriber: Subscriber): void {
    subscribers.add(subscriber)
  }

  ;(comp as any)._unsubscribe = function (subscriber: Subscriber): void {
    subscribers.delete(subscriber)
  }

  return comp
}

// ================================================================
//  Effect 实现
// ================================================================

/**
 * 创建副作用
 *
 * @param fn 副作用函数，接收 onCleanup 回调
 * @returns dispose 函数，调用后停止副作用
 */
export function effect(
  fn: (onCleanup: (cleanup: EffectCleanup) => void) => void
): () => void {
  let cleanupFn: EffectCleanup | null = null
  let isDisposed = false
  const dependencies = new Set<Dependency>()

  const run = (): void => {
    if (isDisposed) return

    // 执行清理
    if (cleanupFn) {
      cleanupFn()
      cleanupFn = null
    }

    // 清除旧依赖
    for (const dep of dependencies) {
      dep._unsubscribe(effectSubscriber)
    }
    dependencies.clear()

    // 设置为活跃订阅者以收集新依赖
    const prevSubscriber = activeSubscriber
    activeSubscriber = effectSubscriber
    try {
      fn((cleanup: EffectCleanup) => {
        cleanupFn = cleanup
      })
    } finally {
      activeSubscriber = prevSubscriber
    }
  }

  const effectSubscriber: Subscriber = {
    _dirty: false,
    notify(): void {
      if (batchDepth > 0) {
        pendingNotifications.add(effectSubscriber)
      } else {
        run()
      }
    },
  }

  // 首次执行
  run()

  // 返回 dispose 函数
  return (): void => {
    isDisposed = true
    if (cleanupFn) {
      cleanupFn()
      cleanupFn = null
    }
    // 清除依赖
    for (const dep of dependencies) {
      dep._unsubscribe(effectSubscriber)
    }
    dependencies.clear()
    // 从待执行队列中移除
    pendingNotifications.delete(effectSubscriber)
  }
}

// ================================================================
//  Batch 实现
// ================================================================

/**
 * 批量更新
 *
 * 在 batch 内的 signal 更新不会立即触发 effect，
 * 而是延迟到最外层 batch 完成后统一执行。
 *
 * @param fn 批量操作函数
 */
export function batch(fn: () => void): void {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      _flushPending()
    }
  }
}

/**
 * 刷新待执行的通知队列
 */
function _flushPending(): void {
  if (isFlushing) return
  isFlushing = true
  try {
    // 使用 snapshot 防止在 flush 过程中新增的通知导致无限循环
    const snapshot = new Set(pendingNotifications)
    pendingNotifications.clear()
    for (const subscriber of snapshot) {
      subscriber.notify()
    }
    // 如果 flush 过程中又产生了新的通知，继续 flush
    if (pendingNotifications.size > 0) {
      _flushPending()
    }
  } finally {
    isFlushing = false
  }
}

// ================================================================
//  Untrack 实现
// ================================================================

/**
 * 在不创建订阅的情况下执行函数
 *
 * @param fn 要执行的函数
 * @returns 函数返回值
 */
export function untrack<T>(fn: () => T): T {
  const prevUntracked = isUntracked
  isUntracked = true
  try {
    return fn()
  } finally {
    isUntracked = prevUntracked
  }
}

// ================================================================
//  内部工具函数
// ================================================================

/**
 * 通知所有订阅者
 *
 * 如果在 batch 中，将通知加入队列；
 * 否则立即通知。
 */
function _notifySubscribers(subscribers: Set<Subscriber>): void {
  if (batchDepth > 0) {
    for (const sub of subscribers) {
      pendingNotifications.add(sub)
    }
  } else {
    for (const sub of subscribers) {
      sub.notify()
    }
  }
}
