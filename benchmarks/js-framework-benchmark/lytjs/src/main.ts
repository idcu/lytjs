/**
 * Lyt.js js-framework-benchmark - Main Entry Point (Keyed)
 *
 * This is the entry point for the keyed benchmark implementation.
 * It imports the benchmark API and sets up button event listeners.
 *
 * js-framework-benchmark expects these exports:
 * - createElement(id) -> { container, destroy }
 * - runBenchmark()
 * - addRow()
 * - updateEvery10thRow()
 * - swapRows()
 * - removeRow()
 * - selectRow(index)
 */

import {
  createElement,
  runBenchmark,
  addRow,
  updateEvery10thRow,
  swapRows,
  removeRow,
  selectRow,
} from './keyed-signal'

// Re-export for WebDriver testing
export {
  createElement,
  runBenchmark,
  addRow,
  updateEvery10thRow,
  swapRows,
  removeRow,
  selectRow,
}

// ============================================================
// Button Event Listeners
// ============================================================

// Create the benchmark instance
createElement('main');

// Create 1,000 rows
document.getElementById('run').addEventListener('click', () => {
  runBenchmark();
});

// Create 10,000 rows
document.getElementById('runlots').addEventListener('click', () => {
  runBenchmark(10000);
});

// Append 1,000 rows
document.getElementById('add').addEventListener('click', () => {
  addRow();
});

// Update every 10th row
document.getElementById('update').addEventListener('click', () => {
  updateEvery10thRow();
});

// Clear all rows
document.getElementById('clear').addEventListener('click', () => {
  // Clear: remove all rows by destroying and recreating the element
  const result = createElement('main');
  result.container.innerHTML = '';
});

// Swap rows
document.getElementById('swaprows').addEventListener('click', () => {
  swapRows();
});
