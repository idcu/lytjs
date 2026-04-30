// src/lifecycle.ts
// Lifecycle hooks management

import type { ComponentInternalInstance } from "./types";

// Current instance being set up (for lifecycle hook registration)
let currentInstance: ComponentInternalInstance | null = null;

/**
 * Set the current instance (used during setup).
 */
export function setCurrentInstance(
  instance: ComponentInternalInstance | null,
): void {
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
  hookName:
    | "beforeMount"
    | "mounted"
    | "beforeUpdate"
    | "updated"
    | "beforeUnmount"
    | "unmounted",
  fn: Function,
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
    registerLifecycleHook(currentInstance, "mounted", fn);
  }
}

/**
 * Register a callback to be called when the component is updated.
 */
export function onUpdated(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, "updated", fn);
  }
}

/**
 * Register a callback to be called when the component is unmounted.
 */
export function onUnmounted(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, "unmounted", fn);
  }
}

/**
 * Register a callback to be called before the component is mounted.
 */
export function onBeforeMount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, "beforeMount", fn);
  }
}

/**
 * Register a callback to be called before the component is updated.
 */
export function onBeforeUpdate(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, "beforeUpdate", fn);
  }
}

/**
 * Register a callback to be called before the component is unmounted.
 */
export function onBeforeUnmount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, "beforeUnmount", fn);
  }
}

/**
 * Register an error captured callback.
 * Uses an array to collect multiple callbacks per instance.
 */
export function onErrorCaptured(
  fn: (err: Error, instance: any, info: string) => boolean | void,
): void {
  if (currentInstance) {
    if (!currentInstance.errorCapturedHooks) {
      currentInstance.errorCapturedHooks = [];
    }
    currentInstance.errorCapturedHooks.push(fn);
  } else if (__DEV__) {
    // 开发模式下警告：onErrorCaptured 必须在 setup 期间调用
    console.warn(
      "[lytjs] onErrorCaptured was called when there is no active component instance. " +
        "Make sure to call this function inside setup().",
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

// ==================== Lifecycle calling ====================

/**
 * Safely call an Options API lifecycle hook with error handling.
 */
function callOptionsHook(
  instance: ComponentInternalInstance,
  hook: Function | undefined,
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
  hookName:
    | "beforeMount"
    | "mounted"
    | "beforeUpdate"
    | "updated"
    | "beforeUnmount"
    | "unmounted",
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
  callOptionsHook(instance, beforeCreate, "beforeCreate");
  callOptionsHook(instance, created, "created");
}

/**
 * Call beforeMount and mounted lifecycle hooks (options API).
 */
export function callMountedHook(instance: ComponentInternalInstance): void {
  const { beforeMount, mounted } = instance.type;
  callLifecycleHook(instance, "beforeMount");
  callOptionsHook(instance, beforeMount, "beforeMount");
  callLifecycleHook(instance, "mounted");
  callOptionsHook(instance, mounted, "mounted");
  instance.isMounted = true;
}

/**
 * Call beforeUpdate and updated lifecycle hooks (options API).
 */
export function callUpdatedHook(instance: ComponentInternalInstance): void {
  const { beforeUpdate, updated } = instance.type;
  callLifecycleHook(instance, "beforeUpdate");
  callOptionsHook(instance, beforeUpdate, "beforeUpdate");
  callLifecycleHook(instance, "updated");
  callOptionsHook(instance, updated, "updated");
}

/**
 * Call beforeUnmount and unmounted lifecycle hooks (options API).
 */
export function callUnmountedHook(instance: ComponentInternalInstance): void {
  const { beforeUnmount, unmounted } = instance.type;
  callLifecycleHook(instance, "beforeUnmount");
  callOptionsHook(instance, beforeUnmount, "beforeUnmount");
  callLifecycleHook(instance, "unmounted");
  callOptionsHook(instance, unmounted, "unmounted");
  instance.isUnmounted = true;
}

/**
 * Handle error captured propagation.
 * Calls all errorCapturedHooks on the current instance (from inner to outer),
 * then propagates to parent. Returns true if the error was handled.
 */
export function handleError(
  err: Error,
  instance: ComponentInternalInstance,
  info: string,
): boolean {
  // Call all errorCapturedHooks registered via onErrorCaptured() on this instance
  const hooks = instance.errorCapturedHooks;
  if (hooks && hooks.length > 0) {
    for (const hook of hooks) {
      const result = hook(err, instance, info);
      if (result === false) return true; // stop propagation
    }
  }

  // Also check options API errorCaptured
  const errorHandler = instance.type.errorCaptured;
  if (errorHandler) {
    const result = errorHandler.call(instance.ctx, err, instance, info);
    if (result === false) return true;
  }

  // Propagate to parent
  if (instance.parent) {
    return handleError(err, instance.parent, info);
  }

  return false;
}
