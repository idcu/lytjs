// src/emit.ts
// Event emission system

import { isFunction, hasOwn, isArray } from '@lytjs/common-is';
import type { ComponentInternalInstance } from './types';

/**
 * Normalize emits definition into a consistent Record<string, any> format.
 */
export function normalizeEmitsOptions(
  emits?: string[] | Record<string, (...args: any[]) => any>,
): Record<string, any> | null {
  if (!emits) return null;

  if (isArray(emits)) {
    // Array-based: ['click', 'change'] => { click: null, change: null }
    const result: Record<string, any> = {};
    for (let i = 0; i < emits.length; i++) {
      const key = emits[i]!;
      result[key] = null;
    }
    return result;
  }

  // Already an object (Record<string, Function | null>)
  return emits as Record<string, any>;
}

/**
 * Convert camelCase to kebab-case.
 * e.g., 'update:modelValue' => 'update:model-value'
 */
function toHandlerKey(event: string): string {
  return `on${event[0]!.toUpperCase()}${event.slice(1)}`;
}

/**
 * Emit an event on a component instance.
 * Looks for `onXxx` handler in props and attrs (camelCase conversion).
 */
export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...args: any[]
): void {
  if (instance.isUnmounted) return;

  // Normalize event name: convert kebab-case to camelCase for handler lookup
  const handlerName = toHandlerKey(event);

  // Look for handler in props first, then attrs
  const handler = instance.props[handlerName] ?? instance.attrs[handlerName];
  if (isFunction(handler)) {
    handler(...args);
  }
}

/**
 * Check if an event is declared in the emits options.
 */
export function isEmitValid(
  instance: ComponentInternalInstance,
  event: string,
): boolean {
  if (!instance.emitsOptions) return true;
  return hasOwn(instance.emitsOptions, event);
}
