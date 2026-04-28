/**
 * Lyt.js 渲染器 — 卸载逻辑
 *
 * 本模块包含 VNode 卸载相关的函数。
 * 确保组件卸载时清理所有事件监听器和 effect 订阅。
 */

import type { LytRenderer } from './renderer-interfaces'
import type { VNode } from './vnode'
import { ShapeFlags, isFragment } from './vnode'

// ================================================================
//  清理注册表
// ================================================================

/** 组件事件监听器注册表 */
const eventListenerRegistry = new WeakMap<object, Array<{
  el: unknown
  event: string
  handler: (...args: unknown[]) => void
  options?: unknown
}>>()

/** 组件 effect 订阅注册表 */
const effectSubscriptionRegistry = new WeakMap<object, Array<() => void>>()

/** 组件 cleanup 钩子注册表 */
const cleanupHookRegistry = new WeakMap<object, Array<() => void>>()

/**
 * 注册组件的事件监听器（用于卸载时自动清理）
 *
 * @param component  组件实例
 * @param el         DOM 元素
 * @param event      事件名
 * @param handler    事件处理函数
 * @param options    事件选项
 */
export function registerComponentEventListener(
  component: object,
  el: unknown,
  event: string,
  handler: (...args: unknown[]) => void,
  options?: unknown,
): void {
  let listeners = eventListenerRegistry.get(component)
  if (!listeners) {
    listeners = []
    eventListenerRegistry.set(component, listeners)
  }
  listeners.push({ el, event, handler, options })
}

/**
 * 注册组件的 effect 订阅（用于卸载时自动清理）
 *
 * @param component  组件实例
 * @param dispose    effect 的 dispose 函数
 */
export function registerComponentEffectSubscription(
  component: object,
  dispose: () => void,
): void {
  let subscriptions = effectSubscriptionRegistry.get(component)
  if (!subscriptions) {
    subscriptions = []
    effectSubscriptionRegistry.set(component, subscriptions)
  }
  subscriptions.push(dispose)
}

/**
 * 注册组件的 cleanup 钩子（卸载时调用）
 *
 * @param component  组件实例
 * @param cleanup    清理函数
 */
export function registerComponentCleanup(
  component: object,
  cleanup: () => void,
): void {
  let cleanups = cleanupHookRegistry.get(component)
  if (!cleanups) {
    cleanups = []
    cleanupHookRegistry.set(component, cleanups)
  }
  cleanups.push(cleanup)
}

/**
 * 清理组件的所有注册资源
 *
 * @param renderer   渲染器实例
 * @param component  组件实例
 */
export function cleanupComponentResources(
  renderer: LytRenderer,
  component: object,
): void {
  // 1. 执行 cleanup 钩子
  const cleanups = cleanupHookRegistry.get(component)
  if (cleanups) {
    for (const cleanup of cleanups) {
      try {
        cleanup()
      } catch (err) {
        // 静默处理 cleanup 错误
      }
    }
    cleanupHookRegistry.delete(component)
  }

  // 2. 清理 effect 订阅
  const subscriptions = effectSubscriptionRegistry.get(component)
  if (subscriptions) {
    for (const dispose of subscriptions) {
      try {
        dispose()
      } catch (err) {
        // 静默处理 dispose 错误
      }
    }
    effectSubscriptionRegistry.delete(component)
  }

  // 3. 清理事件监听器
  const listeners = eventListenerRegistry.get(component)
  if (listeners) {
    for (const { el, event, handler, options } of listeners) {
      try {
        renderer.removeEventListener(el, event, handler)
      } catch (err) {
        // 静默处理移除监听器错误
      }
    }
    eventListenerRegistry.delete(component)
  }
}

/**
 * 卸载 VNode
 */
export function unmount(
  renderer: LytRenderer,
  unmountFn: (vnode: VNode, container?: any) => void,
  vnode: VNode,
  container?: any,
): void {
  const { shapeFlag, children } = vnode

  // Fragment 卸载
  if (isFragment(vnode)) {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        unmountFn(children[i], container)
      }
    }
    if (vnode.anchor && vnode.anchor.parentNode) {
      renderer.remove(vnode.anchor)
    }
    return
  }

  // 组件卸载
  if (shapeFlag & (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) {
    // 清理组件注册的所有资源（事件监听器、effect 订阅、cleanup 钩子）
    if (vnode.component) {
      cleanupComponentResources(renderer, vnode.component)
    }
    if (vnode.component && vnode.component.subTree) {
      unmountFn(vnode.component.subTree, container)
    }
    return
  }

  // 元素/文本/注释节点：直接移除
  if (vnode.el) {
    renderer.remove(vnode.el)
  }
}

/**
 * 批量卸载子节点
 */
export function unmountChildren(
  unmountFn: (vnode: VNode, container?: any) => void,
  children: VNode[],
): void {
  for (let i = 0; i < children.length; i++) {
    unmountFn(children[i])
  }
}
