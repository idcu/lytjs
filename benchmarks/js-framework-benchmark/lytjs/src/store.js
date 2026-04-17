/**
 * Lyt.js js-framework-benchmark - 状态管理
 *
 * 使用 Lyt.js reactive 系统管理 benchmark 的全局状态。
 */

import { reactive, computed } from '../../../../packages/reactivity/src/index.ts'

// ============================================================
// 全局状态
// ============================================================

export const state = reactive({
  rows: [],
  selected: undefined,
  runCount: 0,
  runStarted: false,
  runFinished: false,
  lastTime: 0,
})

// ============================================================
// 计算属性
// ============================================================

export const rowCount = computed(() => state.rows.length)

export const selectedRow = computed(() => {
  if (state.selected === undefined) return null
  return state.rows.find((row) => row.id === state.selected) || null
})
