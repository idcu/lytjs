---
layout: home

hero:
  name: Lyt.js
  text: Ultra Lightweight Frontend Framework
  tagline: Zero dependencies, pure native implementation, multi-platform rendering support
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/quick-start
    - theme: alt
      text: GitHub
      link: https://gitee.com/lytjs/lytjs

features:
  - icon: "\u26A1"
    title: Zero Dependencies
    details: Pure native JavaScript/TypeScript implementation with no third-party runtime dependencies. From reactivity to renderer, everything is built from scratch.
  - icon: "\U0001F4E6"
    title: Ultra Lightweight
    details: Only 34.56KB gzipped, including reactivity, components, router, state management, and 38+ UI components. A complete framework in one tiny package.
  - icon: "\U0001F310"
    title: Multi-Platform
    details: Built-in DOM, SSR, and Web Component renderers. Write once, run everywhere.
  - icon: "\U0001F4DD"
    title: Vue 3 Compatible API
    details: Composition API and Options API support. If you know Vue 3, you already know Lyt.js. Near-zero migration cost.
  - icon: "\U0001F527"
    title: Built-in Router & Store
    details: Full-featured router (History/Hash modes, guards, dynamic routes) and Pinia-style state management included out of the box.
  - icon: "\U0001F3A8"
    title: 38+ UI Components
    details: A comprehensive component library covering forms, data display, navigation, feedback, and more. Ready for production use.
  - icon: "\U0001F680"
    title: High-Performance Compiler
    details: Complete compiler pipeline (parse -> transform -> optimize -> generate) with static hoisting for optimal rendering performance.
  - icon: "\U0001F916"
    title: AI-Powered Development
    details: Built-in DevTools with performance profiling, component analysis, memory tracking, and render tracing capabilities.
  - icon: "\U0001F30A"
    title: Vapor Mode
    details: Eliminates virtual DOM overhead with compile-time optimizations, achieving near-native JavaScript rendering performance.
  - icon: "\U0001F3D7\uFE0F"
    title: Islands Architecture
    details: SSR Islands Architecture hydrates only interactive components, leaving static content with zero JavaScript overhead.
  - icon: "\U0001F504"
    title: Partial Hydration
    details: Configure different hydration strategies per region (immediate/idle/visible/interaction) for fine-grained control.
  - icon: "\U0001F9E9"
    title: Web Component Support
    details: Register Lyt components as standard Custom Elements for cross-framework reuse via Shadow DOM.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #6366f1 30%, #8b5cf6);

  --vp-home-hero-image-background-image: linear-gradient(-45deg, #6366f1aa 50%, #8b5cf6aa 50%);
  --vp-home-hero-image-filter: blur(44px);

  --vp-button-brand-bg: #4f46e5;
  --vp-button-brand-hover-bg: #6366f1;
  --vp-button-brand-text: #fff;

  --vp-c-brand-1: #4f46e5;
  --vp-c-brand-2: #6366f1;
  --vp-c-brand-3: #818cf8;
  --vp-c-brand-soft: rgba(79, 70, 229, 0.14);
}
</style>

# Write Light, Run Fast — What You See Is What You Code

Lyt.js is a zero-dependency, ultra lightweight frontend framework that provides a Vue 3-compatible API with built-in router, state management, and a rich UI component library. It is designed for developers who value simplicity, performance, and minimal bundle size.

## Quick Start

```bash
# Create a new project
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

Or try it directly in the browser via CDN:

```html
<script type="module">
  import { createApp } from '@lytjs/core'

  const app = createApp({
    template: `
      <div>
        <h1>{{ title }}</h1>
        <p>Count: {{ count }}</p>
        <button @click="count++">+1</button>
      </div>
    `,
    state: { title: 'Hello Lyt.js!', count: 0 }
  })

  app.mount('#app')
</script>
```

## Documentation

### Guides

- [Quick Start](./guide/quick-start.md) — Install, create your first app, and learn the basics
- [Comparison](./guide/comparison.md) — Lyt.js vs Vue 3 vs React vs Svelte vs Solid
- [SSR Guide](./guide/ssr.md) — Server-side rendering with LytX
- [Migration from Vue 3](./guide/migration-from-vue3.md) — Migrate your Vue 3 project to Lyt.js

### API Reference

- [Core API](./api/core.md) — `createApp`, `h()`, `defineComponent`, lifecycle hooks, plugin system
- [Reactivity API](./api/reactivity.md) — `ref`, `reactive`, `computed`, `watch`, Signal API
- [Component API](./api/component.md) — Props, emits, slots, built-in components
- [Router API](./api/router.md) — `createRouter`, navigation guards, dynamic routes
- [Store API](./api/store.md) — `createStore`, state, getters, actions, modules
- [Component Library](./api/components.md) — 38+ UI components, theme system

### Community

- [Contributing Guide](./contributing.md) — How to contribute to Lyt.js
