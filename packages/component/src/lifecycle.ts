// src/lifecycle.ts
// Lifecycle hooks management

import type { ComponentInternalInstance } from './types';

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
    registerLifecycleHook(currentInstance, 'mounted', fn);
  }
}

/**
 * Register a callback to be called when the component is updated.
 */
export function onUpdated(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'updated', fn);
  }
}

/**
 * Register a callback to be called when the component is unmounted.
 */
export function onUnmounted(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'unmounted', fn);
  }
}

/**
 * Register a callback to be called before the component is mounted.
 */
export function onBeforeMount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeMount', fn);
  }
}

/**
 * Register a callback to be called before the component is updated.
 */
export function onBeforeUpdate(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeUpdate', fn);
  }
}

/**
 * Register a callback to be called before the component is unmounted.
 */
export function onBeforeUnmount(fn: () => void): void {
  if (currentInstance) {
    registerLifecycleHook(currentInstance, 'beforeUnmount', fn);
  }
}

/**
 * Register an error captured callback.
 */
export function onErrorCaptured(fn: (err: Error, instance: any, info: string) => boolean | void): void {
  // Error captured is handled via options, not lifecycle sets
  if (currentInstance) {
    const original = currentInstance.type.errorCaptured;
    currentInstance.type.errorCaptured = (err: Error, instance: any, info: string) => {
      const result = fn(err, instance, info);
      if (original) {
        original(err, instance, info);
      }
      return result;
    };
  }
}

// ==================== Lifecycle calling ====================

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
      hook();
    }
  }
}

/**
 * Call beforeCreate and created lifecycle hooks (options API).
 */
export function callCreatedHook(instance: ComponentInternalInstance): void {
  const { beforeCreate, created } = instance.type;
  if (beforeCreate) beforeCreate.call(instance.ctx);
  if (created) created.call(instance.ctx);
}

/**
 * Call beforeMount and mounted lifecycle hooks (options API).
 */
export function callMountedHook(instance: ComponentInternalInstance): void {
  const { beforeMount, mounted } = instance.type;
  callLifecycleHook(instance, 'beforeMount');
  if (beforeMount) beforeMount.call(instance.ctx);
  callLifecycleHook(instance, 'mounted');
  if (mounted) mounted.call(instance.ctx);
  instance.isMounted = true;
}

/**
 * Call beforeUpdate and updated lifecycle hooks (options API).
 */
export function callUpdatedHook(instance: ComponentInternalInstance): void {
  const { beforeUpdate, updated } = instance.type;
  callLifecycleHook(instance, 'beforeUpdate');
  if (beforeUpdate) beforeUpdate.call(instance.ctx);
  callLifecycleHook(instance, 'updated');
  if (updated) updated.call(instance.ctx);
}

/**
 * Call beforeUnmount and unmounted lifecycle hooks (options API).
 */
export function callUnmountedHook(instance: ComponentInternalInstance): void {
  const { beforeUnmount, unmounted } = instance.type;
  callLifecycleHook(instance, 'beforeUnmount');
  if (beforeUnmount) beforeUnmount.call(instance.ctx);
  callLifecycleHook(instance, 'unmounted');
  if (unmounted) unmounted.call(instance.ctx);
  instance.isUnmounted = true;
}

/**
 * Handle error captured propagation.
 * Returns true if the error was handled (should stop propagation).
 */
export function handleError(
  err: Error,
  instance: ComponentInternalInstance,
  info: string,
): boolean {
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
