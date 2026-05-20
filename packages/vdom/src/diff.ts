/**
 * @lytjs/vdom - diff
 * Diff 算法模块 - 从 patch 重新导出 diffChildren
 * 并提供独立的 diff 工具函数。
 *
 * @module @lytjs/vdom/diff
 *
 * @description
 * 本模块提供虚拟 DOM diff 算法的辅助工具函数，用于优化列表渲染性能。
 * 核心功能包括：
 * - 快速路径检测：判断是否可以跳过完整 diff 流程
 * - 节点变化统计：计算新增/删除节点数量，用于性能分析和优化决策
 *
 * @example
 * ```ts
 * import { canUseFastDiff, countNewNodes, countRemovedNodes } from '@lytjs/vdom/diff';
 *
 * // 检查是否可以使用快速路径
 * if (canUseFastDiff(oldChildren, newChildren)) {
 *   // 直接逐个 patch，跳过复杂的 LIS 算法
 * }
 *
 * // 统计节点变化
 * const added = countNewNodes(oldChildren, newChildren);
 * const removed = countRemovedNodes(oldChildren, newChildren);
 * ```
 */

import type { VNode } from '@lytjs/common-vnode';
import { isSameVNodeType } from '@lytjs/common-vnode';

// ============================================================
// isSameVNodeType 重新导出
// ============================================================

export { isSameVNodeType };

// ============================================================
// 快速路径：检查两个 children 数组是否可以无需完整 diff 直接 patch
// ============================================================

/**
 * 检查新旧子节点数组是否可以使用快速路径（无需完整 diff）。
 *
 * @param c1 - 旧子节点数组
 * @param c2 - 新子节点数组
 * @returns 如果可以使用快速路径返回 true，否则返回 false
 *
 * @description
 * 仅当满足以下全部条件时返回 true：
 * 1. 两个数组长度相同
 * 2. 对应位置的节点类型相同（isSameVNodeType）
 *
 * 注意：此函数不检查 key 是否匹配。如果节点有 key 但 key 不同，
 * 即使类型相同也会返回 true，因此调用方需确保无 key 或 key 一致时
 * 才能安全使用快速路径。当前实现中快速路径主要用于无 key 的简单列表场景。
 *
 * 时间复杂度：O(n)，其中 n 为数组长度
 * 空间复杂度：O(1)
 *
 * @example
 * ```ts
 * const oldChildren = [h('div'), h('span')];
 * const newChildren = [h('div'), h('span')];
 * if (canUseFastDiff(oldChildren, newChildren)) {
 *   // 可以直接逐个 patch，无需执行完整的 diff 算法
 * }
 * ```
 */
export function canUseFastDiff(c1: VNode[], c2: VNode[]): boolean {
  // 长度不同，无法使用快速路径
  if (c1.length !== c2.length) return false;

  // 逐个检查对应位置的节点类型是否相同
  for (let i = 0; i < c1.length; i++) {
    if (!isSameVNodeType(c1[i]!, c2[i]!)) {
      return false;
    }
  }

  return true;
}

// ============================================================
// 节点计数工具函数
// ============================================================

/**
 * 统计新增节点数量（在 c2 中有但 c1 中没有的节点）
 *
 * @param c1 - 旧子节点数组
 * @param c2 - 新子节点数组
 * @returns 新增节点的数量
 *
 * @description
 * 通过比较两个数组中节点的 key，计算需要新增的节点数量。
 * 无 key 的节点会被视为新增节点。
 *
 * 算法步骤：
 * 1. 收集 c1 中所有非空 key 到 Set
 * 2. 遍历 c2，统计 key 为空或不在 Set 中的节点
 *
 * 时间复杂度：O(n + m)，其中 n 为 c1 长度，m 为 c2 长度
 * 空间复杂度：O(k)，其中 k 为 c1 中非空 key 的数量
 *
 * @example
 * ```ts
 * const oldChildren = [h('div', { key: 'a' }), h('div', { key: 'b' })];
 * const newChildren = [h('div', { key: 'a' }), h('div', { key: 'c' })];
 * const added = countNewNodes(oldChildren, newChildren); // 1（key: 'c' 是新增的）
 * ```
 */
export function countNewNodes(c1: VNode[], c2: VNode[]): number {
  // 收集旧节点中的所有 key
  const oldKeys = new Set<string | number | symbol>();
  for (let i = 0; i < c1.length; i++) {
    const key = c1[i]!.key;
    if (key != null) oldKeys.add(key);
  }

  // 统计新节点中不在旧节点 key 集合中的节点
  let count = 0;
  for (let i = 0; i < c2.length; i++) {
    const key = c2[i]!.key;
    // 无 key 的节点或 key 不在旧集合中的节点视为新增
    if (key == null || !oldKeys.has(key)) {
      count++;
    }
  }
  return count;
}

/**
 * 统计删除节点数量（在 c1 中有但 c2 中没有的节点）
 *
 * @param c1 - 旧子节点数组
 * @param c2 - 新子节点数组
 * @returns 删除节点的数量
 *
 * @description
 * 通过比较两个数组中节点的 key，计算需要删除的节点数量。
 * 无 key 的节点会被视为删除节点。
 *
 * 算法步骤：
 * 1. 收集 c2 中所有非空 key 到 Set
 * 2. 遍历 c1，统计 key 为空或不在 Set 中的节点
 *
 * 时间复杂度：O(n + m)，其中 n 为 c1 长度，m 为 c2 长度
 * 空间复杂度：O(k)，其中 k 为 c2 中非空 key 的数量
 *
 * @example
 * ```ts
 * const oldChildren = [h('div', { key: 'a' }), h('div', { key: 'b' })];
 * const newChildren = [h('div', { key: 'a' }), h('div', { key: 'c' })];
 * const removed = countRemovedNodes(oldChildren, newChildren); // 1（key: 'b' 被删除了）
 * ```
 */
export function countRemovedNodes(c1: VNode[], c2: VNode[]): number {
  // 收集新节点中的所有 key
  const newKeys = new Set<string | number | symbol>();
  for (let i = 0; i < c2.length; i++) {
    const key = c2[i]!.key;
    if (key != null) newKeys.add(key);
  }

  // 统计旧节点中不在新节点 key 集合中的节点
  let count = 0;
  for (let i = 0; i < c1.length; i++) {
    const key = c1[i]!.key;
    // 无 key 的节点或 key 不在新集合中的节点视为删除
    if (key == null || !newKeys.has(key)) {
      count++;
    }
  }
  return count;
}

// ============================================================
// Diff 策略选择辅助函数
// ============================================================

/**
 * 判断子节点数组是否全部带有 key
 *
 * @param children - 子节点数组
 * @returns 如果所有节点都有 key 返回 true，否则返回 false
 *
 * @description
 * 用于决定使用何种 diff 策略：
 * - 全部有 key：使用 key-based diff（LIS 算法优化）
 * - 全部无 key：使用 index-based diff
 * - 混合情况：需要特殊处理
 *
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
export function allChildrenHaveKeys(children: VNode[]): boolean {
  for (let i = 0; i < children.length; i++) {
    if (children[i]!.key == null) {
      return false;
    }
  }
  return children.length > 0;
}

/**
 * 判断子节点数组是否全部没有 key
 *
 * @param children - 子节点数组
 * @returns 如果所有节点都没有 key 返回 true，否则返回 false
 *
 * @description
 * 用于决定使用何种 diff 策略。
 * 当全部无 key 时，可以使用基于索引的简单 diff 算法。
 *
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
export function noChildrenHaveKeys(children: VNode[]): boolean {
  for (let i = 0; i < children.length; i++) {
    if (children[i]!.key != null) {
      return false;
    }
  }
  return true;
}

// ============================================================
// 性能分析工具函数
// ============================================================

/**
 * Diff 分析结果
 */
export interface DiffAnalysis {
  /** 新增节点数量 */
  added: number;
  /** 删除节点数量 */
  removed: number;
  /** 保持不变的节点数量 */
  unchanged: number;
  /** 移动的节点数量（需要 DOM 移动操作） */
  moved: number;
  /** 建议使用的 diff 策略 */
  recommendedStrategy: 'fast' | 'keyed' | 'unkeyed' | 'full';
}

/**
 * 分析两个子节点数组的差异，提供优化建议
 *
 * @param c1 - 旧子节点数组
 * @param c2 - 新子节点数组
 * @returns Diff 分析结果
 *
 * @description
 * 综合分析两个数组的差异，并推荐最合适的 diff 策略：
 * - 'fast': 可以使用快速路径（长度相同且对应位置类型相同）
 * - 'keyed': 使用 key-based diff（全部有 key）
 * - 'unkeyed': 使用 index-based diff（全部无 key）
 * - 'full': 使用完整的 diff 算法（混合情况或复杂变化）
 */
export function analyzeDiff(c1: VNode[], c2: VNode[]): DiffAnalysis {
  const added = countNewNodes(c1, c2);
  const removed = countRemovedNodes(c1, c2);

  // 计算不变的节点数量（通过 key 匹配）
  const c1Keys = new Set(c1.map((n) => n.key).filter((k) => k != null));
  const c2Keys = new Set(c2.map((n) => n.key).filter((k) => k != null));
  let unchanged = 0;
  for (const key of c1Keys) {
    if (c2Keys.has(key)) {
      unchanged++;
    }
  }

  // 移动的节点 = 总节点数 - 新增 - 删除 - 不变
  const totalNodes = Math.max(c1.length, c2.length);
  const moved = totalNodes - added - removed - unchanged;

  // 推荐策略
  let recommendedStrategy: DiffAnalysis['recommendedStrategy'] = 'full';
  if (canUseFastDiff(c1, c2)) {
    recommendedStrategy = 'fast';
  } else if (allChildrenHaveKeys(c2)) {
    recommendedStrategy = 'keyed';
  } else if (noChildrenHaveKeys(c2)) {
    recommendedStrategy = 'unkeyed';
  }

  return {
    added,
    removed,
    unchanged,
    moved: Math.max(0, moved),
    recommendedStrategy,
  };
}
