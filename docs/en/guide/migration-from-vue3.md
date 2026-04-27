# Migration from Vue 3

Lyt.js provides a highly compatible Vue 3 API, making migration straightforward and low-cost. This guide helps you quickly migrate your Vue 3 project to Lyt.js.

## Migration Overview

The migration process involves three main steps:

1. **Replace imports** — Change `vue` imports to `@lytjs/core`
2. **Update template syntax** — Adjust directives (e.g., `v-if` to `if`)
3. **Replace ecosystem packages** — Switch Vue Router to `@lytjs/router`, Pinia to `@lytjs/store`

Most of your existing Vue 3 code will work without modification.

---

## API Compatibility Reference

| Vue 3 API | Lyt.js | Compatibility |
|-----------|--------|---------------|
| `createApp()` | `createApp()` | ✅ Fully compatible |
| `defineComponent()` | `defineComponent()` | ✅ Fully compatible |
| `ref()` | `ref()` | ✅ Fully compatible |
| `reactive()` | `reactive()` | ✅ Fully compatible |
| `computed()` | `computed()` | ✅ Fully compatible |
| `watch()` | `watch()` | ✅ Fully compatible |
| `watchEffect()` | `watchEffect()` | ✅ Fully compatible |
| `onMounted()` | `onMounted()` | ✅ Fully compatible |
| `onBeforeUnmount()` | `onBeforeUnmount()` | ✅ Fully compatible |
| `provide()` / `inject()` | `provide()` / `inject()` | ✅ Fully compatible |
| `nextTick()` | `nextTick()` | ✅ Fully compatible |
| `h()` | `h()` | ✅ Fully compatible |
| `v-if` | `if` | ⚠️ Remove `v-` prefix |
| `v-for` | `each` | ⚠️ Remove `v-` prefix |
| `v-model` | `model` | ⚠️ Remove `v-` prefix |
| `v-show` | `show` | ⚠️ Remove `v-` prefix |
| `v-on` | `on:` | ⚠️ Syntax change |
| `v-bind` | `:` | ✅ Syntax identical |
| `v-slot` | `slot` | ⚠️ Syntax change |
| `v-html` | `html` | ⚠️ Remove `v-` prefix |
| `v-text` | `text` | ⚠️ Remove `v-` prefix |
| `v-once` | `once` | ⚠️ Remove `v-` prefix |
| `v-pre` | `pre` | ⚠️ Remove `v-` prefix |
| `v-cloak` | `cloak` | ⚠️ Remove `v-` prefix |
| Vue Router | `@lytjs/router` | ⚠️ Similar API |
| Pinia | `@lytjs/store` | ⚠️ Similar API |
| `<Transition>` | `<Transition>` | ✅ Fully compatible |
| `<KeepAlive>` | `<KeepAlive>` | ✅ Fully compatible |
| `<Suspense>` | `<Suspense>` | ✅ Fully compatible |

---

## Template Syntax Differences

### Conditional Rendering

```html
<!-- Vue 3 -->
<div v-if="show">Content</div>
<div v-else-if="loading">Loading...</div>
<div v-else>Hidden</div>

<!-- Lyt.js -->
<div if="show">Content</div>
<div else-if="loading">Loading...</div>
<div else>Hidden</div>
```

### List Rendering

```html
<!-- Vue 3 -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>

<!-- Lyt.js -->
<li each="item in items" :key="item.id">{{ item.name }}</li>
```

### Two-Way Binding

```html
<!-- Vue 3 -->
<input v-model="text" />
<input v-model:text="text" />
<input v-model:number="count" />

<!-- Lyt.js -->
<input model="text" />
<input model:text="text" />
<input model:number="count" />
```

### Event Handling

```html
<!-- Vue 3 -->
<button v-on:click="handleClick">Click</button>
<button @click="handleClick">Click</button>
<button @click.prevent="handleSubmit">Submit</button>

<!-- Lyt.js -->
<button on:click="handleClick">Click</button>
<button @click="handleClick">Click</button>
<button @click.prevent="handleSubmit">Submit</button>
```

### Attribute Binding

```html
<!-- Vue 3 -->
<img v-bind:src="imageUrl" />
<img :src="imageUrl" />
<div v-bind:class="{ active: isActive }"></div>
<div :class="{ active: isActive }"></div>

<!-- Lyt.js -->
<img :src="imageUrl" />
<img :src="imageUrl" />
<div :class="{ active: isActive }"></div>
<div :class="{ active: isActive }"></div>
```

### Slots

```html
<!-- Vue 3 -->
<template v-slot:header>Header</template>
<template #header>Header</template>
<template v-slot:item="{ data }">{{ data.name }}</template>

<!-- Lyt.js -->
<template slot="header">Header</template>
<template #header>Header</template>
<template #item="{ data }">{{ data.name }}</template>
```

### HTML Content

```html
<!-- Vue 3 -->
<div v-html="rawHtml"></div>

<!-- Lyt.js -->
<div html="rawHtml"></div>
```

### Show/Hide

```html
<!-- Vue 3 -->
<div v-show="isVisible">Content</div>

<!-- Lyt.js -->
<div show="isVisible">Content</div>
```

---

## Migration Steps

### Step 1: Install Lyt.js

```bash
npm install @lytjs/core @lytjs/reactivity @lytjs/component
# Or install the aggregate package
npm install @lytjs/lytjs
```

### Step 2: Replace Imports

```javascript
// Vue 3
import { createApp, ref, reactive, computed, watch, onMounted } from 'vue'

// Lyt.js
import { createApp, ref, reactive, computed, watch, onMounted } from '@lytjs/core'
```

### Step 3: Update Template Syntax

Run a find-and-replace across your templates:

| Find | Replace |
|------|---------|
| `v-if=` | `if=` |
| `v-else-if=` | `else-if=` |
| `v-else` | `else` |
| `v-for=` | `each=` |
| `v-model=` | `model=` |
| `v-show=` | `show=` |
| `v-html=` | `html=` |
| `v-text=` | `text=` |
| `v-on:` | `on:` |
| `v-slot:` | `slot:` |
| `v-once` | `once` |
| `v-pre` | `pre` |

### Step 4: Replace Router

```javascript
// Vue Router
import { createRouter, createWebHistory } from 'vue-router'

// Lyt.js Router
import { createRouter } from '@lytjs/router'
```

### Step 5: Replace State Management

```javascript
// Pinia
import { defineStore } from 'pinia'
const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: { double: (s) => s.count * 2 },
  actions: { increment() { this.count++ } }
})

// Lyt.js Store
import { createStore } from '@lytjs/store'
const useCounter = createStore('counter', {
  state: () => ({ count: 0 }),
  getters: { double: (s) => s.count * 2 },
  actions: { increment(s) { s.count++ } }
})
```

### Step 6: Update Configuration Files

Update your build configuration (Vite, Webpack, etc.) to resolve `@lytjs/core` instead of `vue`.

---

## Migration Tool

Lyt.js provides a CLI tool to automate the migration:

```bash
npx @lytjs/cli migrate ./my-vue-project
```

The migration tool will:

1. Replace `vue` imports with `@lytjs/core`
2. Update template directives (`v-if` → `if`, etc.)
3. Replace Vue Router imports with `@lytjs/router`
4. Replace Pinia imports with `@lytjs/store`
5. Update configuration files

---

## Unsupported Vue 3 Features

The following Vue 3 features are not yet supported in Lyt.js:

| Feature | Status | Alternative |
|---------|--------|-------------|
| `<Teleport>` | Planned | Use portal libraries |
| `$refs` | Not supported | Use `ref()` instead |
| `$emit` | Not supported | Use `emit()` from setup context |
| Custom directives | Planned | Use component wrappers |
| `<script setup>` syntax sugar | Not supported | Use `setup()` function |
| CSS Modules | Not supported | Use scoped styles |
| `defineProps` / `defineEmits` macros | Not supported | Use `props`/`emits` options |
| `defineExpose` | Not supported | Use `provide`/`inject` |
| `$el` | Not supported | Use template refs |
| `$parent` / `$children` | Not supported | Use provide/inject |
| `$attrs` | Partial | Available in setup context |
| TransitionGroup `move` transition | Limited | Basic FLIP animation |
| `$forceUpdate` | Not supported | Use reactive system |

---

## Common Issues

### 1. Template Compilation Errors

**Problem:** Template directives are not recognized after migration.

**Solution:** Make sure all `v-` prefixed directives have been updated to the Lyt.js syntax.

```html
<!-- Wrong -->
<div v-if="show">Content</div>

<!-- Correct -->
<div if="show">Content</div>
```

### 2. Component Registration

**Problem:** Global components are not found.

**Solution:** Lyt.js uses the same `app.component()` API, but make sure components are registered before mounting.

```javascript
const app = createApp(App)
app.component('MyButton', MyButton) // Register before mount
app.mount('#app')
```

### 3. Router Mode Configuration

**Problem:** Router mode configuration differs slightly.

**Solution:** Use `mode` option instead of `createWebHistory`/`createWebHashHistory`.

```javascript
// Vue Router
const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

// Lyt.js Router
const router = createRouter({
  mode: 'history',
  routes: [...]
})
```

### 4. Store Actions Context

**Problem:** Pinia's `this` context in actions differs from Lyt.js Store.

**Solution:** In Lyt.js Store actions, use `this.state` to access state.

```javascript
// Pinia
actions: {
  increment() { this.count++ }
}

// Lyt.js Store
actions: {
  increment() { this.state.count++ }
}
```

### 5. SFC File Extension

**Problem:** `.vue` files are not recognized.

**Solution:** Lyt.js uses `.lyt` as the Single File Component extension. Rename your files or configure your build tool to handle `.vue` files with the Lyt.js compiler.

---

## Getting Help

If you encounter issues during migration, please submit feedback through [Gitee Issues](https://gitee.com/lytjs/lytjs/issues).
