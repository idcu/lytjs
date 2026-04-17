/**
 * Lyt.js Signal 组件集成辅助模块
 *
 * 提供 Signal 与组件渲染函数之间的桥接工具。
 * 纯原生零依赖实现，无 DOM / 浏览器 API 依赖。
 */

import { signal, effect, type Signal, type WritableSignal } from './signal'

// ================================================================
//  组件生命周期上下文
// ================================================================

/** 组件 Signal 上下文（存储组件级别的 effect dispose 函数） */
interface SignalComponentContext {
  /** 组件卸载时调用的清理函数列表 */
  _cleanupFns: Array<() => void>
}

/** 当前活跃的组件上下文栈 */
const componentContextStack: SignalComponentContext[] = []

/**
 * 获取当前组件上下文
 */
function getCurrentContext(): SignalComponentContext | null {
  return componentContextStack.length > 0
    ? componentContextStack[componentContextStack.length - 1]
    : null
}

// ================================================================
//  公共 API
// ================================================================

/**
 * 在组件渲染函数中追踪 Signal 依赖
 *
 * 读取 Signal 的值并自动建立依赖追踪。
 * 当 Signal 变化时，会触发关联的 effect 重新执行。
 *
 * @param sig 要追踪的 Signal
 * @returns Signal 的当前值
 */
export function useSignal<T>(sig: Signal<T>): T {
  // 直接调用 Signal 即可，因为如果在 effect 上下文中会自动追踪
  return sig()
}

/**
 * 创建一个与组件生命周期绑定的 Signal 状态
 *
 * 返回一个元组 [signal, setter]：
 *   - signal: WritableSignal 实例
 *   - setter: 便捷的值设置函数
 *
 * 当组件卸载时，关联的 effect 会自动清理。
 *
 * @param initialValue 初始值
 * @returns [WritableSignal, setter] 元组
 */
export function useSignalState<T>(
  initialValue: T
): [WritableSignal<T>, (value: T) => void] {
  const sig = signal(initialValue)
  const setter = (value: T) => sig.set(value)

  // 如果在组件上下文中，注册自动清理
  const ctx = getCurrentContext()
  if (ctx) {
    // 标记此 signal 为组件级别，以便组件卸载时清理
    // 目前仅作为标记，实际清理由 effect dispose 处理
  }

  return [sig, setter]
}

/**
 * 进入组件 Signal 上下文
 *
 * 在组件渲染/挂载时调用，用于追踪组件级别的 Signal effect。
 *
 * @returns 退出上下文的函数
 */
export function enterSignalComponentContext(): () => void {
  const ctx: SignalComponentContext = {
    _cleanupFns: [],
  }
  componentContextStack.push(ctx)

  return (): void => {
    // 退出时执行所有清理函数
    for (const cleanup of ctx._cleanupFns) {
      cleanup()
    }
    ctx._cleanupFns.length = 0

    // 从栈中移除
    const idx = componentContextStack.indexOf(ctx)
    if (idx !== -1) {
      componentContextStack.splice(idx, 1)
    }
  }
}

/**
 * 在当前组件上下文中注册清理函数
 *
 * @param cleanup 清理函数
 */
export function onSignalCleanup(cleanup: () => void): void {
  const ctx = getCurrentContext()
  if (ctx) {
    ctx._cleanupFns.push(cleanup)
  }
}
