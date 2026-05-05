// src/lifecycle.ts
// Lifecycle hooks management
//
// FIX: P2-16 生命周期钩子调用次序文档：
// 组件生命周期钩子的调用次序如下：
//
// 创建阶段：
//   1. beforeCreate（仅 Options API，setup 之前）
//   2. setup()（Composition API）
//   3. created（仅 Options API，setup 之后）
//
// 挂载阶段：
//   4. onBeforeMount / beforeMount
//   5. onMounted / mounted（子组件先挂载，父组件后挂载）
//
// 更新阶段：
//   6. onBeforeUpdate / beforeUpdate
//   7. onUpdated / updated（子组件先更新，父组件后更新）
//
// 卸载阶段：
//   8. onBeforeUnmount / beforeUnmount（父组件先卸载，子组件后卸载）
//   9. onUnmounted / unmounted
//
// 特殊钩子：
//   - errorCaptured：在子组件错误冒泡时调用（从子到父）
//   - renderTracked / renderTriggered：在渲染函数依赖追踪/触发时调用
//   - activated / deactivated：KeepAlive 组件激活/停用时调用

import type { ComponentInternalInstance, ComponentPublicInstance } from './types';
import { warnOnce } from '@lytjs/common-error';
import type { DebuggerEvent } from '@lytjs/shared-types';

// Current instance being set up (for lifecycle hook registration)
let currentInstance: ComponentInternalInstance | null = null;

/**
 * Set the current instance (used during setup).
 */
export function setCurrentInstance(instance: ComponentInternalInstance | null): void {
  currentInstance = instance;
}

/**
 * Get the current instance.
 */
export function getCurrentInstance(): ComponentInternalInstance | null {
  return currentInstance;
}

/**
 * Register a lifecycle hook on the current instance.
 */
function registerLifecycleHook(
  instance: ComponentInternalInstance,
  hookName: 'beforeMount' | 'mounted' | 'beforeUpdate' | 'updated' | 'beforeUnmount' | 'unmounted',
  fn: (...args: unknown[]) => void,
): void {
  if (instance) {
    instance.lifecycle[hookName].add(fn);
  }
}

// ==================== Public lifecycle APIs ====================

/**
 * Register a callback to be called when the component is mounted.
 */
export function onMounted(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'mounted', fn);
  } else if (__DEV__) {
    warnOnce(
      'onMounted was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called when the component is updated.
 */
export function onUpdated(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'updated', fn);
  } else if (__DEV__) {
    warnOnce(
      'onUpdated was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called when the component is unmounted.
 */
export function onUnmounted(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'unmounted', fn);
  } else if (__DEV__) {
    warnOnce(
      'onUnmounted was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called before the component is mounted.
 */
export function onBeforeMount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeMount', fn);
  } else if (__DEV__) {
    warnOnce(
      'onBeforeMount was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called before the component is updated.
 */
export function onBeforeUpdate(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeUpdate', fn);
  } else if (__DEV__) {
    warnOnce(
      'onBeforeUpdate was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called before the component is unmounted.
 */
export function onBeforeUnmount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeUnmount', fn);
  } else if (__DEV__) {
    warnOnce(
      'onBeforeUnmount was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register an error captured callback.
 * Uses an array to collect multiple callbacks per instance.
 */
export function onErrorCaptured(
  fn: (err: Error, instance: ComponentPublicInstance | null, info: string) => boolean | void,
): void {
  if (currentInstance) {
    if (!currentInstance.errorCapturedHooks) {
      currentInstance.errorCapturedHooks = [];
    }
    currentInstance.errorCapturedHooks.push(fn);
  } else if (__DEV__) {
    // 开发模式下警告：onErrorCaptured 必须在 setup 期间调用
    warnOnce(
      'onErrorCaptured was called when there is no active component instance. ' +
        'Make sure to call this function inside setup().',
    );
  }
}

/**
 * Register a callback to be called when the component is activated (by KeepAlive).
 */
export function onActivated(fn: () => void): void {
  if (currentInstance) {
    if (!currentInstance.activatedHooks) {
      currentInstance.activatedHooks = [];
    }
    currentInstance.activatedHooks.push(fn);
  }
}

/**
 * Register a callback to be called when the component is deactivated (by KeepAlive).
 */
export function onDeactivated(fn: () => void): void {
  if (currentInstance) {
    if (!currentInstance.deactivatedHooks) {
      currentInstance.deactivatedHooks = [];
    }
    currentInstance.deactivatedHooks.push(fn);
  }
}

/**
 * Register a callback to be called when a reactive dependency is tracked during render.
 * Only active in development mode.
 */
export function onRenderTracked(fn: (e: DebuggerEvent) => void): void {
  if (__DEV__) {
    if (currentInstance) {
      if (!currentInstance.renderTrackedHooks) {
        currentInstance.renderTrackedHooks = [];
      }
      currentInstance.renderTrackedHooks.push(fn);
    } else {
      warnOnce(
        'onRenderTracked was called when there is no active component instance. ' +
          'Make sure to call this function inside setup().',
      );
    }
  }
}

/**
 * Register a callback to be called when a reactive dependency is triggered during render.
 * Only active in development mode.
 */
export function onRenderTriggered(fn: (e: DebuggerEvent) => void): void {
  if (__DEV__) {
    if (currentInstance) {
      if (!currentInstance.renderTriggeredHooks) {
        currentInstance.renderTriggeredHooks = [];
      }
      currentInstance.renderTriggeredHooks.push(fn);
    } else {
      warnOnce(
        'onRenderTriggered was called when there is no active component instance. ' +
          'Make sure to call this function inside setup().',
      );
    }
  }
}

// ==================== Lifecycle calling ====================

/**
 * Safely call an Options API lifecycle hook with error handling.
 */
function callOptionsHook(
  instance: ComponentInternalInstance,
  hook: ((...args: unknown[]) => void) | undefined,
  name: string,
): void {
  if (hook) {
    try {
      hook.call(instance.ctx);
    } catch (err) {
      handleError(err as Error, instance, `${name} hook`);
    }
  }
}

/**
 * Call all registered hooks for a given lifecycle phase.
 */
export function callLifecycleHook(
  instance: ComponentInternalInstance,
  hookName: 'beforeMount' | 'mounted' | 'beforeUpdate' | 'updated' | 'beforeUnmount' | 'unmounted',
): void {
  const hooks = instance.lifecycle[hookName];
  if (hooks.size > 0) {
    for (const hook of hooks) {
      try {
        hook();
      } catch (err) {
        handleError(err as Error, instance, hookName);
      }
    }
  }
}

/**
 * Call beforeCreate and created lifecycle hooks (options API).
 */
export function callCreatedHook(instance: ComponentInternalInstance): void {
  const { beforeCreate, created } = instance.type;
  callOptionsHook(instance, beforeCreate, 'beforeCreate');
  callOptionsHook(instance, created, 'created');
}

/**
 * Call beforeMount and mounted lifecycle hooks (options API).
 */
export function callMountedHook(instance: ComponentInternalInstance): void {
  const { beforeMount, mounted } = instance.type;
  callLifecycleHook(instance, 'beforeMount');
  callOptionsHook(instance, beforeMount, 'beforeMount');
  callLifecycleHook(instance, 'mounted');
  callOptionsHook(instance, mounted, 'mounted');
  instance.isMounted = true;
}

/**
 * Call beforeUpdate and updated lifecycle hooks (options API).
 */
export function callUpdatedHook(instance: ComponentInternalInstance): void {
  const { beforeUpdate, updated } = instance.type;
  callLifecycleHook(instance, 'beforeUpdate');
  callOptionsHook(instance, beforeUpdate, 'beforeUpdate');
  callLifecycleHook(instance, 'updated');
  callOptionsHook(instance, updated, 'updated');
}

/**
 * Call beforeUnmount and unmounted lifecycle hooks (options API).
 */
export function callUnmountedHook(instance: ComponentInternalInstance): void {
  const { beforeUnmount, unmounted } = instance.type;
  callLifecycleHook(instance, 'beforeUnmount');
  callOptionsHook(instance, beforeUnmount, 'beforeUnmount');
  callLifecycleHook(instance, 'unmounted');
  callOptionsHook(instance, unmounted, 'unmounted');
  instance.isUnmounted = true;
}

/**
 * Handle error captured propagation.
 * Calls all errorCapturedHooks on the current instance (from inner to outer),
 * then propagates to parent. Returns true if the error was handled.
 */
export function handleError(
  err: Error,
  instance: ComponentInternalInstance | null,
  info: string,
): boolean {
  let current: ComponentInternalInstance | null = instance;
  while (current) {
    // Call all errorCapturedHooks registered via onErrorCaptured() on this instance
    const hooks = current.errorCapturedHooks;
    if (hooks && hooks.length > 0) {
      for (const hook of hooks) {
        const result = hook(err, current as unknown as ComponentPublicInstance, info);
        if (result === false) return true; // stop propagation
      }
    }

    // Also check options API errorCaptured
    const errorHandler = current.type.errorCaptured;
    if (errorHandler) {
      const result = errorHandler.call(
        current.ctx,
        err,
        current as unknown as ComponentPublicInstance,
        info,
      );
      if (result === false) return true;
    }

    // Propagate to parent
    current = current.parent;
  }

  // If error was not handled by any component, try app-level errorHandler
  if (instance) {
    const appErrorHandler = instance.root.appContext?.config?.errorHandler;
    if (typeof appErrorHandler === 'function') {
      // 传入公共实例而非内部实例，避免暴露内部实现细节
      const publicInstance = instance.ctx
        ? (instance as unknown as { ctx: ComponentPublicInstance }).ctx
        : null;
      appErrorHandler(err, publicInstance, info);
      return true;
    }
  }

  return false;
}
