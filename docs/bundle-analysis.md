# Lyt.js Bundle Analysis Report

> Generated: 2026-04-28 10:32:35

---

## 1. Core Package Size Overview

| Package | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|---------|-----------|------------|-----------|------------|
| @lytjs/reactivity | 8.65 KB | 3.15 KB | 9.13 KB | 3.32 KB |
| @lytjs/vdom | 8.73 KB | 3.29 KB | 9.22 KB | 3.52 KB |
| @lytjs/compiler | 13.06 KB | 4.55 KB | 13.53 KB | 4.78 KB |
| @lytjs/renderer | 14.33 KB | 4.87 KB | 14.82 KB | 5.09 KB |
| @lytjs/component | 10.37 KB | 3.54 KB | 11.17 KB | 3.71 KB |
| @lytjs/core | 5.40 KB | 2.13 KB | 5.96 KB | 2.34 KB |
| @lytjs/router | 6.60 KB | 2.41 KB | 7.09 KB | 2.62 KB |
| @lytjs/store | 2.58 KB | 1.09 KB | 3.04 KB | 1.27 KB |
|---------|-----------|------------|-----------|------------|
| **TOTAL** | **69.72 KB** | **25.03 KB** | **73.95 KB** | **26.65 KB** |

## 2. Size Limit Compliance

| Package | Actual (ESM) | Limit | Status |
|---------|-------------|-------|--------|
| @lytjs/reactivity | 8.65 KB | 3.5 KB | FAIL |
| @lytjs/vdom | 8.73 KB | 3.5 KB | FAIL |
| @lytjs/compiler | 13.06 KB | 5 KB | FAIL |
| @lytjs/renderer | 14.33 KB | 5.5 KB | FAIL |
| @lytjs/component | 10.37 KB | 4 KB | FAIL |
| @lytjs/core | 5.40 KB | 2.5 KB | FAIL |
| @lytjs/router | 6.60 KB | 2.5 KB | FAIL |
| @lytjs/store | 2.58 KB | 1.5 KB | FAIL |

## 3. Sub-path Entry Analysis

### @lytjs/reactivity

| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|----------|-----------|------------|-----------|------------|
| reactivity/signal | 1.45 KB | 737 B | 1.89 KB | 961 B |

### @lytjs/compiler

| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|----------|-----------|------------|-----------|------------|
| compiler/sfc | - | - | - | - |
| compiler/wasm | - | - | - | - |

### @lytjs/renderer

| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|----------|-----------|------------|-----------|------------|
| renderer/dom | 14.38 KB | 4.89 KB | 14.88 KB | 5.10 KB |
| renderer/ssr | 24.25 KB | 7.35 KB | 24.81 KB | 7.54 KB |
| renderer/native | 11.62 KB | 3.94 KB | 12.09 KB | 4.16 KB |
| renderer/miniapp | 43.54 KB | 13.17 KB | 44.04 KB | 13.37 KB |
| renderer/vapor | 17.06 KB | 6.05 KB | 17.61 KB | 6.25 KB |

### @lytjs/component

| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|----------|-----------|------------|-----------|------------|
| component/builtins | - | - | - | - |

### @lytjs/core

| Sub-path | ESM (raw) | ESM (gzip) | CJS (raw) | CJS (gzip) |
|----------|-----------|------------|-----------|------------|
| core/plugin | - | - | - | - |
| core/error | - | - | - | - |
| core/web-component | - | - | - | - |
| core/shared | - | - | - | - |

## 4. Export Analysis

Main exports from each package (from source index.ts):

### @lytjs/reactivity

Exports: `effect`, `stop`, `ReactiveEffect`, `reactive`, `readonly`, `shallowReactive`, `toRaw`, `isReactive` ...

### @lytjs/vdom

Exports: `PatchFlags`, `hasPatchFlag`, `ShapeFlags`, `createVNode`, `createTextVNode`, `createCommentVNode`, `cloneVNode`, `isSameVNodeType` ...

### @lytjs/compiler

Exports: `compile`, `parseHTML`, `transform`, `CompilerPatchFlags`, `generate`

### @lytjs/renderer

Exports: `createRenderer`, `Fragment`, `Text`, `Comment`, `ShapeFlags`, `PatchFlags`, `DOMRenderer`, `domRenderer` ...

### @lytjs/component

Exports: `defineComponent`, `defineFunctionalComponent`, `createComponentInstance`, `setupComponent`, `setupStatefulComponent`, `setupFunctionComponent`, `mountComponent`, `updateComponent` ...

### @lytjs/core

Exports: `createApp`, `h`, `Fragment`, `ShapeFlags`

### @lytjs/router

Exports: `createRouter`, `createRouteMatcher`, `createWebHistory`, `createHashHistory`, `createNavigationGuards`, `runGuards`, `runAfterGuards`

### @lytjs/store

Exports: `createStore`, `getStore`, `getStoreIds`, `clearAllStores`

## 5. Optimization Notes

- Tree-shaking is enabled via esbuild `--tree-shaking=true`
- All packages use `--external:@lytjs/*` to avoid bundling cross-package dependencies
- Sub-path entries (e.g., `@lytjs/renderer/dom`) are built separately to enable fine-grained imports
- `console` and `debugger` statements are dropped in production builds
