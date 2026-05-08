/**
 * @lytjs/store - storeToRefs implementation
 *
 * Extract reactive refs from a store instance.
 */

import type { StoreToRefs } from './types';
import { toRef } from '@lytjs/reactivity';

/**
 * Extract reactive refs from a store instance
 */
export function storeToRefs<SS extends Record<string, any>>(store: SS): StoreToRefs<SS> {
  const refs: Record<string, any> = {};

  for (const key in store) {
    // Skip internal properties (starting with $)
    if (key.startsWith('$')) continue;

    const value = store[key];

    // If it's already a signal-like object, use it directly
    if (value && typeof value === 'object' && 'value' in value) {
      refs[key] = value;
    } else {
      // Create a ref for the property
      refs[key] = toRef(store, key);
    }
  }

  return refs as StoreToRefs<SS>;
}
