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
  _Method,
  SubscriptionCallback,
  ActionCallback,
} from './types';
import { signal, computedSignal as computed, batch } from '@lytjs/reactivity';
import { getActivePinia } from './pinia';

// Store instance cache
const storeCache = new Map<string, Store<any>>();

// Subscription and action callback registries per store
const subscriptions = new Map<string, Set<SubscriptionCallback<any>>>();
const actionCallbacks = new Map<string, Set<ActionCallback>>();

/**
 * Define a store with options syntax
 */
export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A>;

/**
 * Define a store with setup syntax
 */
export function defineStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
): () => SS & Store<Id, any, any, any>;

export function defineStore<Id extends string, S extends StateTree, G, A, SS>(
  id: Id,
  optionsOrSetup: DefineStoreOptions<Id, S, G, A> | (() => SS),
): StoreDefinition<Id, S, G, A> | (() => SS & Store<Id, any, any, any>) {
  if (typeof optionsOrSetup === 'function') {
    // Setup syntax
    const setup = optionsOrSetup;
    const cacheKey = `${id}:setup`;

    return function useStore(pinia: any = getActivePinia()): SS & Store<Id, any, any, any> {
      // Return cached store if exists
      if (storeCache.has(cacheKey)) {
        return storeCache.get(cacheKey) as unknown as SS & Store<Id, any, any, any>;
      }

      // Initialize registries
      if (!subscriptions.has(cacheKey)) {
        subscriptions.set(cacheKey, new Set());
      }
      if (!actionCallbacks.has(cacheKey)) {
        actionCallbacks.set(cacheKey, new Set());
      }

      const subs = subscriptions.get(cacheKey)!;
      const actionCbs = actionCallbacks.get(cacheKey)!;

      // Execute setup to get the store object
      const storeObj = setup();

      // Create Proxy for this context (lazy access, no circular dependency issues)
      const thisContext = new Proxy({}, {
        get(_target, prop: string | symbol) {
          if (typeof prop === 'string') {
            if (prop in wrappedStore) return (wrappedStore as any)[prop];
          }
          return undefined;
        },
        set(_target, prop: string | symbol, value) {
          if (typeof prop === 'string' && prop in wrappedStore) {
            (wrappedStore as any)[prop] = value;
            return true;
          }
          return false;
        },
        has(_target, prop) {
          return typeof prop === 'string' && prop in wrappedStore;
        },
      });

      // Wrap functions in storeObj as tracked actions
      const wrappedStore: Record<string, any> = { ...storeObj as Record<string, unknown> };
      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (typeof value === 'function' && !key.startsWith('$')) {
          wrappedStore[key] = function (...args: any[]) {
            const context: any = { store: wrappedStore, name: key, args };

            // Notify before
            for (const cb of actionCbs) {
              cb(context);
            }

            try {
              const result = (value as Function).apply(thisContext, args);
              
              const handleResult = (r: any) => {
                // Trigger after callback
                if (context.after) context.after(r);
                // Notify subscribers
                for (const sub of subs) {
                  sub(
                    { storeId: id, type: 'direct', payload: { name: key } },
                    (wrappedStore as any).$state,
                  );
                }
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: any) => {
                  if (context.onError) context.onError(err);
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (error) {
              // Trigger onError callback
              if (context.onError) context.onError(error as Error);
              throw error;
            }
          };
        }
      }

      // Add Store interface methods
      const store = wrappedStore as SS & Store<Id, any, any, any>;

      (store as any).$id = id;

      // $state - collect all non-function, non-$ properties
      (store as any).$state = {};
      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (typeof value !== 'function' && !key.startsWith('$')) {
          (store as any).$state[key] = value;
        }
      }

      (store as any).$patch = (partialOrMutator: Partial<Record<string, unknown>> | ((state: Record<string, unknown>) => void)) => {
        if (typeof partialOrMutator === 'function') {
          partialOrMutator((store as any).$state);
          for (const sub of subs) {
            sub({ storeId: id, type: 'patch function', payload: partialOrMutator }, (store as any).$state);
          }
        } else {
          for (const [key, value] of Object.entries(partialOrMutator)) {
            if (key in (store as any)) {
              (store as any)[key] = value;
            }
          }
          for (const sub of subs) {
            sub({ storeId: id, type: 'patch object', payload: partialOrMutator }, (store as any).$state);
          }
        }
      };

      (store as any).$reset = () => {
        // For setup stores, $reset re-runs the setup function
        // This is a simplified implementation
        console.warn(`[@lytjs/store] $reset() is not fully supported for setup stores. Store "${id}" needs to be disposed and recreated.`);
      };

      (store as any).$subscribe = (callback: SubscriptionCallback<any>) => {
        subs.add(callback);
        return () => { subs.delete(callback); };
      };

      (store as any).$onAction = (callback: ActionCallback) => {
        actionCbs.add(callback);
        return () => { actionCbs.delete(callback); };
      };

      (store as any).$dispose = () => {
        storeCache.delete(cacheKey);
        subscriptions.delete(cacheKey);
        actionCallbacks.delete(cacheKey);
      };

      // Register in pinia state
      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: (store as any).$state };
      }

      // Cache and return
      storeCache.set(cacheKey, store as any);
      return store;
    };
  } else {
    // Options syntax
    const options = optionsOrSetup;
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
          get: () => sig(),
          set: (val) => {
            const oldValue = sig();
            sig.set(val);
            // Notify subscribers
            if (!Object.is(oldValue, val)) {
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

      // Create Proxy for this context (lazy access, no circular dependency issues)
      const thisContext = new Proxy({}, {
        get(_target, prop: string | symbol) {
          if (typeof prop === 'string') {
            if (prop in state) return (state as any)[prop];
            if (prop in getters) return (getters as any)[prop];
            if (prop in actionFns) return (actionFns as any)[prop];
          }
          return undefined;
        },
        set(_target, prop: string | symbol, value) {
          if (typeof prop === 'string' && prop in state) {
            (state as any)[prop] = value;
            return true;
          }
          return false;
        },
        has(_target, prop) {
          return typeof prop === 'string' && (prop in state || prop in getters || prop in actionFns);
        },
      });

      // Create getters (computed signals)
      const getters: Record<string, any> = {};
      if (options.getters) {
        for (const [key, fn] of Object.entries(options.getters)) {
          const getterFn = fn as (...args: any[]) => any;
          const computedSig = computed(() => getterFn.call(thisContext)) as import('@lytjs/reactivity').ComputedSignal<any>;
          Object.defineProperty(getters, key, {
            get: () => computedSig(),
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
          actionFns[key] = function (...args: any[]) {
            const context: any = { store: undefined as any, name: key, args };

            // Notify action callbacks before
            for (const cb of actions) {
              cb(context);
            }

            try {
              const result = actionFn.call(thisContext, ...args);
              
              const handleResult = (r: any) => {
                // Trigger after callback
                if (context.after) context.after(r);
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: any) => {
                  if (context.onError) context.onError(err);
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (error) {
              // Trigger onError callback
              if (context.onError) context.onError(error as Error);
              throw error;
            }
          };
        }
      }

      // Build the store object using Object.defineProperties instead of spread
      const store = {} as Store<Id, S, G, A>;

      // Define base properties
      Object.defineProperty(store, '$id', {
        value: id,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$state', {
        get: () => state as S,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$patch', {
        value: function(partialOrMutator: Partial<S> | ((state: S) => void)) {
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
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$reset', {
        value: function() {
          if (options.state) {
            const newState = options.state();
            for (const key of Object.keys(newState)) {
              if (key in state) {
                (state as any)[key] = newState[key];
              }
            }
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$subscribe', {
        value: function(callback: SubscriptionCallback<S>) {
          subs.add(callback);
          return () => {
            subs.delete(callback);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$onAction', {
        value: function(callback: ActionCallback) {
          actions.add(callback);
          return () => {
            actions.delete(callback);
          };
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$dispose', {
        value: function() {
          storeCache.delete(id);
          subscriptions.delete(id);
          actionCallbacks.delete(id);
        },
        enumerable: true,
        configurable: true,
      });

      // Copy state property descriptors (preserve getter/setter)
      Object.defineProperties(store, Object.getOwnPropertyDescriptors(state));

      // Copy getters property descriptors (preserve getter)
      Object.defineProperties(store, Object.getOwnPropertyDescriptors(getters));

      // Copy actions (regular function properties)
      Object.assign(store, actionFns);

      // Register in pinia state
      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: state };
      }

      // Cache and return
      storeCache.set(id, store);
      return store;
    };
  }
}

/**
 * Clear all store caches (useful for testing)
 */
export function clearStoreCache(): void {
  storeCache.clear();
  subscriptions.clear();
  actionCallbacks.clear();
}
