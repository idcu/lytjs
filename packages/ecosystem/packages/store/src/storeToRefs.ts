/**
 * @lytjs/store - storeToRefs implementation
 *
 * Extract reactive refs from a store instance.
 */

import type { StoreToRefs } from './types';
import { toRef, isRef } from '@lytjs/reactivity';

/**
 * Extract reactive refs from a store instance
 */
export function storeToRefs<SS extends Record<string, unknown>>(store: SS): StoreToRefs<SS> {
  const refs: Record<string, unknown> = {};

  // ⚠️ 2026-11-05 修（P1）：两个问题
  //   ① 用 `for...in` 会把**原型链上的可枚举属性**也扫进来（`Object.keys` 才是自有属性）；
  //   ② **没有跳过 action** —— 实测 `Object.keys(storeToRefs(store))` 为
  //      `["n","double","inc"]`，`refs.inc` 是一个「装着函数的 ref」，
  //      `const { inc } = storeToRefs(store); inc()` 直接 `TypeError: inc is not a function`。
  //      Pinia 的语义是「只提取 state + getters」，action 请直接从 store 上取。
  for (const key of Object.keys(store)) {
    if (key.startsWith('$')) continue;

    const value = store[key];

    // action（普通函数）不转 ref —— 但要注意本仓的 ref 本身也是函数，所以先判 ref。
    if (typeof value === 'function' && !isRef(value)) continue;

    if (value && typeof value === 'object' && 'value' in value) {
      refs[key] = value;
    } else {
      refs[key] = toRef(store, key);
    }
  }

  return refs as StoreToRefs<SS>;
}
