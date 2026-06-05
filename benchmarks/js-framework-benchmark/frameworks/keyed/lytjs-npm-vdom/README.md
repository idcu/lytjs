# LytJS - VDOM Mode (npm package)

This is the VDOM (Virtual DOM) mode implementation of LytJS for the js-framework-benchmark, using npm packages.

## How to use

### 1. Build LytJS packages (if not already built)

```bash
cd ../../../../..
pnpm run build
```

### 2. Install dependencies

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs-npm-vdom
pnpm install
```

### 3. Run the dev server

```bash
pnpm run dev
```

Or start a simple HTTP server:
```bash
python -m http.server 8080
```

Then open your browser and navigate to `http://localhost:8080`.

## About this implementation

This implementation uses the `@lytjs/core-vnode` package, which provides the traditional virtual DOM rendering mode similar to React, Vue 3, and Preact.

## LytJS Features

- **Zero external dependencies** - core runtime is completely self-contained
- **Virtual DOM rendering** - traditional diff-based rendering for compatibility
- **TypeScript ready** - full type support
- **Small bundle size** - minimal runtime overhead
