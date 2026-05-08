/**
 * @lytjs/store - storeToRefs utility
 */

import type { StoreToRefs } from './types';
import { toRef } from '@lytjs/reactivity';

/**
 * Extract reactive refs from a store instance
 */
export function storeToRefs<SS extends Record<string, any>>(store: SS): StoreToRefs<SS> {
  const refs: Record<string, any> = {};
  for (const key in store) {
    if (key.startsWith('$')) continue;
    refs[key] = toRef(store, key);
  }
  return refs as StoreToRefs<SS>;
}
