// src/signal-state.ts
// Signal State adapter for component integration

import { signal, computedSignal } from '@lytjs/reactivity';
import type { Signal, ComputedSignal } from '@lytjs/reactivity';

export interface SignalStateOptions<T> {
  default?: T;
}

/**
 * 创建与组件协作的 Signal State
 */
export function createSignalState<T>(initialValue: T): Signal<T> {
  return signal(initialValue);
}

/**
 * 创建与组件协作的 Computed Signal State
 */
export function createComputedState<T>(getter: () => T): ComputedSignal<T> {
  return computedSignal(getter);
}
