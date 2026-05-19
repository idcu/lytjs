/**
 * @lytjs/store - defineStore implementation
 *
 * Supports both Options API and Setup Store patterns.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  StoreDefinition,
  DefineStoreOptions,
  Store,
  StateTree,
  _Method,
  SubscriptionCallback,
  ActionCallback,
  Pinia,
} from './types';
import { signal, computedSignal as computed, batch } from '@lytjs/reactivity';
import { getActivePinia } from './pinia';

const storeCache = new Map<string, Store>();
const subscriptions = new Map<string, Set<SubscriptionCallback<Record<string, unknown>>>>();
const actionCallbacks = new Map<string, Set<ActionCallback>>();

export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A>;

export function defineStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
): () => SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;

export function defineStore<Id extends string, S extends StateTree, G, A, SS>(
  id: Id,
  optionsOrSetup: DefineStoreOptions<Id, S, G, A> | (() => SS),
): StoreDefinition<Id, S, G, A> | (() => SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>) {
  if (typeof optionsOrSetup === 'function') {
    const setup = optionsOrSetup;
    const cacheKey = `${id}:setup`;

    return function useStore(pinia?: Pinia): SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>> {
      if (storeCache.has(cacheKey)) {
        return storeCache.get(cacheKey) as unknown as SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
      }

      if (!subscriptions.has(cacheKey)) {
        subscriptions.set(cacheKey, new Set());
      }
      if (!actionCallbacks.has(cacheKey)) {
        actionCallbacks.set(cacheKey, new Set());
      }

      const subs = subscriptions.get(cacheKey)!;
      const actionCbs = actionCallbacks.get(cacheKey)!;

      const storeObj = setup();

      const wrappedStore: Record<string, unknown> = { ...storeObj as Record<string, unknown> };

      const thisContext = new Proxy(wrappedStore, {
        get(target, prop: string | symbol) {
          if (typeof prop === 'string') {
            const value = target[prop];
            if (typeof value === 'function') {
              return value.bind(target);
            }
            return value;
          }
          return undefined;
        },
        has(_target, prop) {
          return typeof prop === 'string' && prop in wrappedStore;
        },
      });

      for (const [key, value] of Object.entries(storeObj as Record<string, unknown>)) {
        if (typeof value === 'function' && !key.startsWith('$')) {
          wrappedStore[key] = function (...args: unknown[]) {
            const context = { 
              store: wrappedStore, 
              name: key, 
              args,
              after: undefined as ((result: unknown) => void) | undefined,
              onError: undefined as ((error: unknown) => void) | undefined
            };

            for (const cb of actionCbs) {
              (cb as any)(context);
            }

            try {
              const result = (value as any).apply(thisContext, args);

              const handleResult = (r: unknown) => {
                for (const sub of subs) {
                  sub(
                    { storeId: id, type: 'direct', payload: { name: key } },
                    wrappedStore.$state as Record<string, unknown>,
                  );
                }
                if (context.after) {
                  context.after(r);
                }
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: unknown) => {
                  if (context.onError) {
                    context.onError(err);
                  }
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (err) {
              if (context.onError) {
                context.onError(err);
              }
              throw err;
            }
          };
        }
      }

      const store = wrappedStore as unknown as SS & Store<Id, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;

      (store as any).$id = id;

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
            if (key in store) {
              (store as Record<string, unknown>)[key] = value;
            }
          }
          for (const sub of subs) {
            sub({ storeId: id, type: 'patch object', payload: partialOrMutator }, (store as any).$state);
          }
        }
      };

      (store as any).$reset = () => {
        console.warn(`[@lytjs/store] $reset() is not fully supported for setup stores. Store "${id}" needs to be disposed and recreated.`);
      };

      (store as any).$subscribe = (callback: SubscriptionCallback<Record<string, unknown>>) => {
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

      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: store.$state };
      }

      storeCache.set(cacheKey, store as unknown as Store);
      return store;
    };
  } else {
    const options = optionsOrSetup;
    return function useStore(pinia = getActivePinia()): Store<Id, S, G, A> {
      if (storeCache.has(id)) {
        return storeCache.get(id) as Store<Id, S, G, A>;
      }

      if (!subscriptions.has(id)) {
        subscriptions.set(id, new Set());
      }
      if (!actionCallbacks.has(id)) {
        actionCallbacks.set(id, new Set());
      }

      const subs = subscriptions.get(id)!;
      const actions = actionCallbacks.get(id)!;

      const initialState = options.state ? options.state() : ({} as S);
      const stateSignals = new Map<string, ReturnType<typeof signal>>();
      const state: Record<string, unknown> = {};

      for (const key of Object.keys(initialState)) {
        const sig = signal(initialState[key as keyof S]);
        stateSignals.set(key, sig);
        Object.defineProperty(state, key, {
          get: () => sig(),
          set: (val: unknown) => {
            const oldValue = sig();
            sig.set(val as Parameters<typeof sig.set>[0]);
            if (!Object.is(oldValue, val)) {
              for (const sub of subs) {
                sub(
                  { storeId: id, type: 'direct', payload: { key, oldValue, newValue: val } },
                  state as unknown as S,
                );
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      }

      const thisContext = new Proxy({}, {
        get(_target, prop: string | symbol) {
          if (typeof prop === 'string') {
            if (prop in state) return (state as Record<string, unknown>)[prop];
            if (prop in getters) return (getters as Record<string, unknown>)[prop];
            if (prop in actionFns) return (actionFns as Record<string, unknown>)[prop];
          }
          return undefined;
        },
        set(_target, prop: string | symbol, value: unknown) {
          if (typeof prop === 'string' && prop in state) {
            (state as Record<string, unknown>)[prop] = value;
            return true;
          }
          return false;
        },
        has(_target, prop) {
          return typeof prop === 'string' && (prop in state || prop in getters || prop in actionFns);
        },
      });

      const getters: Record<string, unknown> = {};
      if (options.getters) {
        for (const [key, fn] of Object.entries(options.getters)) {
          const getterFn = fn as (...args: unknown[]) => unknown;
          const computedSig = computed(() => getterFn.call(thisContext));
          Object.defineProperty(getters, key, {
            get: () => computedSig(),
            enumerable: true,
            configurable: true,
          });
        }
      }

      const actionFns: Record<string, unknown> = {};
      if (options.actions) {
        for (const [key, fn] of Object.entries(options.actions)) {
          const actionFn = fn as _Method;
          actionFns[key] = function (...args: unknown[]) {
            const context = { 
              store: store as any, 
              name: key, 
              args,
              after: undefined as ((result: unknown) => void) | undefined,
              onError: undefined as ((error: unknown) => void) | undefined
            };

            for (const cb of actions) {
              (cb as any)(context);
            }

            try {
              const result = (actionFn as any).apply(thisContext, args);

              const handleResult = (r: unknown) => {
                if (context.after) {
                  context.after(r);
                }
                return r;
              };

              if (result instanceof Promise) {
                return result.then(handleResult, (err: unknown) => {
                  if (context.onError) {
                    context.onError(err);
                  }
                  throw err;
                });
              } else {
                return handleResult(result);
              }
            } catch (err) {
              if (context.onError) {
                context.onError(err);
              }
              throw err;
            }
          };
        }
      }

      const store = {} as Store<Id, S, G, A>;

      Object.defineProperty(store, '$id', {
        value: id,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$state', {
        get: () => state as any,
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$patch', {
        value: function(partialOrMutator: Partial<S> | ((state: S) => void) | any) {
          batch(() => {
            if (typeof partialOrMutator === 'function') {
              partialOrMutator(state as any);
              for (const sub of subs) {
                sub({ storeId: id, type: 'patch function', payload: partialOrMutator }, state as any);
              }
            } else {
              for (const [key, value] of Object.entries(partialOrMutator)) {
                if (key in state) {
                  (state as Record<string, unknown>)[key] = value;
                }
              }
              for (const sub of subs) {
                sub({ storeId: id, type: 'patch object', payload: partialOrMutator }, state as any);
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
                (state as Record<string, unknown>)[key] = (newState as Record<string, unknown>)[key];
              }
            }
          }
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(store, '$subscribe', {
        value: function(callback: SubscriptionCallback<S>) {
          subs.add(callback as any);
          return () => {
            subs.delete(callback as any);
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

      Object.defineProperties(store, Object.getOwnPropertyDescriptors(state));
      Object.defineProperties(store, Object.getOwnPropertyDescriptors(getters));
      Object.assign(store, actionFns);

      if (pinia) {
        const currentState = pinia.state.value;
        pinia.state.value = { ...currentState, [id]: state as S };
      }

      storeCache.set(id, store);
      return store;
    };
  }
}

export function clearStoreCache(): void {
  storeCache.clear();
  subscriptions.clear();
  actionCallbacks.clear();
}
