# Migration from Vue 3 to Lyt.js

Lyt.js provides a highly compatible Vue 3 API through the `@lytjs/compat` compatibility layer, making migration straightforward and low-cost. This guide helps you quickly migrate your Vue 3 project to Lyt.js.

## Overview

### Why Migrate from Vue 3 to Lyt.js?

- **Lighter footprint**: Lyt.js core is smaller with zero external dependencies
- **Dual reactivity modes**: Supports both Proxy and Signal reactivity modes
- **More flexible**: Provides more customization and extension capabilities
- **High compatibility**: With `@lytjs/compat`, most Vue 3 code works seamlessly

### Migration Strategy

1. **Incremental migration**: Install `@lytjs/compat` first, then gradually replace imports
2. **Automated tooling**: Use the `vue-to-lyt` CLI tool for automatic code conversion
3. **Manual adjustments**: Handle incompatible parts

---

## API Compatibility Reference

### Reactivity API

| Vue 3 API | Lyt.js (@lytjs/compat) | Compatibility | Notes |
|-----------|------------------------|---------------|-------|
| `ref()` | `ref()` | Fully compatible | Direct use |
| `reactive()` | `reactive()` | Fully compatible | Direct use |
| `computed()` | `computed()` | Fully compatible | Direct use |
| `watch()` | `watch()` | Fully compatible | Direct use |
| `watchEffect()` | `watchEffect()` | Fully compatible | Direct use |
| `watchPostEffect()` | `watchPostEffect()` | Fully compatible | Direct use |
| `watchSyncEffect()` | `watchSyncEffect()` | Fully compatible | Direct use |
| `shallowRef()` | `shallowRef()` | Fully compatible | Direct use |
| `shallowReactive()` | `shallowReactive()` | Fully compatible | Direct use |
| `triggerRef()` | `triggerRef()` | Fully compatible | Direct use |
| `readonly()` | `readonly()` | Fully compatible | Direct use |
| `isRef()` | `isRef()` | Fully compatible | Direct use |
| `isReactive()` | `isReactive()` | Fully compatible | Direct use |
| `isReadonly()` | `isReadonly()` | Fully compatible | Direct use |
| `isProxy()` | `isProxy()` | Fully compatible | Direct use |
| `toRaw()` | `toRaw()` | Fully compatible | Direct use |
| `markRaw()` | `markRaw()` | Fully compatible | Direct use |
| `toRef()` | `toRef()` | Fully compatible | Direct use |
| `toRefs()` | `toRefs()` | Fully compatible | Direct use |
| `unref()` | `unref()` | Fully compatible | Direct use |
| `proxyRefs()` | `proxyRefs()` | Placeholder | Use `reactive()` or `toRefs()` instead |
| `effect()` | `effect()` | Fully compatible | Direct use |
| `nextTick()` | `nextTick()` | Fully compatible | Direct use |

### Lifecycle Hooks

| Vue 3 API | Lyt.js (@lytjs/compat) | Compatibility | Notes |
|-----------|------------------------|---------------|-------|
| `onMounted()` | `onMounted()` | Fully compatible | Direct use |
| `onUpdated()` | `onUpdated()` | Fully compatible | Direct use |
| `onUnmounted()` | `onUnmounted()` | Fully compatible | Direct use |
| `onBeforeMount()` | `onBeforeMount()` | Fully compatible | Direct use |
| `onBeforeUpdate()` | `onBeforeUpdate()` | Fully compatible | Direct use |
| `onBeforeUnmount()` | `onBeforeUnmount()` | Fully compatible | Direct use |
| `onErrorCaptured()` | `onErrorCaptured()` | Placeholder | Prints warning only |
| `onRenderTracked()` | `onRenderTracked()` | Placeholder | Prints warning only |
| `onRenderTriggered()` | `onRenderTriggered()` | Placeholder | Prints warning only |
| `onActivated()` | `onActivated()` | Placeholder | Prints warning only |
| `onDeactivated()` | `onDeactivated()` | Placeholder | Prints warning only |
| `onServerPrefetch()` | `onServerPrefetch()` | Placeholder | Prints warning only |

### Dependency Injection

| Vue 3 API | Lyt.js (@lytjs/compat) | Compatibility | Notes |
|-----------|------------------------|---------------|-------|
| `provide()` | `provide()` | Fully compatible | Direct use |
| `inject()` | `inject()` | Fully compatible | Direct use |

### Component API

| Vue 3 API | Lyt.js (@lytjs/compat) | Compatibility | Notes |
|-----------|------------------------|---------------|-------|
| `createApp()` | `createApp()` | Fully compatible | Direct use |
| `defineComponent()` | `defineComponent()` | Fully compatible | Direct use |
| `defineAsyncComponent()` | `defineAsyncComponent()` | Fully compatible | Direct use |
| `h()` | `h()` | Fully compatible | Direct use |
| `Fragment` | `Fragment` | Fully compatible | Direct use |
| `getCurrentInstance()` | `getCurrentInstance()` | Fully compatible | Direct use |
| `defineProps()` | `defineProps()` | Placeholder | Compiler macro, use props option |
| `defineEmits()` | `defineEmits()` | Placeholder | Compiler macro, use emits option |
| `withDefaults()` | `withDefaults()` | Placeholder | Compiler macro, use props default |
| `defineExpose()` | `defineExpose()` | Placeholder | Setup return values auto-exposed |
| `useSlots()` | `useSlots()` | Placeholder | Access via setup context |
| `useAttrs()` | `useAttrs()` | Placeholder | Access via setup context |
| `useTemplateRef()` | `useTemplateRef()` | Placeholder | Use ref() instead |

### Built-in Components

| Vue 3 Component | Lyt.js (@lytjs/compat) | Compatibility | Notes |
|-----------------|------------------------|---------------|-------|
| `<KeepAlive>` | `<KeepAlive>` | Fully compatible | Import from @lytjs/compat |
| `<Teleport>` | `<Teleport>` | Placeholder | Basic export, limited functionality |
| `<Transition>` | `<Transition>` | Fully compatible | Import from @lytjs/compat |
| `<TransitionGroup>` | `<TransitionGroup>` | Fully compatible | Import from @lytjs/compat |
| `<Suspense>` | `<Suspense>` | Fully compatible | Import from @lytjs/compat |

### Template Directives

| Vue 3 Directive | Lyt.js Directive | Compatibility | Notes |
|----------------|-----------------|---------------|-------|
| `v-if` | `if` | Syntax change | Remove `v-` prefix |
| `v-else-if` | `else-if` | Syntax change | Remove `v-` prefix |
| `v-else` | `else` | Syntax change | Remove `v-` prefix |
| `v-for` | `v-each` | Syntax change | `v-for` becomes `v-each` |
| `v-model` | `model` | Syntax change | Remove `v-` prefix |
| `v-model.trim` | `model.trim` | Syntax change | Modifier syntax identical |
| `v-model.number` | `model.number` | Syntax change | Modifier syntax identical |
| `v-model.lazy` | `model.lazy` | Syntax change | Modifier syntax identical |
| `v-show` | `show` | Syntax change | Remove `v-` prefix |
| `v-html` | `html` | Syntax change | Remove `v-` prefix |
| `v-text` | `text` | Syntax change | Remove `v-` prefix |
| `v-on:` | `on:` | Syntax change | `v-on:` becomes `on:` |
| `@click` | `@click` | Fully compatible | Shorthand syntax identical |
| `v-bind:` | `:` | Fully compatible | Shorthand recommended |
| `v-slot:` | `slot:` | Syntax change | `v-slot:` becomes `slot:` |
| `#name` | `#name` | Fully compatible | Shorthand syntax identical |
| `v-once` | `once` | Syntax change | Remove `v-` prefix |
| `v-pre` | `pre` | Syntax change | Remove `v-` prefix |
| `v-cloak` | `cloak` | Syntax change | Remove `v-` prefix |
| `v-memo` | - | Not supported | Use computed instead |

### Ecosystem

| Vue 3 Ecosystem | Lyt.js Alternative | Compatibility | Notes |
|----------------|--------------------| ---------------|-------|
| Vue Router | `@lytjs/router` | Similar API | Different import path |
| Pinia | `@lytjs/store` | Similar API | API adjustments needed |
| Vuex | `@lytjs/store` | Different API | Rewrite state management |

---

## Migration Steps

### Step 1: Install @lytjs/compat

```bash
npm install @lytjs/compat
```

`@lytjs/compat` automatically installs these dependencies:
- `@lytjs/core`
- `@lytjs/reactivity`
- `@lytjs/component`

### Step 2: Replace Imports

```javascript
// Vue 3
import { createApp, ref, reactive, computed, watch, onMounted } from 'vue'

// Lyt.js (using compat layer)
import { createApp, ref, reactive, computed, watch, onMounted } from '@lytjs/compat'
```

You can also use native Lyt.js packages directly:

```javascript
import { createApp, h, Fragment } from '@lytjs/core'
import { ref, reactive, computed, watch, nextTick } from '@lytjs/reactivity'
import { defineComponent, onMounted, onUnmounted, provide, inject } from '@lytjs/component'
```

### Step 3: Update Template Syntax

#### Conditional Rendering

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

#### List Rendering

```html
<!-- Vue 3 -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>

<!-- Lyt.js -->
<li v-each="item in items" key="item.id">{{ item.name }}</li>
```

#### Two-Way Binding

```html
<!-- Vue 3 -->
<input v-model="text" />
<input v-model.trim="text" />
<input v-model.number="count" />

<!-- Lyt.js -->
<input model="text" />
<input model.trim="text" />
<input model.number="count" />
```

#### Event Handling

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

#### Attribute Binding

```html
<!-- Vue 3 -->
<img v-bind:src="imageUrl" />
<img :src="imageUrl" />

<!-- Lyt.js -->
<img :src="imageUrl" />
<img :src="imageUrl" />
```

#### Slots

```html
<!-- Vue 3 -->
<template v-slot:header>Header</template>
<template #header>Header</template>

<!-- Lyt.js -->
<template slot="header">Header</template>
<template #header>Header</template>
```

#### Other Directives

```html
<!-- Vue 3 -->
<div v-show="isVisible">Content</div>
<div v-html="rawHtml"></div>
<div v-text="message"></div>
<div v-once>Static</div>

<!-- Lyt.js -->
<div show="isVisible">Content</div>
<div html="rawHtml"></div>
<div text="message"></div>
<div once>Static</div>
```

### Step 4: Replace Ecosystem Packages

#### Router

```javascript
// Vue Router
import { createRouter, createWebHistory } from 'vue-router'

// Lyt.js Router
import { createRouter } from '@lytjs/router'
```

#### State Management

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

### Step 5: Run Migration Tool

Use the `vue-to-lyt` CLI tool for automatic code conversion:

```bash
# Convert a single file
npx @lytjs/compat vue-to-lyt ./src/MyComponent.vue

# Convert an entire directory
npx @lytjs/compat vue-to-lyt ./src --recursive

# Preview conversion (dry run, no file writes)
npx @lytjs/compat vue-to-lyt ./src --recursive --dry-run

# Convert to a specific output directory
npx @lytjs/compat vue-to-lyt ./src --recursive --output ./lyt-src
```

You can also use the migration API programmatically:

```typescript
import { migrateVueFile, formatMigrationReport } from '@lytjs/compat'

const source = `
<template>
  <div v-if="show">{{ message }}</div>
</template>
<script setup>
import { ref } from 'vue'
const message = ref('Hello')
</script>
`

const report = migrateVueFile(source)
console.log('Compatibility score:', report.compatibilityScore)
console.log('Converted code:', report.code)
console.log('Manual fixes needed:', report.manualFixes)
console.log(formatMigrationReport(report))
```

### Step 6: Handle Incompatible Parts Manually

The migration tool automatically detects and flags parts that need manual adjustment. Common cases requiring manual work:

- `defineProps` / `defineEmits` compiler macros
- `$refs` / `$emit` / `$el` instance properties
- CSS Modules
- `v-memo` directive
- Pinia/Vuex state management API differences

---

## Common Migration Issues

### 1. v-model Differences

Vue 3's `v-model` becomes `model` in Lyt.js. Modifier syntax remains the same:

```html
<!-- Vue 3 -->
<input v-model.trim="text" />
<input v-model.number="count" />
<input v-model.lazy="value" />

<!-- Lyt.js -->
<input model.trim="text" />
<input model.number="count" />
<input model.lazy="value" />
```

### 2. Lifecycle Hook Differences

Most lifecycle hooks are fully compatible. The following hooks have placeholder implementations:

- `onErrorCaptured` -- Prints warning only, does not actually capture errors
- `onRenderTracked` / `onRenderTriggered` -- Prints warning only
- `onActivated` / `onDeactivated` -- Prints warning only
- `onServerPrefetch` -- Prints warning only

### 3. Directive Differences

| Feature | Vue 3 | Lyt.js |
|---------|-------|--------|
| Conditional rendering | `v-if` / `v-else-if` / `v-else` | `if` / `else-if` / `else` |
| List rendering | `v-for` | `v-each` |
| Two-way binding | `v-model` | `model` |
| Event binding | `v-on:click` or `@click` | `on:click` or `@click` |
| Attribute binding | `v-bind:src` or `:src` | `:src` |
| Slots | `v-slot:name` or `#name` | `slot:name` or `#name` |

### 4. Component Library Differences

Vue 3 component libraries (such as Element Plus, Ant Design Vue) cannot be used directly in Lyt.js. Your options:

1. Look for Lyt.js alternative component libraries
2. Use native HTML elements with custom styles
3. Wrap commonly used UI components yourself

### 5. $refs / $emit / $el Alternatives

```javascript
// Vue 3
export default {
  mounted() {
    this.$refs.input.focus()
    this.$emit('change', this.value)
    console.log(this.$el)
  }
}

// Lyt.js (Composition API)
import { ref, onMounted } from '@lytjs/compat'

// setup() {
//   const inputRef = ref(null)
//   const emit = (event, ...args) => { /* use setup context emit */ }
//
//   onMounted(() => {
//     inputRef.value?.focus()
//     emit('change', value.value)
//   })
//
//   return { inputRef }
// }
```

### 6. defineProps / defineEmits Alternatives

```javascript
// Vue 3 (script setup)
const props = defineProps({ title: String })
const emit = defineEmits(['update'])

// Lyt.js (defineComponent)
import { defineComponent } from '@lytjs/compat'

export default defineComponent({
  props: {
    title: String,
  },
  emits: ['update'],
  setup(props, { emit }) {
    // Use props.title and emit('update', value)
  },
})
```

---

## Best Practices

### 1. Incremental Migration

Do not migrate the entire project at once. Follow this order:

1. Migrate utility functions and pure logic modules first
2. Then migrate simple presentational components
3. Finally migrate complex interactive components

### 2. Use the @lytjs/compat Layer

During the initial migration phase, `@lytjs/compat` minimizes code changes. Once migration is complete, you can gradually switch to native Lyt.js packages for better type support and performance.

### 3. Leverage Migration Tools

Use the `vue-to-lyt` CLI tool and `migrateVueFile` API for automated conversion. The migration tool generates a compatibility score and detailed issue report to help you assess migration difficulty.

### 4. Write Migration Tests

After migration, ensure all functionality works correctly:

- Write unit tests for each migrated component
- Run end-to-end tests to verify user interactions
- Check the console for compatibility layer warnings

### 5. Watch for Placeholder APIs

APIs marked as "placeholder" in the compatibility layer do not perform any actual operations; they only print warnings. If your code depends on these APIs, you need to find alternatives.

### 6. Take Advantage of Signal Mode

Lyt.js's unique Signal reactivity mode can provide better performance. After migration, consider switching some components from Proxy mode to Signal mode:

```javascript
import { defineComponent } from '@lytjs/component'

export default defineComponent({
  reactivityMode: 'signal', // Use Signal mode
  setup() {
    // State management in Signal mode
  },
})
```

---

## Getting Help

If you encounter issues during migration, please submit feedback through [Gitee Issues](https://gitee.com/lytjs/lytjs/issues).
