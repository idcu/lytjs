/**
 * @lytjs/store - createPinia implementation
 *
 * Global state management and plugin system.
 */

import type { Pinia, PiniaPlugin, StateTree } from './types';
import type { App } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { definePlugin } from '@lytjs/core';

/** createPinia 返回的 Pinia 插件实例类型（插件定义 + state/use） */
type PiniaInstance = Pinia;

let activePinia: PiniaInstance | null = null;

/**
 * Get the active pinia instance
 */
export function getActivePinia(): PiniaInstance | undefined {
  return activePinia || undefined;
}

/**
 * Set the active pinia instance (for SSR/testing)
 */
export function setActivePinia(pinia: PiniaInstance): void {
  activePinia = pinia;
}

/**
 * Create a Pinia instance as a LytJS plugin
 */
export function createPinia(): Pinia {
  const stateSignal = signal<Record<string, StateTree>>({});
  const plugins: PiniaPlugin[] = [];
  let isInstalled = false;

  // Wrap signal with .value getter/setter for compatibility
  const state = {
    get value() {
      return stateSignal();
    },
    set value(newValue: Record<string, StateTree>) {
      stateSignal.set(newValue);
    },
  };

  // Create a LytJS compatible plugin (插件实例同时具备 Pinia 的 state/use 接口)
  const pinia = definePlugin({
    name: 'pinia',
    version: '1.0.0',
    description: 'LytJS Signal-based state management',
    author: undefined,
    keywords: undefined,
    install: (app: App) => {
      if (isInstalled) {
        if (__DEV__) {
          console.warn(`[@lytjs/store] Pinia has already been installed.`);
        }
        return;
      }
      isInstalled = true;
      activePinia = pinia;

      // Provide the pinia instance
      if (app.provide) {
        app.provide('__lytjs_pinia__', pinia);
      }

      // Add global properties
      if (app.config?.globalProperties) {
        app.config.globalProperties.$pinia = pinia;
      }

      // TODO: DevTools integration
      if (__DEV__) {
        // Setup DevTools hooks
      }
    },
  }) as unknown as Pinia;

  // Attach pinia properties and methods to the plugin
  Object.assign(pinia, {
    state,
    use(plugin: PiniaPlugin) {
      if (isInstalled) {
        if (__DEV__) {
          console.warn(`[@lytjs/store] Plugins should be added before calling app.use(pinia).`);
        }
      }
      plugins.push(plugin);
      plugin.install?.(pinia);
      return pinia;
    },
  });

  return pinia;
}

// DEV flag for development warnings
const __DEV__ = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/**
 * 在指定的 pinia 作用域里同步执行 `fn`，结束后**恢复**原来的 activePinia。
 *
 * ## 为什么需要它
 *
 * `setActivePinia()` 是一个**模块级全局**。在 SSR 里它天然不安全：
 *
 * ```ts
 * // 请求 A
 * setActivePinia(piniaA);
 * const html = await renderToStringAsync(h(App));   // 内部 await 期间…
 * // 请求 B（同一个事件循环）
 * setActivePinia(piniaB);                            // ← A 的 activePinia 被覆盖
 * // A 继续执行，useStore() 拿到的是 piniaB
 * ```
 *
 * 实测（`scripts/check-ssr-isolation.mjs` 第 [3] 组）：并发时请求 A 渲染出了 B 的数据。
 *
 * `runWithPinia` 把「设置 → 执行 → 恢复」做成一个同步窗口，适合**同步**渲染路径；
 * 异步渲染请**显式传 pinia**（`useStore(pinia)`）—— 那是唯一与并发无关的用法。
 *
 * @example
 * ```ts
 * const html = runWithPinia(pinia, () => renderToString(h(App)));
 * ```
 */
export function runWithPinia<T>(pinia: PiniaInstance, fn: () => T): T {
  const prev = activePinia;
  activePinia = pinia;
  try {
    return fn();
  } finally {
    activePinia = prev;
  }
}
