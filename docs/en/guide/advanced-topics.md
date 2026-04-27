# Advanced Topics

This chapter covers Lyt.js advanced features and best practices to help you build high-performance, maintainable applications.

## Performance Optimization

### 1. Component Optimization

#### Using `v-memo` to Cache Components

The `v-memo` directive caches component render results, skipping re-renders when dependencies haven't changed.

```ts
import { defineComponent, ref } from '@lytjs/core'

const ExpensiveComponent = defineComponent({
  props: { item: Object },
  template: `
    <div v-memo="[item.id]">
      <!-- Complex rendering logic -->
      {{ heavyComputation(item) }}
    </div>
  `,
  methods: {
    heavyComputation(item) {
      // Expensive computation
      let result = 0
      for (let i = 0; i < 1000000; i++) {
        result += i
      }
      return result
    }
  }
})
```

#### Using `v-if` and `v-show` Appropriately

- **v-if**: Suitable for infrequently changing conditions; destroys/recreates the component
- **v-show**: Suitable for frequently changing conditions; only toggles the display property

```ts
// Infrequently changing condition
<div v-if="user.isAdmin">Admin Panel</div>

// Frequently changing condition
<div v-show="isVisible">Popup</div>
```

#### Using `key` to Optimize List Rendering

Using unique `key` values in `v-for` helps Lyt.js update the DOM more efficiently.

```ts
// Recommended
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</ul>

// Not recommended
<ul>
  <li v-for="(item, index) in items" :key="index">
    {{ item.name }}
  </li>
</ul>
```

### 2. Reactivity Optimization

#### Avoiding Unnecessary Reactivity

For data that doesn't need to be reactive, use `shallowRef` or `markRaw` to improve performance.

```ts
import { shallowRef, markRaw } from '@lytjs/reactivity'

// Shallow reactive (only top-level properties are reactive)
const shallowData = shallowRef({ deep: { nested: 'data' } })

// Non-reactive
const rawData = markRaw({ complex: 'object' })
```

#### Using `computed` to Cache Computation Results

```ts
import { computed } from '@lytjs/core'

const expensiveValue = computed(() => {
  // Complex computation, automatically cached
  return heavyComputation()
})
```

#### Using `watch` Appropriately

- Use `immediate: false` to avoid initial execution
- Use `deep: false` to avoid deep watching
- Use `flush: 'post'` to avoid multiple triggers

```ts
watch(
  () => state.user,
  (newUser) => {
    // Handle user change
  },
  { deep: false, flush: 'post' }
)
```

### 3. Rendering Optimization

#### Virtual Scrolling

For long lists, virtual scrolling can significantly improve performance.

```ts
import { defineComponent, ref, computed } from '@lytjs/core'

const VirtualList = defineComponent({
  props: { items: Array, itemHeight: Number },
  setup(props) {
    const containerRef = ref(null)
    const visibleCount = ref(20)
    const scrollTop = ref(0)

    const visibleItems = computed(() => {
      const start = Math.floor(scrollTop.value / props.itemHeight)
      const end = start + visibleCount.value
      return props.items.slice(start, end)
    })

    const offsetY = computed(() => {
      const start = Math.floor(scrollTop.value / props.itemHeight)
      return start * props.itemHeight
    })

    return { containerRef, scrollTop, visibleItems, offsetY }
  },
  template: `
    <div
      ref="containerRef"
      style="height: 400px; overflow-y: auto"
      @scroll="scrollTop = $event.target.scrollTop"
    >
      <div :style="{ height: items.length * itemHeight + 'px', position: 'relative' }">
        <div :style="{ transform: 'translateY(' + offsetY + 'px)', position: 'absolute', width: '100%' }">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            :style="{ height: itemHeight + 'px' }"
          >
            {{ item.name }}
          </div>
        </div>
      </div>
    </div>
  `
})
```

#### Batch Updates

Use `nextTick` or `$patch` for batch updates.

```ts
import { nextTick } from '@lytjs/core'

async function updateData() {
  // Multiple state updates
  state.loading = true
  state.count = 0
  state.items = []

  // Wait for DOM update to complete
  await nextTick()

  // Continue processing
  state.loading = false
}
```

### 4. Resource Optimization

#### Code Splitting

Use dynamic imports for code splitting.

```ts
// Route lazy loading
const About = () => import('./views/About.vue')

// Component lazy loading
const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
```

#### Image Optimization

- Use appropriate image formats (WebP, AVIF)
- Implement lazy loading for images
- Use responsive images

```ts
const LazyImage = defineComponent({
  props: { src: String, alt: String },
  setup(props) {
    const isLoaded = ref(false)

    const handleLoad = () => {
      isLoaded.value = true
    }

    return { isLoaded, handleLoad }
  },
  template: `
    <div class="lazy-image-container">
      <img
        v-if="isLoaded"
        :src="src"
        :alt="alt"
        @load="handleLoad"
      />
      <div v-else class="placeholder"></div>
    </div>
  `
})
```

## Custom Renderers

### 1. Creating a Custom Renderer

Lyt.js supports creating custom renderers for different platforms.

```ts
import { createRenderer } from '@lytjs/renderer'

const customRenderer = createRenderer({
  // Create element
  createElement(tag) {
    console.log('Creating element:', tag)
    return { tag }
  },

  // Insert element
  insert(el, parent, anchor) {
    console.log('Inserting element:', el.tag, 'into', parent.tag)
  },

  // Remove element
  remove(el) {
    console.log('Removing element:', el.tag)
  },

  // Set element property
  setElementProp(el, key, value) {
    console.log('Setting property:', key, '=', value)
  },

  // Add event listener
  addEventListener(el, event, handler) {
    console.log('Adding event listener:', event)
  }
})

// Use custom renderer
const app = customRenderer.createApp({
  template: '<div @click="onClick">Hello</div>',
  methods: {
    onClick() {
      console.log('Clicked')
    }
  }
})

// Mount to custom container
app.mount({ tag: 'root' })
```

### 2. Platform-Specific Renderers

Lyt.js includes built-in renderers for multiple platforms:

#### DOM Renderer

```ts
import { createApp } from '@lytjs/core'

const app = createApp({
  template: '<div>Hello DOM</div>'
})

app.mount('#app')
```

#### Server-Side Rendering (SSR)

```ts
import { renderToString } from '@lytjs/renderer/ssr'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

const html = await renderToString(app)
console.log(html) // <div>Hello SSR</div>
```

#### Mini-App Renderer

```ts
import { createApp } from '@lytjs/renderer/miniapp'

const app = createApp({
  template: '<view>Hello Miniapp</view>'
})

app.mount()
```

#### Native Renderer

```ts
import { createApp } from '@lytjs/renderer/native'

const app = createApp({
  template: '<View>Hello Native</View>'
})

app.mount()
```

### 3. Custom Renderer Best Practices

- **Platform adaptation**: Adjust rendering logic based on target platform characteristics
- **Performance optimization**: Optimize for specific platforms
- **Feature extension**: Add platform-specific features
- **Error handling**: Handle platform-specific errors

## Compilation Optimization

### 1. Template Compilation

The Lyt.js compiler optimizes templates:

- **Static analysis**: Identifies and optimizes static content
- **Tree shaking**: Removes unused code
- **Inlining**: Inlines simple computations
- **Caching**: Caches compilation results

### 2. Vapor Mode

Vapor Mode is a more efficient rendering mode, suitable for simple components.

```ts
import { defineComponent } from '@lytjs/core'

const VaporComponent = defineComponent({
  // Enable Vapor Mode
  vapor: true,

  props: { message: String },

  template: `
    <div class="container">
      <h1>{{ message }}</h1>
      <p>Welcome to Lyt.js</p>
    </div>
  `
})
```

### 3. WebAssembly Compilation

Lyt.js supports compiling templates to WebAssembly for improved rendering performance.

```ts
// Compilation configuration
const compilerOptions = {
  target: 'wasm',
  optimize: true
}

// Compile template
const wasmCode = compileTemplate('<div>{{ message }}</div>', compilerOptions)
```

## Memory Management

### 1. Avoiding Memory Leaks

- **Clean up timers**: Clear timers when components unmount
- **Remove event listeners**: Remove event listeners when components unmount
- **Cancel subscriptions**: Cancel state subscriptions when components unmount
- **Clean up references**: Avoid circular references

```ts
import { defineComponent, onMounted, onUnmounted } from '@lytjs/core'

const TimerComponent = defineComponent({
  setup() {
    let timer = null

    onMounted(() => {
      timer = setInterval(() => {
        console.log('Tick')
      }, 1000)
    })

    onUnmounted(() => {
      if (timer) {
        clearInterval(timer)
      }
    })

    return {}
  },
  template: '<div>Timer Component</div>'
})
```

### 2. Memory Monitoring

Use Lyt.js DevTools for memory monitoring:

- **Component memory usage**: View memory consumption per component
- **Memory leak detection**: Detect potential memory leaks
- **Performance analysis**: Analyze rendering performance

### 3. Garbage Collection

- **Reduce object creation**: Avoid creating new objects in render functions
- **Use object pools**: Reuse objects to reduce GC pressure
- **Release promptly**: Set unused objects to null promptly

```ts
// Avoid creating new objects in rendering
// Bad practice
const BadComponent = defineComponent({
  template: `
    <div :style="{ color: 'red', fontSize: '16px' }"></div>
  `
})

// Good practice
const GoodComponent = defineComponent({
  setup() {
    const styles = { color: 'red', fontSize: '16px' }
    return { styles }
  },
  template: `
    <div :style="styles"></div>
  `
})
```

## Server-Side Rendering (SSR)

### 1. Basic Usage

```ts
import { createApp } from '@lytjs/core'
import { renderToString } from '@lytjs/renderer/ssr'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

// Render to string
const html = await renderToString(app)
console.log(html) // <div>Hello SSR</div>
```

### 2. Data Prefetching

```ts
import { defineComponent, ref, onServerPrefetch } from '@lytjs/core'

const DataComponent = defineComponent({
  setup() {
    const data = ref(null)

    // Server-side data prefetch
    onServerPrefetch(async () => {
      const response = await fetch('https://api.example.com/data')
      data.value = await response.json()
    })

    return { data }
  },
  template: `
    <div>
      <div v-if="data">
        {{ data.message }}
      </div>
      <div v-else>Loading...</div>
    </div>
  `
})
```

### 3. Client-Side Hydration

```ts
// Server-side
const html = await renderToString(app)

// Client-side
import { createApp } from '@lytjs/core'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

// Hydrate into already-rendered DOM
app.mount('#app', true) // Second parameter true means hydrate
```

## Advanced Component Patterns

### 1. Higher-Order Components (HOC)

```ts
function withErrorBoundary(Component) {
  return defineComponent({
    setup(props, { slots }) {
      return () => {
        try {
          return h(Component, props, slots)
        } catch (error) {
          return h('div', { class: 'error' }, 'An error occurred')
        }
      }
    }
  })
}

// Usage
const SafeComponent = withErrorBoundary(MyComponent)
```

### 2. Render Props

```ts
const List = defineComponent({
  props: { items: Array, renderItem: Function },
  template: `
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ renderItem(item) }}
      </li>
    </ul>
  `
})

// Usage
<List
  :items="todos"
  :renderItem="(item) => h('div', [
    h('input', { type: 'checkbox', checked: item.done }),
    h('span', item.text)
  ])"
/>
```

### 3. Functional Components

```ts
const FunctionalComponent = defineComponent({
  functional: true,
  props: { message: String },
  render(h, { props }) {
    return h('div', props.message)
  }
})
```

### 4. Async Components

```ts
import { defineAsyncComponent } from '@lytjs/core'

const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

## Internationalization (i18n)

### 1. Basic Implementation

```ts
import { createApp, ref, computed } from '@lytjs/core'

const messages = {
  en: {
    hello: 'Hello',
    welcome: 'Welcome to Lyt.js'
  },
  zh: {
    hello: '你好',
    welcome: '欢迎使用 Lyt.js'
  }
}

const i18n = {
  locale: ref('en'),
  t(key) {
    return messages[this.locale.value][key]
  }
}

const app = createApp({
  setup() {
    const changeLocale = () => {
      i18n.locale.value = i18n.locale.value === 'en' ? 'zh' : 'en'
    }

    return { i18n, changeLocale }
  },
  template: `
    <div>
      <h1>{{ i18n.t('hello') }}</h1>
      <p>{{ i18n.t('welcome') }}</p>
      <button @click="changeLocale">Switch Language</button>
    </div>
  `
})

app.mount('#app')
```

### 2. Plugin Integration

```ts
// i18n plugin
const i18nPlugin = {
  install(app, options) {
    const i18n = {
      locale: ref(options.defaultLocale || 'en'),
      messages: options.messages || {},
      t(key) {
        return this.messages[this.locale.value][key] || key
      }
    }

    app.provide('i18n', i18n)
    app.config.globalProperties.$i18n = i18n
  }
}

// Use plugin
app.use(i18nPlugin, {
  defaultLocale: 'en',
  messages: {
    en: { hello: 'Hello' },
    zh: { hello: '你好' }
  }
})
```

## Testing Strategies

### 1. Unit Testing

```ts
import { mount } from '@lytjs/test-utils'
import Counter from './Counter.vue'

describe('Counter', () => {
  test('renders initial count', () => {
    const wrapper = mount(Counter)
    expect(wrapper.text()).toContain('Count: 0')
  })

  test('increments count when button is clicked', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
```

### 2. End-to-End Testing

```ts
import { test, expect } from '@playwright/test'

test('counter increments', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('button')
  await expect(page.locator('div')).toContainText('Count: 1')
})
```

### 3. Performance Testing

```ts
import { performance } from 'perf_hooks'

function measureRender() {
  const start = performance.now()
  // Render component
  const end = performance.now()
  console.log(`Render time: ${end - start}ms`)
}
```

## Deployment Optimization

### 1. Build Optimization

```bash
# Production build
npm run build

# Analyze build output
npm run build -- --analyze
```

### 2. Static Asset Optimization

- **Compression**: Compress CSS, JavaScript, HTML
- **Caching**: Set appropriate caching strategies
- **CDN**: Use CDN to accelerate static assets
- **Gzip/Brotli**: Enable compression

### 3. Server Configuration

- **HTTP/2**: Enable HTTP/2
- **HTTPS**: Use HTTPS
- **Caching**: Set appropriate cache headers
- **Compression**: Enable server-side compression

## Summary

Lyt.js provides rich advanced features and optimization strategies to help you build high-performance, maintainable applications:

- **Performance optimization**: Component optimization, reactivity optimization, rendering optimization, resource optimization
- **Custom renderers**: Multi-platform rendering support
- **Compilation optimization**: Template compilation, Vapor Mode, WebAssembly compilation
- **Memory management**: Avoiding memory leaks, memory monitoring, garbage collection
- **Server-side rendering**: SSR, data prefetching, client-side hydration
- **Advanced component patterns**: HOC, Render Props, functional components, async components
- **Internationalization**: Multi-language support
- **Testing strategies**: Unit testing, end-to-end testing, performance testing
- **Deployment optimization**: Build optimization, static asset optimization, server configuration

By mastering these advanced topics, you can fully leverage Lyt.js's potential to build more professional and efficient frontend applications.
