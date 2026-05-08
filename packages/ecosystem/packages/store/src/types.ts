/**
 * @lytjs/store - Core type definitions
 */

import type { Signal } from '@lytjs/reactivity';

// ===== State =====

export type StateTree = Record<string | number | symbol, unknown>;

// ===== Store =====

export type _Method = (...args: unknown[]) => unknown;

export interface StoreGetters<G> {
  readonly [K in keyof G]: G[K] extends (...args: unknown[]) => infer R ? R : never;
}

export interface StoreActions<A> {
  [K in keyof A]: A[K] extends _Method ? A[K] : never;
}

export interface DefineStoreOptions<Id extends string, S extends StateTree, G, A> {
  state?: () => S;
  getters?: G & ThisType<S & StoreGetters<G> & StoreActions<A>>;
  actions?: A & ThisType<S & StoreGetters<G> & StoreActions<A>>;
}

export interface Store<
  Id extends string = string,
  S extends StateTree = {},
  G = {},
  A = {},
> {
  readonly $id: Id;
  $state: S;
  $patch(partialState: Partial<S>): void;
  $patch(stateMutator: (state: S) => void): void;
  $reset(): void;
  $subscribe(callback: SubscriptionCallback<S>): () => void;
  $onAction(callback: ActionCallback): () => void;
  $dispose(): void;
}

export type StoreDefinition<
  Id extends string = string,
  S extends StateTree = {},
  G = {},
  A = {},
> = (pinia?: any) => Store<Id, S, G, A>;

export type StoreToRefs<SS> = {
  [K in keyof SS]: SS[K] extends Signal<infer T> ? Signal<T> : SS[K];
};

// ===== Pinia =====

export interface Pinia {
  install(app: any): void;
  state: Signal<Record<string, StateTree>>;
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
