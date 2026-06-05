# LytJS - Vapor Mode (npm package)

This is the Vapor mode implementation of LytJS for the js-framework-benchmark, using npm packages.

## How to use

### 1. Build LytJS packages (if not already built)

```bash
cd ../../../../..
pnpm run build
```

### 2. Install dependencies

```bash
cd benchmarks/js-framework-benchmark/frameworks/keyed/lytjs-npm-vapor
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

This implementation uses the `@lytjs/core-signal` package in Vapor mode, which provides direct DOM manipulation without virtual DOM overhead.

## LytJS Features

- **Zero external dependencies** - core runtime is completely self-contained
- **Vapor mode** - no virtual DOM, direct DOM updates
- **TypeScript ready** - full type support
- **Small bundle size** - minimal runtime overhead
