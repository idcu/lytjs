// src/signal-state.ts
// Signal 状态适配器，用于组件集成

import { signal, computedSignal } from '@lytjs/reactivity';
import type { Signal, ComputedSignal } from '@lytjs/reactivity';

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
