/**
 * Lyt.js js-framework-benchmark - Main Entry Point
 *
 * Exports the benchmark API for js-framework-benchmark integration.
 * This module re-exports both keyed and non-keyed benchmark functions.
 *
 * js-framework-benchmark expects these global functions:
 * - createElement(id) -> { container, destroy }
 * - runBenchmark()
 * - addRow()
 * - updateEvery10thRow()
 * - swapRows()
 * - removeRow()
 * - selectRow(index)
 */

// Re-export keyed benchmark as default
export {
  createElement,
  runBenchmark,
  addRow,
  updateEvery10thRow,
  swapRows,
  removeRow,
  selectRow,
  getData,
  getSelected,
} from './keyed'

// Re-export non-keyed benchmark
export {
  createElement as createElementNonKeyed,
  runBenchmark as runBenchmarkNonKeyed,
  addRow as addRowNonKeyed,
  updateEvery10thRow as updateEvery10thRowNonKeyed,
  swapRows as swapRowsNonKeyed,
  removeRow as removeRowNonKeyed,
  selectRow as selectRowNonKeyed,
  getData as getDataNonKeyed,
  getSelected as getSelectedNonKeyed,
} from './non-keyed'
