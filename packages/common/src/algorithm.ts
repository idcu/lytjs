/**
 * Lyt.js 通用算法工具
 *
 * 提供各种算法函数，包括最长递增子序列等。
 * 纯原生零依赖 TypeScript 实现。
 */

/**
 * 求最长递增子序列（Longest Increasing Subsequence）
 *
 * 使用 O(n log n) 的贪心 + 二分查找算法。
 * 返回的是索引数组，表示原数组中哪些元素构成了最长递增子序列。
 *
 * 算法思路：
 *   1. 维护一个 tails 数组，tails[i] 表示长度为 i+1 的递增子序列的最小末尾元素索引
 *   2. 对每个元素，用二分查找在 tails 中找到合适的位置
 *   3. 最后通过 parent 指针回溯得到完整的子序列
 *
 * @param arr 输入数组（元素为正整数，0 表示"不存在"）
 * @returns 最长递增子序列的索引数组
 */
export function getSequence(arr: ArrayLike<number>): number[] {
  const len = arr.length;
  if (len === 0) return [];

  // tails[i] = 长度为 i+1 的递增子序列的最小末尾元素在 arr 中的索引
  const tails: number[] = [];
  // parent[i] = arr[i] 在 tails 中的前驱索引
  const parent: number[] = new Array(len).fill(-1);

  for (let i = 0; i < len; i++) {
    const val = arr[i];

    // 跳过 0 值（表示该位置需要创建新节点，不参与 LIS）
    if (val === 0) continue;

    // 二分查找：在 tails 中找到第一个 >= val 的位置
    let left = 0;
    let right = tails.length;

    while (left < right) {
      const mid = (left + right) >> 1;
      if (arr[tails[mid]] < val) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // left 就是 val 应该放置的位置
    if (left > 0) {
      parent[i] = tails[left - 1];
    }

    if (left === tails.length) {
      // val 比所有 tails 元素都大，扩展子序列
      tails.push(i);
    } else {
      // val 可以替换 tails[left]，使子序列更有潜力
      tails[left] = i;
    }
  }

  // 通过 parent 指针回溯，重建最长递增子序列
  const result: number[] = [];
  if (tails.length === 0) return result;
  let current = tails[tails.length - 1];

  while (current !== -1) {
    result.push(current);
    current = parent[current];
  }

  // 回溯结果是逆序的，需要反转
  result.reverse();

  return result;
}
