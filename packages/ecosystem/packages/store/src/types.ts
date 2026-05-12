/**
 * @lytjs/store - Core type definitions
 */

import type { Signal } from '@lytjs/reactivity';

// ===== State =====

export type StateTree = Record<string | number | symbol, unknown>;

// ===== Store =====

export type _Method = (...args: unknown[]) => unknown;

export type StoreGetters<G> = {
  readonly [K in keyof G]: G[K] extends (...args: unknown[]) => infer R ? R : never;
};

export type StoreActions<A> = {
  [K in keyof A]: A[K] extends _Method ? A[K] : never;
};

export interface DefineStoreOptions<_Id extends string, S extends StateTree, G, A> {
  state?: () => S;
  getters?: G & ThisType<S & StoreGetters<G> & StoreActions<A>>;
  actions?: A & ThisType<S & StoreGetters<G> & StoreActions<A>>;
}

export interface Store<
  _Id extends string = string,
  S extends StateTree = {},
  _G = {},
  _A = {},
> {
  readonly $id: string;
  $state: S;
  $patch(partialState: Partial<S>): void;
  $patch(stateMutator: (state: S) => void): void;
  $reset(): void;
  $subscribe(callback: SubscriptionCallback<S>): () => void;
  $onAction(callback: ActionCallback): () => void;
  $dispose(): void;
}

export type StoreDefinition<
  _Id extends string = string,
  S extends StateTree = {},
  _G = {},
  _A = {},
> = (pinia?: any) => Store<_Id, S, _G, _A>;

export type StoreToRefs<SS> = {
  [K in keyof SS]: SS[K] extends Signal<infer T> ? Signal<T> : SS[K];
};

// ===== Pinia =====

export interface Pinia {
  install(app: any): void;
  state: import('@lytjs/reactivity').WritableSignal<Record<string, StateTree>>;
  use(plugin: PiniaPlugin): void;
}

export interface PiniaPlugin {
  install?(pinia: Pinia): void;
}

// ===== Callbacks =====

export type SubscriptionCallback<S> = (
  mutation: { storeId: string; type: 'direct' | 'patch object' | 'patch function'; payload: any },
  state: S,
) => void;

export type ActionCallback = (context: {
  store: any;
  name: string;
  args: unknown[];
  after?: () => void;
  onError?: (error: Error) => void;
}) => void;
