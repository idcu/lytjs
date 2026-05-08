// src/lifecycle.ts
// 生命周期钩子管理
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

// 当前正在 setup 的实例（用于生命周期钩子注册）
let currentInstance: ComponentInternalInstance | null = null;

// FIX: P1-8 COMPONENT-NEW-02 - 生命周期钩子调用顺序跟踪
// 用于在开发模式下验证生命周期钩子调用顺序
const lifecycleCallOrder = new WeakMap<ComponentInternalInstance, Set<string>>();

/**
 * 断言生命周期钩子调用顺序正确
 * 确保 onBeforeMount 在 onMounted 之前调用等
 */
function assertLifecycleOrder(
  instance: ComponentInternalInstance,
  currentHook: string,
  requiredPrevHooks?: string[],
): void {
  if (!__DEV__) return;

  let calledHooks = lifecycleCallOrder.get(instance);
  if (!calledHooks) {
    calledHooks = new Set();
    lifecycleCallOrder.set(instance, calledHooks);
  }

  // 检查前置钩子是否已调用
  if (requiredPrevHooks) {
    for (const requiredHook of requiredPrevHooks) {
      if (!calledHooks.has(requiredHook)) {
        warnOnce(
          `Lifecycle hook "${currentHook}" was called before "${requiredHook}". ` +
            `Expected order: ${requiredPrevHooks.join(' -> ')} -> ${currentHook}`,
        );
      }
    }
  }

  calledHooks.add(currentHook);
}

/**
 * 设置当前实例（在 setup 期间使用）。
 */
export function setCurrentInstance(instance: ComponentInternalInstance | null): void {
  currentInstance = instance;
}

/**
 * 获取当前实例。
 */
export function getCurrentInstance(): ComponentInternalInstance | null {
  return currentInstance;
}

/**
 * 在当前实例上注册生命周期钩子。
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

// ==================== 公共生命周期 API ====================

/**
 * 注册组件挂载完成后调用的回调。
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
 * 注册组件更新完成后调用的回调。
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
 * 注册组件卸载后调用的回调。
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
 * 注册组件更新前调用的回调。
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
 * 注册组件卸载前调用的回调。
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
 * 注册错误捕获回调。
 * 使用数组收集每个实例的多个回调。
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
 * 注册组件被 KeepAlive 激活时调用的回调。
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
 * 注册组件被 KeepAlive 停用时调用的回调。
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
 * 注册渲染期间追踪响应式依赖时调用的回调。
 * 仅在开发模式下生效。
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
 * 注册渲染期间触发响应式依赖时调用的回调。
 * 仅在开发模式下生效。
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

// ==================== 生命周期调用 ====================

/**
 * 安全地调用选项式 API 生命周期钩子（带错误处理）。
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
 * 调用 beforeCreate 和 created 生命周期钩子（选项式 API）。
 */
export function callCreatedHook(instance: ComponentInternalInstance): void {
  const { beforeCreate, created } = instance.type;
  callOptionsHook(instance, beforeCreate, 'beforeCreate');
  callOptionsHook(instance, created, 'created');
}

/**
 * 调用 beforeMount 和 mounted 生命周期钩子（选项式 API）。
 */
export function callMountedHook(instance: ComponentInternalInstance): void {
  // FIX: P1-8 COMPONENT-NEW-02 - 添加生命周期调用顺序断言
  assertLifecycleOrder(instance, 'beforeMount', []);

  const { beforeMount, mounted } = instance.type;
  callLifecycleHook(instance, 'beforeMount');
  callOptionsHook(instance, beforeMount, 'beforeMount');

  // FIX: P1-8 - 确保 onBeforeMount 在 onMounted 之前调用
  assertLifecycleOrder(instance, 'mounted', ['beforeMount']);

  callLifecycleHook(instance, 'mounted');
  callOptionsHook(instance, mounted, 'mounted');
  instance.isMounted = true;
}

/**
 * 调用 beforeUpdate 和 updated 生命周期钩子（选项式 API）。
 */
export function callUpdatedHook(instance: ComponentInternalInstance): void {
  // FIX: P1-8 COMPONENT-NEW-02 - 添加生命周期调用顺序断言
  // 确保组件已挂载后才能调用更新钩子
  if (__DEV__ && !instance.isMounted) {
    warnOnce(
      `Lifecycle hook "beforeUpdate" was called before the component was mounted. ` +
        `Expected order: mounted -> beforeUpdate -> updated`,
    );
  }
  assertLifecycleOrder(instance, 'beforeUpdate', ['mounted']);

  const { beforeUpdate, updated } = instance.type;
  callLifecycleHook(instance, 'beforeUpdate');
  callOptionsHook(instance, beforeUpdate, 'beforeUpdate');

  // FIX: P1-8 - 确保 onBeforeUpdate 在 onUpdated 之前调用
  assertLifecycleOrder(instance, 'updated', ['beforeUpdate', 'mounted']);

  callLifecycleHook(instance, 'updated');
  callOptionsHook(instance, updated, 'updated');
}

/**
 * 调用 beforeUnmount 和 unmounted 生命周期钩子（选项式 API）。
 */
export function callUnmountedHook(instance: ComponentInternalInstance): void {
  // FIX: P1-8 COMPONENT-NEW-02 - 添加生命周期调用顺序断言
  // 确保组件已挂载后才能调用卸载钩子
  if (__DEV__ && !instance.isMounted) {
    warnOnce(
      `Lifecycle hook "beforeUnmount" was called before the component was mounted. ` +
        `Expected order: mounted -> beforeUnmount -> unmounted`,
    );
  }
  assertLifecycleOrder(instance, 'beforeUnmount', ['mounted']);

  const { beforeUnmount, unmounted } = instance.type;
  callLifecycleHook(instance, 'beforeUnmount');
  callOptionsHook(instance, beforeUnmount, 'beforeUnmount');

  // FIX: P1-8 - 确保 onBeforeUnmount 在 onUnmounted 之前调用
  assertLifecycleOrder(instance, 'unmounted', ['beforeUnmount', 'mounted']);

  callLifecycleHook(instance, 'unmounted');
  callOptionsHook(instance, unmounted, 'unmounted');
  instance.isUnmounted = true;
}

/**
 * 处理错误捕获传播。
 * 调用当前实例上所有通过 onErrorCaptured() 注册的 errorCapturedHooks（从内到外），
 * 然后传播到父组件。如果错误被处理则返回 true。
 */
export function handleError(
  err: Error,
  instance: ComponentInternalInstance | null,
  info: string,
): boolean {
  let current: ComponentInternalInstance | null = instance;
  while (current) {
    // 调用当前实例上通过 onErrorCaptured() 注册的所有 errorCapturedHooks
    const hooks = current.errorCapturedHooks;
    if (hooks && hooks.length > 0) {
      for (const hook of hooks) {
        const result = hook(err, current as unknown as ComponentPublicInstance, info);
        if (result === false) return true; // 停止传播
      }
    }

    // 同时检查选项式 API 的 errorCaptured
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

    // 传播到父组件
    current = current.parent;
  }

  // 如果错误未被任何组件处理，尝试应用级 errorHandler
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
