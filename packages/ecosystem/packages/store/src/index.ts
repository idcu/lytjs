/**
 * @lytjs/store
 *
 * LytJS Signal-based state management with Option Store and Setup Store patterns.
 *
 * @packageDocumentation
 */

// Core
export { defineStore } from './defineStore';
export { createPinia } from './pinia';

// Utilities
export { storeToRefs } from './storeToRefs';
export { getActivePinia } from './pinia';

// Types
export type {
  StoreDefinition,
  Store,
  DefineStoreOptions,
  Pinia,
  PiniaPlugin,
  StateTree,
  SubscriptionCallback,
  ActionCallback,
  StoreGetters,
  StoreActions,
  StoreToRefs,
} from './types';
