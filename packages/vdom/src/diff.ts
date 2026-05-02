/**
 * @lytjs/vdom - diff
 * Diff algorithm module - re-exports diffChildren from patch
 * and provides standalone diff utilities.
 */

import type { VNode } from '@lytjs/common-vnode';
import { isSameVNodeType } from '@lytjs/common-vnode';

// ============================================================
// isSameVNodeType re-export
// ============================================================

export { isSameVNodeType };

// ============================================================
// Fast path: check if two children arrays can be patched without full diff
// ============================================================

/**
 * 检查新旧子节点数组是否可以使用快速路径（无需完整 diff）。
 *
 * 仅当满足以下全部条件时返回 true：
 * 1. 两个数组长度相同
 * 2. 对应位置的节点类型相同（isSameVNodeType）
 *
 * 注意：此函数不检查 key 是否匹配。如果节点有 key 但 key 不同，
 * 即使类型相同也会返回 true，因此调用方需确保无 key 或 key 一致时
 * 才能安全使用快速路径。当前实现中快速路径主要用于无 key 的简单列表场景。
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
