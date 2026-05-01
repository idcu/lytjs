/**
 * @lytjs/vdom - diff
 * Diff algorithm module - re-exports diffChildren from patch
 * and provides standalone diff utilities.
 */

import type { VNode } from "@lytjs/common-vnode";
import { isSameVNodeType } from "@lytjs/common-vnode";

// ============================================================
// isSameVNodeType re-export
// ============================================================

export { isSameVNodeType };

// ============================================================
// Fast path: check if two children arrays can be patched without full diff
// ============================================================

/**
 * Check if old and new children can use the fast path (no structural changes).
 * Returns true if both arrays have the same keys in the same order.
 */
export function canUseFastDiff(c1: VNode[], c2: VNode[]): boolean {
  if (c1.length !== c2.length) return false;

  for (let i = 0; i < c1.length; i++) {
    if (!isSameVNodeType(c1[i]!, c2[i]!)) {
      return false;
    }
  }

  return true;
}

/**
 * Count the number of new nodes (nodes in c2 that don't have a matching key in c1)
 */
export function countNewNodes(c1: VNode[], c2: VNode[]): number {
  const oldKeys = new Set<string | number | symbol>();
  for (let i = 0; i < c1.length; i++) {
    const key = c1[i]!.key;
    if (key != null) oldKeys.add(key);
  }

  let count = 0;
  for (let i = 0; i < c2.length; i++) {
    const key = c2[i]!.key;
    if (key == null || !oldKeys.has(key)) {
      count++;
    }
  }
  return count;
}

/**
 * Count the number of removed nodes (nodes in c1 that don't have a matching key in c2)
 */
export function countRemovedNodes(c1: VNode[], c2: VNode[]): number {
  const newKeys = new Set<string | number | symbol>();
  for (let i = 0; i < c2.length; i++) {
    const key = c2[i]!.key;
    if (key != null) newKeys.add(key);
  }

  let count = 0;
  for (let i = 0; i < c1.length; i++) {
    const key = c1[i]!.key;
    if (key == null || !newKeys.has(key)) {
      count++;
    }
  }
  return count;
}
