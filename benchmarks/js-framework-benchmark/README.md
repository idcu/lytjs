# Lyt.js js-framework-benchmark Integration

This directory contains the integration of Lyt.js with [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), a benchmark suite for comparing JavaScript frontend framework performance.

## Directory Structure

```
benchmarks/js-framework-benchmark/
├── README.md                    # This file
├── package.json                 # Benchmark-specific config
├── build.sh                     # Build script
├── lyt/
│   ├── dist/
│   │   └── js-framework-benchmark.js   # Self-contained IIFE bundle
│   └── src/
│       ├── main.js              # Entry point
│       ├── keyed.js             # Keyed list benchmark
│       ├── non-keyed.js         # Non-keyed list benchmark
│       └── shared.js            # Shared utilities
└── test/
    └── benchmark.test.ts        # Test suite
```

## Running the Benchmark

### Build

```bash
cd benchmarks/js-framework-benchmark
bash build.sh
```

### Run Tests

```bash
cd ../..
npx tsx test-runner.ts
```

## Benchmark API

The benchmark exposes the following operations:

### Keyed Benchmark

| Function | Description |
|---|---|
| `createElement(id)` | Create app instance in container |
| `runBenchmark()` | Build 1000 rows |
| `addRow()` | Add one row at bottom |
| `updateEvery10thRow()` | Update every 10th row label |
| `swapRows()` | Swap row 1 and row 2 |
| `removeRow()` | Remove last row |
| `selectRow(index)` | Select row at index |

### Non-Keyed Benchmark

Same operations with `NonKeyed` suffix:
- `createElementNonKeyed(id)`
- `runBenchmarkNonKeyed()`
- `addRowNonKeyed()`
- `updateEvery10thRowNonKeyed()`
- `swapRowsNonKeyed()`
- `removeRowNonKeyed()`
- `selectRowNonKeyed(index)`

## IIFE Bundle

The self-contained bundle at `lyt/dist/js-framework-benchmark.js` exposes the API via `window.LytBenchmark` for browser usage. It includes:

- Minimal VNode creation (h function)
- Minimal DOM renderer
- Keyed and non-keyed benchmark implementations
- Zero external dependencies

## Integration with js-framework-benchmark

To integrate with the official benchmark suite:

1. Copy the `lyt/` directory to `frameworks/lyt/` in the benchmark repo
2. Update `frameworks/lyt/index.html` to load the IIFE bundle
3. Implement the required lifecycle hooks in `frameworks/lyt/index.js`
