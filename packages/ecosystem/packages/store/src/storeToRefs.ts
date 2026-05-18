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
export function storeToRefs<SS extends Record<string, unknown>>(store: SS): StoreToRefs<SS> {
  const refs: Record<string, unknown> = {};

  for (const key in store) {
    if (key.startsWith('$')) continue;

    const value = store[key];

    if (value && typeof value === 'object' && 'value' in value) {
      refs[key] = value;
    } else {
      refs[key] = toRef(store, key);
    }
  }

  return refs as StoreToRefs<SS>;
}
