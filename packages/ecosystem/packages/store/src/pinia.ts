/**
 * @lytjs/store - createPinia implementation
 */

import type { Pinia, PiniaPlugin } from './types';
import { signal } from '@lytjs/reactivity';

let activePinia: Pinia | null = null;

/**
 * Get the active pinia instance
 */
export function getActivePinia(): Pinia | undefined {
  return activePinia || undefined;
}

/**
 * Create a Pinia instance
 */
export function createPinia(): Pinia {
  const state = signal<Record<string, any>>({});
  const plugins: PiniaPlugin[] = [];

  const pinia: Pinia = {
    state,

    install(app: any) {
      activePinia = pinia;
      app.provide?.('__lytjs_pinia__', pinia);
      // TODO: setup devtools integration
    },

    use(plugin: PiniaPlugin) {
      plugins.push(plugin);
      plugin.install?.(pinia);
    },
  };

  return pinia;
}
