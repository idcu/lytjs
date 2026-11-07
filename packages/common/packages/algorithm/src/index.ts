/**
 * @lytjs/common-algorithm
 * 算法工具 - 最长递增子序列（LIS）
 */

/**
 * 求最长递增子序列（Longest Increasing Subsequence）
 * 返回的是原数组中构成 LIS 的元素索引数组
 *
 * 算法： patience sorting + binary search
 * 时间复杂度：O(n log n)
 *
 * @param arr - 输入数组
 * @returns 构成 LIS 的索引数组
 */
export function getSequence<T extends string | number>(arr: Array<T>): number[] {
  const len = arr.length;
  if (len === 0) return [];

  // tails[i] 存储长度为 i+1 的 LIS 的最小末尾值的索引
  const tails: number[] = [];
  // parent[i] 存储 arr[i] 在 LIS 中的前驱索引
  const parent: number[] = new Array(len).fill(-1);

  for (let i = 0; i < len; i++) {
    const val = arr[i]!;

    // 二分查找：找到 tails 中第一个 >= val 的位置
    let left = 0;
    let right = tails.length;

    while (left < right) {
      const mid = (left + right) >>> 1;
      if (arr[tails[mid]!]! < val) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // left 就是 val 应该放置的位置
    if (left > 0) {
      parent[i] = tails[left - 1]!;
    }

    if (left === tails.length) {
      tails.push(i);
    } else {
      tails[left] = i;
    }
  }

  // 回溯构建 LIS 的索引序列
  const result: number[] = [];
  let current = tails[tails.length - 1]!;
  while (current !== -1) {
    result.push(current);
    current = parent[current]!;
  }

  return result.reverse();
}

// ============================================================
// Keyed List Diff — 单一权威（ADR 0019）
// ============================================================

/**
 * 一次 keyed 列表 diff 的纯计算结果。
 *
 * 本函数只做「旧序列 ↔ 新序列」的配对与最小移动计划，**不触碰任何节点**：
 * · `@lytjs/vdom` 把计划应用到 vnode（patch / unmount / move）；
 * · `@lytjs/dom-runtime` 把计划应用到 signal 路径的 DOM 节点。
 *
 * 两条路径的输入模型不同，但「key 匹配规则 + LIS 最小移动」只有这一份实现。
 */
export interface KeyedDiffPlan {
  /** 旧序列索引 → 新序列索引；`undefined` 表示未匹配（应卸载） */
  oldMatches: Array<number | undefined>;
  /** 新序列索引 → 旧序列索引 + 1；`0` 表示新增（应挂载） */
  newIndexToOldIndex: number[];
  /** 需要移动的新序列索引集合（仅在 `moved` 为 true 时有意义） */
  movedNewIndexes: Set<number>;
  /** 是否存在逆序匹配（决定是否需要移动） */
  moved: boolean;
}

/** `planKeyedDiff` 的输入。索引均相对于传入的序列（调用方可自行偏移）。 */
export interface KeyedDiffInput {
  /** 旧序列长度 */
  oldCount: number;
  /** 新序列长度 */
  newCount: number;
  /** 取旧序列第 index 项的 key */
  getOldKey: (index: number) => unknown;
  /** 取新序列第 index 项的 key */
  getNewKey: (index: number) => unknown;
  /** 取旧序列第 index 项的类型键（与 `getNewTypeKey` 配对时启用无 key 匹配） */
  getOldTypeKey?: (index: number) => string;
  /** 取新序列第 index 项的类型键 */
  getNewTypeKey?: (index: number) => string;
  /** 无 key 节点的额外兼容判据（默认同类型键即可匹配） */
  isCompatible?: (oldIndex: number, newIndex: number) => boolean;
}

/**
 * 计算 keyed 列表 diff 的配对与移动计划。
 *
 * 语义与 `@lytjs/vdom` 的 `patchKeyedChildren` 第 5 步一致：
 * 1. 有 key 的旧节点按 key 在新序列中查找；
 * 2. 无 key 的旧节点按类型键查找（仅当双方都提供类型键）；
 * 3. 未匹配的旧节点标记为卸载；
 * 4. 发生逆序时用 LIS 求出「无需移动」的新索引，其余匹配项需要移动。
 *
 * 注意：key 重复属于非法输入（vdom 侧在 DEV 会告警）。本函数对重复 key
 * 采用「后写覆盖」的查找表语义，与 vdom 保持一致。
 */
export function planKeyedDiff(input: KeyedDiffInput): KeyedDiffPlan {
  const { oldCount, newCount, getOldKey, getNewKey } = input;
  const oldMatches = new Array<number | undefined>(oldCount);
  const newIndexToOldIndex = new Array<number>(newCount).fill(0);

  // 新序列 key → 索引
  const newKeyToIndexMap = new Map<unknown, number>();
  for (let j = 0; j < newCount; j++) {
    const key = getNewKey(j);
    if (key !== null && key !== undefined) {
      newKeyToIndexMap.set(key, j);
    }
  }

  // 新序列「无 key 节点」按类型分组（O(1) 查找，避免 O(n²)）
  let newTypeMap: Map<string, number[]> | undefined;
  if (input.getOldTypeKey && input.getNewTypeKey) {
    newTypeMap = new Map<string, number[]>();
    for (let j = 0; j < newCount; j++) {
      if (!getNewKey(j)) {
        const typeKey = input.getNewTypeKey(j);
        let bucket = newTypeMap.get(typeKey);
        if (!bucket) {
          bucket = [];
          newTypeMap.set(typeKey, bucket);
        }
        bucket.push(j);
      }
    }
  }

  let patched = 0;
  let moved = false;
  let maxNewIndexSoFar = 0;

  for (let i = 0; i < oldCount; i++) {
    if (patched >= newCount) {
      oldMatches[i] = undefined;
      continue;
    }

    const oldKey = getOldKey(i);
    let newIndex: number | undefined;

    if (oldKey !== null && oldKey !== undefined) {
      newIndex = newKeyToIndexMap.get(oldKey);
    } else if (newTypeMap && input.getOldTypeKey) {
      const candidates = newTypeMap.get(input.getOldTypeKey(i));
      if (candidates) {
        for (const candidate of candidates) {
          if (
            newIndexToOldIndex[candidate] === 0 &&
            (input.isCompatible ? input.isCompatible(i, candidate) : true)
          ) {
            newIndex = candidate;
            break;
          }
        }
      }
    }

    if (newIndex === undefined) {
      oldMatches[i] = undefined;
      continue;
    }

    oldMatches[i] = newIndex;
    newIndexToOldIndex[newIndex] = i + 1;
    if (newIndex >= maxNewIndexSoFar) {
      maxNewIndexSoFar = newIndex;
    } else {
      moved = true;
    }
    patched++;
  }

  const movedNewIndexes = new Set<number>();
  if (moved) {
    // 与 vdom 一致：对含 0（新增）的数组求 LIS；新增项在应用阶段优先走挂载分支，
    // 因此 LIS 中的 0 不会导致误判。
    const increasing = new Set(getSequence(newIndexToOldIndex));
    for (let j = newCount - 1; j >= 0; j--) {
      if (newIndexToOldIndex[j] !== 0 && !increasing.has(j)) {
        movedNewIndexes.add(j);
      }
    }
  }

  return { oldMatches, newIndexToOldIndex, movedNewIndexes, moved };
}
