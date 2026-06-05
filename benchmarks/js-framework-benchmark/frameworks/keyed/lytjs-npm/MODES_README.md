# LytJS npm Package Modes - Complete Implementation

This directory contains three separate implementations of LytJS using npm packages, each with its own directory ready for PR submission to js-framework-benchmark.

## Directory Structure

```
keyed/
├── lytjs-npm-vdom/     # Virtual DOM mode
├── lytjs-npm-signal/   # Signal reactivity mode
├── lytjs-npm-vapor/    # Vapor mode (direct DOM)
└── lytjs-npm/          # Original combined implementation
```

## Each Mode Contains

Every mode directory has:

1. `index.html` - The main implementation file with the complete benchmark
2. `package.json` - Configured with npm package dependencies (^6.9.0)
3. `README.md` - Basic usage instructions
4. `vite.config.js` - Vite configuration for local development
5. `PR_PREPARATION_GUIDE.md` - Detailed guide for submitting to js-framework-benchmark

## Mode Descriptions

### 1. lytjs-npm-vdom

- **Package**: `@lytjs/core-vnode`
- **Mode**: Traditional Virtual DOM
- **Features**: Diff-based rendering, similar to React/Vue
- **Use Case**: Best for compatibility and familiar development experience

### 2. lytjs-npm-signal

- **Package**: `@lytjs/core-signal`
- **Mode**: Fine-grained Signal reactivity
- **Features**: Signal-based updates, similar to SolidJS
- **Use Case**: Optimal for fine-grained reactivity

### 3. lytjs-npm-vapor

- **Package**: `@lytjs/core-signal`
- **Mode**: Vapor mode (direct DOM)
- **Features**: Direct DOM manipulation without Virtual DOM
- **Use Case**: Best for performance, similar to Vue Vapor

## Using the Implementations

### For Local Testing

1. Navigate to any mode directory
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev` or `python -m http.server 8080`
4. Open http://localhost:8080

### For PR Submission

Each mode has its own `PR_PREPARATION_GUIDE.md` with detailed instructions.

Quick steps:
1. Fork js-framework-benchmark
2. Copy one mode directory to `frameworks/keyed/`
3. Commit and push
4. Create PR

## Version Information

All implementations use LytJS npm packages at version `^6.9.0` to ensure compatibility with the latest patch releases.

## Common Dependencies

All modes share these core dependencies:
- `@lytjs/core-signal` or `@lytjs/core-vnode`
- `@lytjs/reactivity`
- `@lytjs/component`
- `@lytjs/renderer`
- And other supporting packages

## Notes

- All implementations follow the js-framework-benchmark standard structure
- The Bootstrap 3.4.1 CSS is loaded from CDN
- All benchmark functionality is implemented
- PR guides provide step-by-step submission instructions
