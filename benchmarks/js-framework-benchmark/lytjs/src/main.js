/**
 * Lyt.js js-framework-benchmark - 应用入口
 *
 * 实现 keyed 和 non-keyed 列表渲染 benchmark。
 * 导出标准 js-framework-benchmark API 到 window 对象。
 *
 * 操作：
 * - run(): 创建 1000 行
 * - runLots(): 创建 10000 行
 * - add(): 追加 1000 行
 * - update(): 每 10 行更新一次
 * - clear(): 清空所有行
 * - swapRows(): 交换第 2 行和倒数第 2 行
 * - remove(id): 删除指定行
 * - select(id): 选中指定行
 */

import { nextTick } from '../../../../packages/reactivity/src/index.ts'
import { state } from './store.js'
import { buildData } from './utils.js'

// ============================================================
// 操作函数
// ============================================================

/**
 * 创建 1000 行数据
 */
function run() {
  state.runStarted = true
  state.runFinished = false
  state.rows = []
  state.selected = undefined
  state.runCount++

  setTimeout(() => {
    const start = performance.now()
    state.rows = buildData()
    nextTick(() => {
      state.lastTime = performance.now() - start
      state.runFinished = true
      state.runStarted = false
    })
  }, 0)
}

/**
 * 创建 10000 行数据
 */
function runLots() {
  state.runStarted = true
  state.runFinished = false
  state.rows = []
  state.selected = undefined
  state.runCount++

  setTimeout(() => {
    const start = performance.now()
    state.rows = buildData(10000)
    nextTick(() => {
      state.lastTime = performance.now() - start
      state.runFinished = true
      state.runStarted = false
    })
  }, 0)
}

/**
 * 追加 1000 行
 */
function add() {
  state.rows = state.rows.concat(buildData(1000))
}

/**
 * 每 10 行更新一次（label += ' !!!'）
 */
function update() {
  const tmp = state.rows
  for (let i = 0; i < tmp.length; i += 10) {
    tmp[i].label += ' !!!'
  }
}

/**
 * 清空所有行
 */
function clear() {
  state.rows = []
  state.selected = undefined
}

/**
 * 交换第 2 行和倒数第 2 行
 */
function swapRows() {
  if (state.rows.length > 998) {
    const tmp = state.rows
    const a = tmp[1]
    tmp[1] = tmp[998]
    tmp[998] = a
  }
}

/**
 * 删除指定行
 * @param {number} id - 行 ID
 */
function remove(id) {
  state.rows = state.rows.filter((row) => row.id !== id)
}

/**
 * 选中指定行
 * @param {number} id - 行 ID
 */
function select(id) {
  state.selected = id
}

// ============================================================
// 导出给 benchmark runner
// ============================================================

window.run = run
window.runLots = runLots
window.add = add
window.update = update
window.clear = clear
window.swapRows = swapRows
window.remove = remove
window.select = select
