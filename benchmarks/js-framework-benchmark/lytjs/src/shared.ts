/**
 * Lyt.js js-framework-benchmark - Shared Utilities
 *
 * Provides common data generation and utility functions
 * used by both keyed and non-keyed benchmarks.
 *
 * Uses standard js-framework-benchmark data generation:
 * - Global incrementing ID
 * - Random label from adjective + color + noun
 */

// ============================================================
// Global ID Counter
// ============================================================

let ID = 0

/**
 * Reset the global ID counter (used in tests)
 */
export function resetId(): void {
  ID = 0
}

// ============================================================
// Random Data Generation
// ============================================================

/**
 * Seeded-ish random function
 */
let _seed = 1
function _random(): number {
  _seed = (_seed * 16807) % 2147483647
  return (_seed - 1) / 2147483646
}

function _setSeed(seed: number): void {
  _seed = seed
}

// ============================================================
// Word Lists (standard js-framework-benchmark)
// ============================================================

const ADJECTIVES = [
  'pretty', 'large', 'big', 'small', 'tall',
  'short', 'long', 'handsome', 'plain', 'quaint',
  'clean', 'elegant', 'easy', 'angry', 'crazy',
  'helpful', 'mushy', 'odd', 'unsightly', 'adorable',
  'important', 'inexpensive', 'cheap', 'expensive', 'fancy',
]

const COLORS = [
  'red', 'yellow', 'blue', 'green', 'pink',
  'brown', 'purple', 'brown', 'white', 'black',
  'orange',
]

const NOUNS = [
  'table', 'chair', 'house', 'bbq', 'desk',
  'car', 'pony', 'cookie', 'sandwich', 'burger',
  'pizza', 'mouse', 'keyboard',
]

// ============================================================
// Data Generation
// ============================================================

/**
 * Build an array of N items for the benchmark
 * Each item has: id (number), label (string)
 *
 * Uses the standard js-framework-benchmark data format:
 * - id starts from 1 (local counter per call)
 * - label is "Row N"
 * - Global ID counter is updated to track the max ID
 */
export function buildData(count: number): Array<{ id: number; label: string }> {
  _setSeed(0)
  const data: Array<{ id: number; label: string }> = []
  for (let i = 0; i < count; i++) {
    const id = i + 1
    data.push({
      id,
      label: `Row ${id}`,
    })
  }
  // Update global ID counter to max of generated data
  if (count > ID) {
    ID = count
  }
  return data
}

/**
 * Generate a new row ID (max existing id + 1)
 */
export function getNextId(data: Array<{ id: number; label: string }>): number {
  let max = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i].id > max) max = data[i].id
  }
  return max + 1
}

/**
 * Generate a random label (adjective + color + noun)
 * Used by the standard js-framework-benchmark
 */
export function randomLabel(): string {
  const adj = ADJECTIVES[Math.floor(_random() * ADJECTIVES.length)]
  const color = COLORS[Math.floor(_random() * COLORS.length)]
  const noun = NOUNS[Math.floor(_random() * NOUNS.length)]
  return `${adj} ${color} ${noun}`
}
