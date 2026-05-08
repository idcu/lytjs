/**
 * @lytjs/store - defineStore implementation
 *
 * Supports both Options API and Setup Store patterns.
 */

import type {
  StoreDefinition,
  DefineStoreOptions,
  Store,
  StateTree,
  StoreGetters,
  StoreActions,
  _Method,
  SubscriptionCallback,
  ActionCallback,
} from './types';
import { signal, computed, effect, batch } from '@lytjs/reactivity';
import { getActivePinia } from './pinia';

// Store instance cache
const storeCache = new Map<string, Store<string, StateTree, any, any>>();

// Subscription and action callback registries per store
const subscriptions = new Map<string, Set<SubscriptionCallback<any>>>();
const actionCallbacks = new Map<string, Set<ActionCallback>>();

/**
 * Define a store with options syntax
 */
export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A> {
  return function useStore(pinia = getActivePinia()): Store<Id, S, G, A> {
    // Return cached store if exists
    if (storeCache.has(id)) {
      return storeCache.get(id) as Store<Id, S, G, A>;
    }

    // Initialize subscriptions registry
    if (!subscriptions.has(id)) {
      subscriptions.set(id, new Set());
    }
    if (!actionCallbacks.has(id)) {
      actionCallbacks.set(id, new Set());
    }

    const subs = subscriptions.get(id)!;
    const actions = actionCallbacks.get(id)!;

    // Create initial state
    const initialState = options.state ? options.state() : ({} as S);
    const stateSignals = new Map<string, ReturnType<typeof signal>>();
    const state: Record<string, any> = {};

    // Convert state to signals
    for (const key of Object.keys(initialState)) {
      const sig = signal(initialState[key]);
      stateSignals.set(key, sig);
      Object.defineProperty(state, key, {
        get: () => sig.value,
        set: (val) => {
          const oldValue = sig.value;
          sig.value = val;
          // Notify subscribers
          if (oldValue !== val) {
            for (const sub of subs) {
              sub(
                { storeId: id, type: 'direct', payload: { key, oldValue, newValue: val } },
                state as S,
              );
            }
          }
        },
        enumerable: true,
        configurable: true,
      });
    }

    // Create getters (computed signals)
    const getters: Record<string, any> = {};
    if (options.getters) {
      for (const [key, fn] of Object.entries(options.getters)) {
        const getterFn = fn as (...args: any[]) => any;
        const computedSignal = computed(() => getterFn.call({ ...state, ...getters }));
        Object.defineProperty(getters, key, {
          get: () => computedSignal.value,
          enumerable: true,
          configurable: true,
        });
      }
    }

    // Create actions (wrapped functions)
    const actionFns: Record<string, any> = {};
    if (options.actions) {
      for (const [key, fn] of Object.entries(options.actions)) {
        const actionFn = fn as _Method;
        actionFns[key] = async function (...args: any[]) {
          // Notify action callbacks before
          for (const cb of actions) {
            cb({ store: store, name: key, args });
          }

          try {
            const result = await actionFn.call({ ...state, ...getters, ...actionFns }, ...args);
            return result;
          } catch (error) {
            throw error;
          }
        };
      }
    }

    // Build the store object
    const store: Store<Id, S, G, A> = {
      $id: id,
      $state: state as S,

      $patch(partialOrMutator) {
        batch(() => {
          if (typeof partialOrMutator === 'function') {
            // Function patch
            partialOrMutator(state as S);
            for (const sub of subs) {
              sub({ storeId: id, type: 'patch function', payload: partialOrMutator }, state as S);
            }
          } else {
            // Object patch
            for (const [key, value] of Object.entries(partialOrMutator)) {
              if (key in state) {
                (state as any)[key] = value;
              }
            }
            for (const sub of subs) {
              sub({ storeId: id, type: 'patch object', payload: partialOrMutator }, state as S);
            }
          }
        });
      },

      $reset() {
        if (options.state) {
          const newState = options.state();
          for (const key of Object.keys(newState)) {
            if (key in state) {
              (state as any)[key] = newState[key];
            }
          }
        }
      },

      $subscribe(callback) {
        subs.add(callback);
        return () => {
          subs.delete(callback);
        };
      },

      $onAction(callback) {
        actions.add(callback);
        return () => {
          actions.delete(callback);
        };
      },

      $dispose() {
        storeCache.delete(id);
        subscriptions.delete(id);
        actionCallbacks.delete(id);
      },

      ...state,
      ...getters,
      ...actionFns,
    } as Store<Id, S, G, A>;

    // Register in pinia state
    if (pinia) {
      pinia.state.value[id] = state;
    }

    // Cache and return
    storeCache.set(id, store);
    return store;
  };
}

/**
 * Define a store with setup syntax
 */
export function defineStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
): () => SS {
  const cacheKey = `${id}:setup`;

  return function useStore(): SS {
    // Return cached store if exists
    if (storeCache.has(cacheKey)) {
      return storeCache.get(cacheKey) as unknown as SS;
    }

    const store = setup();
    storeCache.set(cacheKey, store as any);
    return store;
  };
}

/**
 * Clear all store caches (useful for testing)
 */
export function clearStoreCache(): void {
  storeCache.clear();
  subscriptions.clear();
  actionCallbacks.clear();
}
