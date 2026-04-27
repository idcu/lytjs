# Lyt.js js-framework-benchmark Integration

This directory contains the integration of Lyt.js with [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), a benchmark suite for comparing JavaScript frontend framework performance.

## Directory Structure

```
benchmarks/js-framework-benchmark/
├── README.md                    # This file
├── package.json                 # Benchmark-specific config
├── build.sh                     # Build validation script
├── build-benchmark-bundle.js    # IIFE bundle builder (legacy)
├── pr-preparation/              # PR submission preparation files
│   ├── README.md                # PR submission guide
│   ├── file-placement.md        # File placement instructions
│   ├── pr-description.md        # PR description template
│   └── prepare-pr.sh            # Automated PR preparation script
├── lytjs/
│   ├── package.json             # Package config with js-framework-benchmark metadata
│   ├── tsconfig.json            # TypeScript configuration
│   ├── esbuild.mjs              # Build script (esbuild)
│   ├── index.html               # HTML entry (uses bootstrap CSS)
│   ├── dist/
│   │   └── main.js              # Built output (ESM)
│   └── src/
│       ├── main.ts              # Entry point with button bindings
│       ├── keyed-signal.ts      # Keyed benchmark (signal-based)
│       ├── non-keyed-signal.ts  # Non-keyed benchmark (signal-based)
│       ├── keyed.ts             # Keyed benchmark (VDOM-based, legacy)
│       ├── non-keyed.ts         # Non-keyed benchmark (VDOM-based, legacy)
│       └── shared.ts            # Shared utilities
└── test/
    └── benchmark.test.ts        # Test suite
```

## Running the Benchmark

### Build

```bash
cd benchmarks/js-framework-benchmark/lytjs
npm install --ignore-scripts
npm run build-prod
```

### Run Tests

```bash
cd benchmarks/js-framework-benchmark
npm test
```

## Benchmark API

The benchmark exposes the following operations:

### Keyed Benchmark (Signal-based)

| Function | Description |
|---|---|
| `createElement(id)` | Create app instance in container |
| `runBenchmark(count?)` | Build rows (default: 1000) |
| `addRow()` | Add one row at bottom |
| `updateEvery10thRow()` | Update every 10th row label |
| `swapRows()` | Swap row 1 and row 2 |
| `removeRow()` | Remove last row |
| `selectRow(index)` | Select row at index |

### Non-Keyed Benchmark (Signal-based)

Same operations available in `non-keyed-signal.ts`.

## Key Optimizations

The signal-based implementations use fine-grained reactivity for optimal performance:

1. **Each row's label is managed by an independent signal** - `updateEvery10thRow` only triggers 100 signal updates (not 1000 VNode creates)
2. **`selectRow` only updates 2 DOM elements** - old + new selection className
3. **`swapRows` uses direct DOM node swapping** - no VNode recreation
4. **`addRow`/`removeRow` use direct DOM insertion/removal**
5. **`runBenchmark` uses DocumentFragment** for batch DOM insertion
6. **`batch()` coalesces signal notifications** for `updateEvery10thRow`

## Integration with js-framework-benchmark

To submit Lyt.js to the official benchmark suite, see `pr-preparation/README.md` for detailed instructions.

## Compliance Checklist

- [x] Button IDs match benchmark requirements (`run`, `runlots`, `add`, `update`, `clear`, `swaprows`)
- [x] Table body has `id="main"`
- [x] Uses bootstrap CSS from `../../css/bootstrap.min.css`
- [x] `npm run build-prod` creates `dist/main.js`
- [x] Supports `npm install --ignore-scripts`
- [x] `package.json` contains `js-framework-benchmark` metadata
- [x] `runlots` creates 10,000 rows
- [x] `clear` clears all rows
- [x] Keyed implementation maintains 1:1 data-DOM mapping
- [x] Non-keyed implementation allows data-DOM reordering
