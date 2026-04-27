## Add Lyt.js framework

### Summary

Lyt.js is a zero-dependency, lightweight frontend framework with Proxy + Signal dual reactivity system. This PR adds both keyed and non-keyed implementations to the benchmark suite.

### Key features

- Proxy + Signal dual reactivity
- Virtual DOM + Vapor Mode rendering
- 24 sub-packages, 100% TypeScript
- Zero runtime dependencies

### Implementation notes

- Uses Signal-based fine-grained updates for optimal performance
- Each row's label is managed by an independent signal, so `updateEvery10thRow` only triggers 100 signal updates instead of 1000 VNode creates
- `selectRow` only updates 2 DOM elements (old + new selection className)
- `swapRows` uses direct DOM node swapping (no VNode recreation)
- `addRow`/`removeRow` use direct DOM insertion/removal
- `runBenchmark` uses DocumentFragment for batch DOM insertion
- Both keyed and non-keyed implementations provided
- IIFE bundle size: ~34KB

### Performance data

[待填入实际 benchmark 数据]

### Files added

**Keyed implementation (`frameworks/keyed/lytjs/`):**
- `package.json` - Package configuration with build scripts
- `tsconfig.json` - TypeScript configuration
- `esbuild.mjs` - Build script using esbuild
- `index.html` - HTML entry with benchmark buttons
- `src/main.ts` - Keyed benchmark implementation (signal-based)
- `src/shared.ts` - Shared utilities (data generation, ID management)

**Non-keyed implementation (`frameworks/non-keyed/lytjs/`):**
- `package.json` - Package configuration with build scripts
- `tsconfig.json` - TypeScript configuration
- `esbuild.mjs` - Build script using esbuild
- `index.html` - HTML entry with benchmark buttons
- `src/main.ts` - Non-keyed benchmark implementation (signal-based)
- `src/shared.ts` - Shared utilities (data generation, ID management)

### Build instructions

```bash
cd frameworks/keyed/lytjs
npm install --ignore-scripts
npm run build-prod

cd ../../non-keyed/lytjs
npm install --ignore-scripts
npm run build-prod
```

### Testing

```bash
npm run bench keyed/lytjs
npm run bench non-keyed/lytjs
npm run isKeyed keyed/lytjs
```
