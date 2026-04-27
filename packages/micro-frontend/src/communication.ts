/**
 * @lytjs/micro-frontend — 通信机制
 *
 * 提供子应用之间的通信能力：
 * - EventBus: 事件总线（发布/订阅模式）
 * - SharedState: 共享状态（响应式状态共享）
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/**
 * 事件监听器类型
 */
export type EventCallback = (...args: any[]) => void

/**
 * 状态变化监听器类型
 */
export type StateChangeCallback<T = any> = (newValue: T, oldValue: T) => void

/**
 * EventBus 事件总线
 *
 * 提供发布/订阅模式的事件通信，支持通配符匹配。
 *
 * @example
 * ```ts
 * const bus = new EventBus()
 *
 * // 订阅事件
 * const unsubscribe = bus.on('user:login', (data) => {
 *   console.log('User logged in:', data)
 * })
 *
 * // 发布事件
 * bus.emit('user:login', { id: 1, name: 'Alice' })
 *
 * // 取消订阅
 * unsubscribe()
 *
 * // 通配符订阅
 * bus.on('user:*', (data, eventName) => {
 *   console.log(`User event: ${eventName}`, data)
 * })
 * ```
 */
export class EventBus {
  /** 事件监听器映射 */
  private _listeners: Map<string, Set<EventCallback>> = new Map()
  /** 通配符监听器 */
  private _wildcardListeners: Set<EventCallback> = new Set()
  /** 是否已销毁 */
  private _destroyed = false
  /** 最大监听器数量（防止内存泄漏） */
  private _maxListeners: number

  constructor(maxListeners: number = 100) {
    this._maxListeners = maxListeners
  }

  /**
   * 订阅事件
   *
   * @param event - 事件名（支持通配符 *）
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  on(event: string, callback: EventCallback): () => void {
    if (this._destroyed) {
      console.warn('[EventBus] Cannot subscribe to event on destroyed EventBus.')
      return () => {}
    }

    // 检查监听器数量限制
    const listeners = this._listeners.get(event)
    if (listeners && listeners.size >= this._maxListeners) {
      console.warn(
        `[EventBus] Max listeners (${this._maxListeners}) reached for event "${event}".`
      )
    }

    // 添加监听器
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(callback)

    // 返回取消订阅函数
    return () => this.off(event, callback)
  }

  /**
   * 订阅事件（只触发一次）
   *
   * @param event - 事件名
   * @param callback - 回调函数
   * @returns 取消订阅函数
   */
  once(event: string, callback: EventCallback): () => void {
    const unsubscribe = this.on(event, (...args: any[]) => {
      unsubscribe()
      callback(...args)
    })
    return unsubscribe
  }

  /**
   * 取消订阅事件
   *
   * @param event - 事件名
   * @param callback - 回调函数（不传则移除该事件的所有监听器）
   */
  off(event: string, callback?: EventCallback): void {
    if (this._destroyed) return

    if (callback) {
      const listeners = this._listeners.get(event)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this._listeners.delete(event)
        }
      }
    } else {
      // 移除该事件的所有监听器
      this._listeners.delete(event)
    }
  }

  /**
   * 发布事件
   *
   * @param event - 事件名
   * @param data - 事件数据
   */
  emit(event: string, ...data: any[]): void {
    if (this._destroyed) return

    // 触发精确匹配的监听器
    const listeners = this._listeners.get(event)
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(...data)
        } catch (e) {
          console.error(
            `[EventBus] Error in listener for event "${event}":`,
            e instanceof Error ? e.message : e
          )
        }
      }
    }

    // 触发通配符匹配的监听器
    this._emitWildcard(event, data)
  }

  /**
   * 触发通配符监听器
   */
  private _emitWildcard(event: string, data: any[]): void {
    // 匹配 "prefix:*" 模式
    const colonIndex = event.indexOf(':')
    if (colonIndex !== -1) {
      const prefix = event.slice(0, colonIndex + 1) + '*'
      const wildcardListeners = this._listeners.get(prefix)
      if (wildcardListeners) {
        for (const callback of wildcardListeners) {
          try {
            callback(...data, event)
          } catch (e) {
            console.error(
              `[EventBus] Error in wildcard listener for "${prefix}":`,
              e instanceof Error ? e.message : e
            )
          }
        }
      }
    }

    // 匹配 "*" 通配符
    const allListeners = this._listeners.get('*')
    if (allListeners) {
      for (const callback of allListeners) {
        try {
          callback(...data, event)
        } catch (e) {
          console.error(
            `[EventBus] Error in * listener:`,
            e instanceof Error ? e.message : e
          )
        }
      }
    }
  }

  /**
   * 检查事件是否有监听器
   */
  hasListeners(event: string): boolean {
    const listeners = this._listeners.get(event)
    return listeners !== undefined && listeners.size > 0
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: string): number {
    return this._listeners.get(event)?.size || 0
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this._listeners.clear()
  }

  /**
   * 销毁事件总线
   */
  destroy(): void {
    this.clear()
    this._destroyed = true
  }
}

/**
 * SharedState 共享状态
 *
 * 提供跨子应用的响应式状态共享，支持 watch 监听变化。
 *
 * @example
 * ```ts
 * const state = new SharedState()
 *
 * // 设置值
 * state.set('user', { id: 1, name: 'Alice' })
 *
 * // 获取值
 * const user = state.get('user')
 *
 * // 监听变化
 * const unwatch = state.watch('user', (newUser, oldUser) => {
 *   console.log('User changed:', newUser)
 * })
 *
 * // 更新值（触发 watch）
 * state.set('user', { id: 1, name: 'Bob' })
 *
 * // 取消监听
 * unwatch()
 *
 * // 删除值
 * state.remove('user')
 * ```
 */
export class SharedState {
  /** 状态存储 */
  private _state: Map<string, any> = new Map()
  /** 监听器映射 */
  private _watchers: Map<string, Set<StateChangeCallback>> = new Map()
  /** 全局监听器 */
  private _globalWatchers: Set<(key: string, newValue: any, oldValue: any) => void> = new Set()
  /** 是否已销毁 */
  private _destroyed = false

  /**
   * 设置值
   *
   * @param key - 键名
   * @param value - 值
   */
  set<T = any>(key: string, value: T): void {
    if (this._destroyed) {
      console.warn('[SharedState] Cannot set value on destroyed SharedState.')
      return
    }

    const oldValue = this._state.get(key)
    this._state.set(key, value)

    // 触发监听器
    if (oldValue !== value) {
      this._notifyWatchers(key, value, oldValue)
      this._notifyGlobalWatchers(key, value, oldValue)
    }
  }

  /**
   * 获取值
   *
   * @param key - 键名
   * @param defaultValue - 默认值
   * @returns 值
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    if (this._state.has(key)) {
      return this._state.get(key) as T
    }
    return defaultValue
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    return this._state.has(key)
  }

  /**
   * 删除值
   *
   * @param key - 键名
   */
  remove(key: string): void {
    if (this._destroyed) return

    const oldValue = this._state.get(key)
    this._state.delete(key)

    // 触发监听器
    this._notifyWatchers(key, undefined, oldValue)
    this._notifyGlobalWatchers(key, undefined, oldValue)
  }

  /**
   * 监听值变化
   *
   * @param key - 键名
   * @param callback - 回调函数
   * @returns 取消监听函数
   */
  watch<T = any>(key: string, callback: StateChangeCallback<T>): () => void {
    if (this._destroyed) {
      console.warn('[SharedState] Cannot watch on destroyed SharedState.')
      return () => {}
    }

    if (!this._watchers.has(key)) {
      this._watchers.set(key, new Set())
    }
    this._watchers.get(key)!.add(callback as StateChangeCallback)

    return () => {
      const watchers = this._watchers.get(key)
      if (watchers) {
        watchers.delete(callback as StateChangeCallback)
        if (watchers.size === 0) {
          this._watchers.delete(key)
        }
      }
    }
  }

  /**
   * 监听所有值变化
   *
   * @param callback - 回调函数（接收 key, newValue, oldValue）
   * @returns 取消监听函数
   */
  watchAll(callback: (key: string, newValue: any, oldValue: any) => void): () => void {
    if (this._destroyed) {
      console.warn('[SharedState] Cannot watch on destroyed SharedState.')
      return () => {}
    }

    this._globalWatchers.add(callback)

    return () => {
      this._globalWatchers.delete(callback)
    }
  }

  /**
   * 批量设置值
   *
   * @param values - 键值对
   */
  batchSet(values: Record<string, any>): void {
    for (const [key, value] of Object.entries(values)) {
      this.set(key, value)
    }
  }

  /**
   * 获取所有键名
   */
  keys(): string[] {
    return [...this._state.keys()]
  }

  /**
   * 获取所有值
   */
  values(): any[] {
    return [...this._state.values()]
  }

  /**
   * 获取所有键值对
   */
  entries(): Array<[string, any]> {
    return [...this._state.entries()]
  }

  /**
   * 清除所有状态
   */
  clear(): void {
    const keys = [...this._state.keys()]
    this._state.clear()
    for (const key of keys) {
      this._notifyWatchers(key, undefined, undefined)
    }
  }

  /**
   * 销毁共享状态
   */
  destroy(): void {
    this.clear()
    this._watchers.clear()
    this._globalWatchers.clear()
    this._destroyed = true
  }

  /**
   * 通知特定键的监听器
   */
  private _notifyWatchers(key: string, newValue: any, oldValue: any): void {
    const watchers = this._watchers.get(key)
    if (watchers) {
      for (const callback of watchers) {
        try {
          callback(newValue, oldValue)
        } catch (e) {
          console.error(
            `[SharedState] Error in watcher for key "${key}":`,
            e instanceof Error ? e.message : e
          )
        }
      }
    }
  }

  /**
   * 通知全局监听器
   */
  private _notifyGlobalWatchers(key: string, newValue: any, oldValue: any): void {
    for (const callback of this._globalWatchers) {
      try {
        callback(key, newValue, oldValue)
      } catch (e) {
        console.error(
          `[SharedState] Error in global watcher:`,
          e instanceof Error ? e.message : e
        )
      }
    }
  }
}
