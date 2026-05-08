# @lytjs/plugin-vite API Reference

## Installation

```bash
pnpm add -D @lytjs/plugin-vite
```

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
});
```

## Options

```typescript
interface LytjsPluginOptions {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  ssr?: boolean;
  signalMode?: boolean;
}
```

### include

Files to include for transformation. Default: `/\.lyt$/`

### exclude

Files to exclude. Default: `/node_modules/`

### ssr

Enable SSR mode. Default: `false`

### signalMode

Enable signal mode compilation. Default: `false`

## Features

### SFC Compilation

Compiles `.lyt` single-file components:

- `<template>` - Component template
- `<script setup>` - Composition API script
- `<style scoped>` - Scoped styles

### Hot Module Replacement (HMR)

Automatic HMR for `.lyt` files:

- Template changes: Component-level HMR
- Script changes: Full page reload
- Style changes: CSS HMR

### Scoped Styles

Scoped CSS with unique `__scopeId`:

```html
<style scoped>
  .button {
    color: red;
  }
</style>
```

### Custom Blocks

#### `<route>` Block

Define route configuration in component:

```html
<route> { "path": "/users/:id", "name": "user-detail" } </route>
```

Import route config:

```typescript
import routeConfig from './UserDetail.lyt.route';
```
