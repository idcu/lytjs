/**
 * Lyt.js Signal State Adapter
 *
 * 将普通状态对象转换为基于 Signal 的响应式状态。
 * 提供 Proxy 包装，使组件代码可以使用 this.count 而非 this.count.value()。
 * 纯原生零依赖实现。
 */

import {
  signal,
  computed as signalComputed,
  effect as signalEffect,
  type WritableSignal,
  type Signal,
} from '@lytjs/reactivity/signal'

// ================================================================
//  类型定义
// ================================================================

/** Signal 状态对象：每个 key 对应一个 WritableSignal */
export type SignalState = Record<string, WritableSignal<any>>

/** Signal 状态代理（自动解包/设置 Signal 值） */
export type SignalStateProxy = Record<string, any>

// ================================================================
//  核心函数
// ================================================================

/**
 * 将普通状态对象转换为 Signal-based 状态
 *
 * 例如：createSignalState({ count: 0, name: 'hello' })
 * 返回：{ count: signal(0), name: signal('hello') }
 *
 * @param initialState - 初始状态对象
 * @returns 每个字段对应一个 WritableSignal 的对象
 */
export function createSignalState(initialState: Record<string, any>): SignalState {
  const state: SignalState = {}
  const keys = Object.keys(initialState)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    state[key] = signal(initialState[key])
  }
  return state
}

/**
 * 判断值是否为 Signal（具有 set 方法的函数）
 */
function isSignal(val: unknown): val is WritableSignal<any> {
  return typeof val === 'function' && val !== null && 'set' in (val as object)
}

/**
 * 创建 Signal 状态代理
 *
 * 代理对象会自动解包 Signal 值（读取时调用 sig()），
 * 并自动设置 Signal 值（写入时调用 sig.set(value)）。
 *
 * 这允许组件代码使用 this.count 而非 this.count.value()。
 *
 * @param signalState - Signal 状态对象
 * @returns 代理对象
 */
export function createSignalStateProxy(signalState: SignalState): SignalStateProxy {
  return new Proxy(signalState, {
    get(target, key: string | symbol) {
      // 处理 Symbol（如 Symbol.toPrimitive, Symbol.iterator 等）
      if (typeof key === 'symbol') {
        return (target as any)[key]
      }

      const sig = target[key]
      if (isSignal(sig)) {
        return sig()  // 自动解包 Signal 值
      }
      return target[key]
    },
    set(target, key: string | symbol, value: any): boolean {
      if (typeof key === 'symbol') {
        (target as any)[key] = value
        return true
      }

      const sig = target[key]
      if (isSignal(sig)) {
        sig.set(value)  // 自动设置 Signal 值
      } else {
        target[key] = value
      }
      return true
    },
    has(target, key: string | symbol): boolean {
      return key in target
    },
    ownKeys(target): (string | symbol)[] {
      return Object.keys(target)
    },
    getOwnPropertyDescriptor(target, key: string | symbol): PropertyDescriptor | undefined {
      if (typeof key === 'string' && key in target) {
        return {
          configurable: true,
          enumerable: true,
          get: () => {
            const sig = target[key]
            return isSignal(sig) ? sig() : sig
          },
          set: (val: any) => {
            const sig = target[key]
            if (isSignal(sig)) {
              sig.set(val)
            } else {
              target[key] = val
            }
          },
        }
      }
      return undefined
    },
  })
}

/**
 * 获取 Signal 状态的原始值快照
 *
 * @param signalState - Signal 状态对象
 * @returns 包含所有 Signal 当前值的普通对象
 */
export function getSignalStateSnapshot(signalState: SignalState): Record<string, any> {
  const snapshot: Record<string, any> = {}
  const keys = Object.keys(signalState)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const sig = signalState[key]
    snapshot[key] = isSignal(sig) ? sig() : sig
  }
  return snapshot
}

/**
 * 批量更新 Signal 状态
 *
 * @param signalState - Signal 状态对象
 * @param partial - 要更新的部分状态
 */
export function patchSignalState(signalState: SignalState, partial: Record<string, any>): void {
  const keys = Object.keys(partial)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const sig = signalState[key]
    if (isSignal(sig)) {
      sig.set(partial[key])
    }
  }
}

/**
 * 清理 Signal 状态（停止所有 Signal 的订阅）
 *
 * 注意：当前 Signal 实现没有显式的 dispose 方法，
 * 此函数为未来扩展预留。
 *
 * @param signalState - Signal 状态对象
 */
export function disposeSignalState(signalState: SignalState): void {
  // 当前 signal() 实现没有 dispose 方法
  // 预留接口，未来可在此处清理
}
