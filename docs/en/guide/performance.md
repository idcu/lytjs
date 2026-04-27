# Performance Optimization Guide

This document describes how to optimize the performance of your Lyt.js application.

## Core Optimization Strategies

### 1. Use Vapor Mode

Vapor Mode is Lyt.js's no-virtual-DOM compilation strategy, delivering performance close to native JavaScript:

```typescript
import { defineConfig } from '@lytjs/lytx'

export default defineConfig({
  vapor: true  // Enable Vapor Mode
})
```

Advantages of Vapor Mode:
- Eliminates virtual DOM overhead
- Smaller runtime bundle
- Faster initial rendering
- Lower memory usage

### 2. Use Islands Architecture

Hydrate only interactive components, with zero JS overhead for static content:

```typescript
import { defineIsland, createSSRApp } from '@lytjs/core'

const CounterIsland = defineIsland({
  hydration: 'visible',  // Hydrate when visible
  setup() {
    const count = ref(0)
    return { count }
  },
  template: `<button @click="count++">{{ count }}</button>`
})
```

Hydration strategies:
- `immediate` - Hydrate immediately (default)
- `idle` - Hydrate when the browser is idle
- `visible` - Hydrate when the element is visible
- `interaction` - Hydrate on user interaction

### 3. Use KeepAlive to Cache Components

Cache frequently used components to avoid redundant rendering:

```typescript
<KeepAlive>
  <component :is="currentView" />
</KeepAlive>
```

## Reactivity System Optimization

### Avoid Deep Nesting

Split large objects into multiple smaller reactive objects:

```typescript
// Not recommended
const state = reactive({
  user: { profile: { settings: {} } },
  posts: [],
  comments: []
})

// Recommended
const user = reactive({ profile: { settings: {} } })
const posts = ref([])
const comments = ref([])
```

### Use shallowRef / shallowReactive

For large objects that don't need deep reactivity:

```typescript
import { shallowRef, shallowReactive } from '@lytjs/reactivity'

const largeList = shallowRef([])  // Shallow reactive only
const config = shallowReactive({}) // Shallow reactive only
```

### Use markRaw for Non-Reactive Objects

```typescript
import { markRaw } from '@lytjs/reactivity'

const staticData = markRaw({ /* Will not be tracked by reactivity */ })
```

## Rendering Optimization

### Use Key to Optimize List Rendering

Always provide a unique key for v-for lists:

```html
<!-- Recommended -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

<!-- Avoid -->
<div v-for="item in items" :key="index">{{ item.name }}</div>
```

### Use v-once for One-Time Content

```html
<div v-once>This content is rendered only once</div>
```

### Use v-memo to Memoize Components

```html
<div v-memo="[item.id]">Only re-renders when item.id changes</div>
```

## Component Optimization

### Lazy Load Components

Use dynamic imports:

```typescript
const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.lyt')
)
```

Combined with route lazy loading:

```typescript
const routes = [
  {
    path: '/heavy',
    component: () => import('./pages/HeavyPage.lyt')
  }
]
```

### Use Functional Components

For stateless presentational components:

```typescript
const Button = (props, { slots }) => ({
  type: 'button',
  props: { class: 'btn' },
  children: slots.default?.()
})
```

## Compilation Optimization

### Static Hoisting

The Lyt.js compiler automatically hoists static content outside the render function:

```html
<!-- Template -->
<div>
  <p>Static content</p>
  <p>Dynamic content: {{ count }}</p>
</div>

<!-- The static p tag will be hoisted after compilation -->
```

### Compile-Time Optimization

Use `lytx compile` to pre-compile templates:

```bash
npx lytx compile src/ --outdir dist/
```

## State Management Optimization

### Split Stores Appropriately

Split large Stores into multiple smaller Stores:

```typescript
// userStore.ts
export const useUserStore = defineStore('user', { /* ... */ })

// cartStore.ts
export const useCartStore = defineStore('cart', { /* ... */ })
```

### Use Selectors to Avoid Unnecessary Updates

```typescript
import { useUserStore } from './stores/user'

const userStore = useUserStore()
const userName = computed(() => userStore.user.name) // Only subscribes to name
```

## Route Optimization

### Route Lazy Loading

```typescript
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home.lyt')
  },
  {
    path: '/about',
    component: () => import('./pages/About.lyt')
  }
]
```

### Use RouterView Caching

```typescript
import { useRouterView } from '@lytjs/router'

const { Component, route } = useRouterView()
```

## Resource Loading Optimization

### Preload Critical Resources

```html
<link rel="preload" href="/critical.js" as="script">
<link rel="prefetch" href="/future.js" as="script">
```

### Image Optimization

```html
<img
  src="image.jpg"
  loading="lazy"
  decoding="async"
  width="400"
  height="300"
>
```

## DevTools Performance Analysis

### Using Built-in DevTools

```typescript
import { createDevTools } from '@lytjs/devtools'

const app = createApp(App)
app.use(createDevTools())
```

### Performance Collection

```typescript
import { perf } from '@lytjs/devtools'

perf.start('my-operation')
// ... perform operation
perf.end('my-operation')
```

## Production Environment Optimization

### Remove Development Tools

```typescript
import { createApp } from '@lytjs/core'

const app = createApp(App)

if (import.meta.env.DEV) {
  app.use(devTools)
}
```

### Enable Tree Shaking

Make sure to use ES modules:

```json
{
  "sideEffects": false
}
```

## Performance Checklist

- [ ] Enable Vapor Mode
- [ ] Use Islands Architecture
- [ ] Use KeepAlive appropriately
- [ ] Optimize reactive objects
- [ ] Use Key to optimize lists
- [ ] Lazy load components and routes
- [ ] Pre-compile templates
- [ ] Split Stores
- [ ] Optimize image loading
- [ ] Configure CDN and caching
- [ ] Use DevTools to analyze performance

## Performance Benchmarks

Run the built-in benchmarks:

```bash
npm run bench
```

Comparison with other frameworks:
- Lyt.js (Vapor Mode): ~1.0x native
- Lyt.js (Standard): ~1.5x native
- Vue 3: ~2.0x native
- React: ~2.5x native

## Next Steps

- View the [Deployment Guide](./deployment.md)
- Learn about [Advanced Topics](./advanced-topics.md)
