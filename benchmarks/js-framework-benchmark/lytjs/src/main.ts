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

// Re-export keyed signal benchmark as default (optimized with fine-grained signals)
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
} from './keyed-signal'

// Re-export non-keyed signal benchmark (optimized with fine-grained signals)
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
} from './non-keyed-signal'

// Keep original VDOM-based implementations available for comparison
export {
  createElement as createElementVdom,
  runBenchmark as runBenchmarkVdom,
  addRow as addRowVdom,
  updateEvery10thRow as updateEvery10thRowVdom,
  swapRows as swapRowsVdom,
  removeRow as removeRowVdom,
  selectRow as selectRowVdom,
  getData as getDataVdom,
  getSelected as getSelectedVdom,
} from './keyed'

export {
  createElement as createElementNonKeyedVdom,
  runBenchmark as runBenchmarkNonKeyedVdom,
  addRow as addRowNonKeyedVdom,
  updateEvery10thRow as updateEvery10thRowNonKeyedVdom,
  swapRows as swapRowsNonKeyedVdom,
  removeRow as removeRowNonKeyedVdom,
  selectRow as selectRowNonKeyedVdom,
  getData as getDataNonKeyedVdom,
  getSelected as getSelectedNonKeyedVdom,
} from './non-keyed'
