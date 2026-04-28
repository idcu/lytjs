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
export function getSequence(arr: number[]): number[] {
  const len = arr.length
  if (len === 0) return []

  // tails[i] 存储长度为 i+1 的 LIS 的最小末尾值的索引
  const tails: number[] = []
  // parent[i] 存储 arr[i] 在 LIS 中的前驱索引
  const parent: number[] = new Array(len).fill(-1)

  for (let i = 0; i < len; i++) {
    const val = arr[i]!

    // 二分查找：找到 tails 中第一个 >= val 的位置
    let left = 0
    let right = tails.length

    while (left < right) {
      const mid = (left + right) >>> 1
      if (arr[tails[mid]!]! < val) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    // left 就是 val 应该放置的位置
    if (left > 0) {
      parent[i] = tails[left - 1]!
    }

    if (left === tails.length) {
      tails.push(i)
    } else {
      tails[left] = i
    }
  }

  // 回溯构建 LIS 的索引序列
  const result: number[] = []
  let current = tails[tails.length - 1]!
  while (current !== -1) {
    result.push(current)
    current = parent[current]!
  }

  return result.reverse()
}
