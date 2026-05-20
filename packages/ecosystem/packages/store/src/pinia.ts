/**
 * @lytjs/store - createPinia implementation
 *
 * Global state management and plugin system.
 */

import type { Pinia, PiniaPlugin, StateTree } from './types';
import { signal } from '@lytjs/reactivity';

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
 * Create a Pinia instance
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

  const pinia: Pinia = {
    state,

    install(_app: unknown) {
      if (isInstalled) {
        if (__DEV__) {
          console.warn(`[@lytjs/store] Pinia has already been installed.`);
        }
        return;
      }
      isInstalled = true;
      activePinia = pinia;

      // Provide the pinia instance
      if ((_app as { provide?: unknown }).provide) {
        (_app as { provide: (key: string, value: unknown) => void }).provide(
          '__lytjs_pinia__',
          pinia,
        );
      }

      // Add global properties
      if (
        (_app as { config?: { globalProperties?: Record<string, unknown> } }).config
          ?.globalProperties
      ) {
        (
          _app as { config: { globalProperties: Record<string, unknown> } }
        ).config.globalProperties.$pinia = pinia;
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

  return pinia;
}

// DEV flag for development warnings
const __DEV__ = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
