/**
 * @lytjs/store - defineStore implementation
 */

import type { StoreDefinition, DefineStoreOptions, Store, StateTree } from './types';
import { ref, reactive, computed } from '@lytjs/reactivity';

/**
 * Define a store with options syntax
 */
export function defineStore<Id extends string, S extends StateTree, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
): StoreDefinition<Id, S, G, A> {
  return function useStore(pinia?: any): Store<Id, S, G, A> {
    // TODO: implement full store creation
    const state = options.state ? reactive(options.state()) : {} as any;

    return {
      $id: id,
      $state: state,
      $patch(partialOrMutator) {
        // TODO: implement patch
      },
      $reset() {
        // TODO: implement reset
      },
      $subscribe() {
        // TODO: implement subscribe
        return () => {};
      },
      $onAction() {
        // TODO: implement onAction
        return () => {};
      },
      $dispose() {
        // TODO: implement dispose
      },
    } as Store<Id, S, G, A>;
  };
}

/**
 * Define a store with setup syntax
 */
export function defineStore<Id extends string, SS>(
  id: Id,
  setup: () => SS,
): () => SS {
  return () => setup();
}
