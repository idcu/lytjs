/**
 * @lytjs/store - createPinia implementation
 *
 * Global state management and plugin system.
 */

import type { Pinia, PiniaPlugin, StateTree } from './types';
import type { App } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { definePlugin } from '@lytjs/core';

let activePinia: Pinia | null = null;

/**
 * Get the active pinia instance
 */
export function getActivePinia(): Pinia | undefined {
  return activePinia || undefined;
}

/**
 * Set the active pinia instance (for SSR/testing)
 */
export function setActivePinia(pinia: Pinia | null): void {
  activePinia = pinia;
}

/**
 * Create a Pinia instance as a LytJS plugin
 */
export function createPinia() {
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

  const pinia: Pinia = {
    state,

    install(app: App) {
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
  };

  // Create a LytJS compatible plugin
  const lytjsPlugin = definePlugin({
    name: 'pinia',
    version: '1.0.0',
    description: 'LytJS Signal-based state management',
    install: (app) => {
      pinia.install(app);
    },
  });

  // Attach pinia methods to the plugin for backward compatibility
  Object.assign(lytjsPlugin, {
    use: pinia.use.bind(pinia),
    state,
  });

  return lytjsPlugin as typeof lytjsPlugin & {
    use: Pinia['use'];
    state: Pinia['state'];
  };
}

// DEV flag for development warnings
const __DEV__ = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
