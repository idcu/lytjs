/**
 * @lytjs/renderer - Component Resource Cleanup
 *
 * 基于 WeakMap 的组件资源清理注册表。
 * 组件卸载时自动清理所有注册的事件监听器、effect 订阅和 cleanup 钩子。
 */

// ==================== 类型定义 ====================


/** 事件监听器注册条目 */
interface EventListenerEntry {
  el: unknown;
  event: string;
  handler: (...args: unknown[]) => void;
  options?: unknown;
}

/** 渲染器接口（仅需 removeEventListener 方法） */
export interface ResourceCleanupRenderer {
  removeEventListener(
    el: unknown,
    event: string,
    handler: (...args: unknown[]) => void,
    options?: unknown,
  ): void;
}

// ==================== 三层 WeakMap 清理注册表 ====================

/**
 * 事件监听器注册表
 * key: 组件实例, value: 该组件注册的所有事件监听器条目
 */
const eventListenerRegistry = new WeakMap<object, EventListenerEntry[]>();

/**
 * effect 订阅注册表
 * key: 组件实例, value: 该组件注册的所有 effect dispose 函数
 */
const effectSubscriptionRegistry = new WeakMap<object, Array<() => void>>();

/**
 * cleanup 钩子注册表
 * key: 组件实例, value: 该组件注册的所有通用清理回调
 */
const cleanupHookRegistry = new WeakMap<object, Array<() => void>>();

// ==================== 注册函数 ====================

/**
 * 注册组件事件监听器。
 * 组件卸载时将自动调用 renderer.removeEventListener 移除该监听器。
 *
 * @param component - 组件实例（作为 WeakMap key）
 * @param el - 事件目标元素
 * @param event - 事件名称
 * @param handler - 事件处理函数
 * @param options - 可选的 addEventListener 选项
 */
export function registerComponentEventListener(
  component: object,
  el: unknown,
  event: string,
  handler: (...args: unknown[]) => void,
  options?: unknown,
): void {
  let listeners = eventListenerRegistry.get(component);
  if (!listeners) {
    listeners = [];
    eventListenerRegistry.set(component, listeners);
  }
  listeners.push({ el, event, handler, options });
}

/**
 * 注册 effect 订阅。
 * 组件卸载时将自动调用 dispose 函数停止 effect。
 *
 * @param component - 组件实例（作为 WeakMap key）
 * @param dispose - effect 的 dispose 回调函数
 */
export function registerComponentEffectSubscription(component: object, dispose: () => void): void {
  let subscriptions = effectSubscriptionRegistry.get(component);
  if (!subscriptions) {
    subscriptions = [];
    effectSubscriptionRegistry.set(component, subscriptions);
  }
  subscriptions.push(dispose);
}

/**
 * 注册通用 cleanup 钩子。
 * 组件卸载时将按注册顺序执行该回调。
 *
 * @param component - 组件实例（作为 WeakMap key）
 * @param cleanup - 清理回调函数
 */
export function registerComponentCleanup(component: object, cleanup: () => void): void {
  let cleanups = cleanupHookRegistry.get(component);
  if (!cleanups) {
    cleanups = [];
    cleanupHookRegistry.set(component, cleanups);
  }
  cleanups.push(cleanup);
}

// ==================== 统一清理函数 ====================

/**
 * 统一清理组件所有注册资源。
 *
 * 清理顺序：
 * 1. cleanup 钩子（可能依赖 effect 仍活跃）
 * 2. effect 订阅（停止响应式追踪）
 * 3. 事件监听器（DOM 操作，最后执行）
 *
 * 每个清理操作均通过 try-catch 保护，单个失败不影响其余流程。
 *
 * @param renderer - 渲染器实例，需提供 removeEventListener 方法
 * @param component - 要清理资源的组件实例
 */
export function cleanupComponentResources(
  renderer: ResourceCleanupRenderer,
  component: object,
): void {
  // 1. 执行 cleanup 钩子
  const cleanups = cleanupHookRegistry.get(component);
  if (cleanups) {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/cleanup] Error during cleanup:', err);
      }
    }
    cleanupHookRegistry.delete(component);
  }

  // 2. 清理 effect 订阅
  const subscriptions = effectSubscriptionRegistry.get(component);
  if (subscriptions) {
    for (const dispose of subscriptions) {
      try {
        dispose();
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/cleanup] Error during cleanup:', err);
      }
    }
    effectSubscriptionRegistry.delete(component);
  }

  // 3. 清理事件监听器
  const listeners = eventListenerRegistry.get(component);
  if (listeners) {
    for (const { el, event, handler, options } of listeners) {
      try {
        renderer.removeEventListener(el, event, handler, options);
      } catch (err) {
        if (__DEV__) console.warn('[lytjs/cleanup] Error during cleanup:', err);
      }
    }
    eventListenerRegistry.delete(component);
  }
}
