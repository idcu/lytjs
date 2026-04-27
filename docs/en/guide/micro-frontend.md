# Micro Frontend Support

Lyt.js provides comprehensive micro-frontend support, enabling Lyt.js applications to be integrated as sub-apps into mainstream micro-frontend frameworks (qiankun, micro-app, etc.), or to serve as a base application loading sub-apps from other frameworks.

## Overview

Lyt.js micro-frontend support includes the following core capabilities:

| Capability | Description | Package |
|------------|-------------|---------|
| Web Component Adapter | Wraps Lyt.js components as standard Custom Elements | `@lytjs/core/web-component` |
| JS Sandbox | Uses Proxy to intercept window access and isolate global variables | `@lytjs/micro-frontend` |
| CSS Sandbox | Isolates styles via scope prefixes | `@lytjs/micro-frontend` |
| Event Bus | Cross-application event communication | `@lytjs/micro-frontend` |
| Shared State | Cross-application reactive state sharing | `@lytjs/micro-frontend` |
| Lifecycle Management | Unified management of sub-app mount/unmount/update | `@lytjs/micro-frontend` |
| qiankun Adapter | Generates qiankun standard lifecycles | `@lytjs/micro-frontend/adapters` |
| micro-app Adapter | Generates micro-app entry points | `@lytjs/micro-frontend/adapters` |

## Web Component Mode

Web Component is the simplest way to integrate with micro-frontends. By registering Lyt.js components as Custom Elements via `defineCustomElement`, they can be used in any framework.

### Basic Usage

```ts
import { defineCustomElement } from '@lytjs/core/web-component'

// Define a Lyt.js component
const CounterComponent = {
  state: () => ({ count: 0 }),
  methods: {
    increment() { this.count++ },
  },
  render() {
    return h('div', null, [
      h('p', null, `Count: ${this.count}`),
      h('button', { onClick: () => this.increment() }, '+'),
    ])
  },
}

// Register as a Web Component
defineCustomElement('lyt-counter', CounterComponent, {
  observedAttributes: ['initial-count'],
  shadowMode: 'open',
  styles: ':host { display: block; padding: 16px; }',
})
```

After registration, you can use it directly in any HTML:

```html
<lyt-counter initial-count="10"></lyt-counter>
```

### Props to Attributes Mapping

Use `propsToAttributes` to automatically convert Props definitions to observedAttributes:

```ts
import { propsToAttributes } from '@lytjs/core/web-component'

const props = {
  title: { type: String, default: 'Hello' },
  maxCount: { type: Number, default: 100 },
  isVisible: { type: Boolean },
}

const attrs = propsToAttributes(props)
// ['title', 'max-count', 'is-visible']

defineCustomElement('my-component', MyComponent, {
  observedAttributes: attrs,
})
```

### Attributes to Props Conversion

Use `attributesToProps` to read attributes from a DOM element and convert them to Props:

```ts
import { attributesToProps } from '@lytjs/core/web-component'

const el = document.querySelector('lyt-counter')
const props = attributesToProps(el.attributes)
// { initialCount: 10 }
```

### Event Forwarding

`emit` calls from Lyt.js components are automatically converted to CustomEvents:

```ts
const MyComponent = {
  methods: {
    handleClick() {
      this.emit('change', { value: 42 })
    },
  },
  render() { /* ... */ },
}

defineCustomElement('my-component', MyComponent)

// Listen for events
document.querySelector('my-component').addEventListener('change', (e) => {
  console.log(e.detail) // { value: 42 }
})
```

Use `eventsToCustomEvents` to get event configurations:

```ts
import { eventsToCustomEvents } from '@lytjs/core/web-component'

const events = eventsToCustomEvents(['click', 'change', 'update:modelValue'])
// {
//   click: { name: 'click', options: { bubbles: true, composed: true, cancelable: true } },
//   change: { name: 'change', options: { bubbles: true, composed: true, cancelable: true } },
//   'update:modelValue': { name: 'update:modelValue', options: { ... } },
// }
```

### Style Encapsulation

#### Shadow DOM Style Injection

Use `injectStyles` to inject styles into Shadow DOM:

```ts
import { injectStyles } from '@lytjs/core/web-component'

// Use inside a Custom Element
injectStyles(':host { display: block; } .inner { color: red; }', this.shadowRoot)

// Append mode
injectStyles('.additional { font-size: 14px; }', this.shadowRoot, { append: true })

// Use ID management (auto-replace on update)
injectStyles('.dynamic { color: blue; }', this.shadowRoot, { id: 'dynamic-styles' })
```

#### Scoped CSS

Use `scopedCSS` to add scoped identifiers to CSS:

```ts
import { scopedCSS, generateScopeId } from '@lytjs/core/web-component'

const scopeId = generateScopeId()
// 'data-v-a1b2c3d4'

const scoped = scopedCSS(
  '.container { color: red; } .title { font-size: 16px; }',
  scopeId
)
// '.container[data-v-a1b2c3d4] { color: red; } .title[data-v-a1b2c3d4] { font-size: 16px; }'
```

### SFC to Web Component

Use `defineCustomElementFromSFC` to create a Web Component directly from SFC source code:

```ts
import { defineCustomElementFromSFC } from '@lytjs/core/web-component'

await defineCustomElementFromSFC('my-counter', `
  <template>
    <div>{{ count }}</div>
    <button @click="count++">+</button>
  </template>
  <script>
  export default {
    state: () => ({ count: 0 }),
  }
  </script>
  <style>
  :host { display: block; padding: 16px; }
  </style>
`)
```

## qiankun Integration

Use `createQiankunLifeCycle` to adapt a Lyt.js application as a qiankun sub-app.

### Sub-app Configuration

```ts
// child-app/src/main.ts
import { createQiankunLifeCycle } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const { bootstrap, mount, unmount, update } = createQiankunLifeCycle({
  name: 'child-app',
  component: MyComponent,
  styles: ':host { display: block; }',
})

export { bootstrap, mount, unmount, update }

// Support standalone running
if (!(window as any).__POWERED_BY_QIANKUN__) {
  mount({ container: document.getElementById('app')!, name: 'child-app' })
}
```

### Base App Registration

```ts
// main-app/src/main.ts
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'child-app',
    entry: '//localhost:3001',
    container: '#sub-app-container',
    activeRule: '/child',
  },
])

start()
```

### Global State Bridging

qiankun's global state is automatically bridged to SharedState:

```ts
const { bootstrap, mount, unmount } = createQiankunLifeCycle({
  name: 'child-app',
  component: MyComponent,
  sharedState: new SharedState(), // Auto-syncs qiankun global state
})
```

## micro-app Integration

Use `createMicroAppEntry` to adapt a Lyt.js application as a micro-app sub-app.

### Sub-app Configuration

```ts
// child-app/src/main.ts
import { createMicroAppEntry } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const entry = createMicroAppEntry({
  name: 'child-app',
  component: MyComponent,
  styles: ':host { display: block; }',
})

// Register as a Custom Element
entry.register()
```

### Base App Usage

```html
<!-- main-app/index.html -->
<micro-app name="child-app" url="http://localhost:3001"></micro-app>
```

## Sandbox and Communication

### JS Sandbox

Use `createSandbox` to create a JS sandbox that isolates sub-app global variables:

```ts
import { createSandbox } from '@lytjs/micro-frontend'

const sandbox = createSandbox({
  name: 'child-app',
  trackGlobals: true, // Track newly added global variables
})

// Activate sandbox
sandbox.activate()

// Execute code in sandbox
sandbox.proxyWindow.myGlobalVar = 'hello' // Writes to fakeWindow, does not affect real window

// Deactivate sandbox (auto-cleans new global variables)
sandbox.deactivate()

// Destroy sandbox
sandbox.destroy()
```

### CSS Sandbox

Use `createStyleSandbox` to create a CSS sandbox that isolates sub-app styles:

```ts
import { createStyleSandbox } from '@lytjs/micro-frontend'

const cssSandbox = createStyleSandbox({
  container: document.getElementById('app-container')!,
  useShadowDOM: false, // Whether to use Shadow DOM
})

// Inject styles (auto-adds scope prefix)
cssSandbox.inject('.button { color: red; }')
// Actually injected: .mf-abc123 .button { color: red; }

// Clean up all styles
cssSandbox.removeAll()

// Destroy
cssSandbox.destroy()
```

### Event Bus

Use `EventBus` for cross-application event communication:

```ts
import { EventBus } from '@lytjs/micro-frontend'

// Create event bus (recommended to create in base app and pass via props)
const bus = new EventBus()

// Subscribe to events
const unsubscribe = bus.on('user:login', (data) => {
  console.log('User logged in:', data)
})

// Wildcard subscription
bus.on('user:*', (data, eventName) => {
  console.log(`User event: ${eventName}`, data)
})

// Emit events
bus.emit('user:login', { id: 1, name: 'Alice' })

// Trigger only once
bus.once('app:init', () => { /* ... */ })

// Unsubscribe
unsubscribe()

// Clear all listeners
bus.clear()
```

### Shared State

Use `SharedState` for cross-application reactive state sharing:

```ts
import { SharedState } from '@lytjs/micro-frontend'

// Create shared state (recommended to create in base app)
const state = new SharedState()

// Set values
state.set('user', { id: 1, name: 'Alice' })
state.set('theme', 'dark')

// Get values
const user = state.get('user')

// Watch for changes
const unwatch = state.watch('user', (newUser, oldUser) => {
  console.log('User changed:', newUser)
})

// Watch all changes
const unwatchAll = state.watchAll((key, newValue, oldValue) => {
  console.log(`${key} changed:`, oldValue, '->', newValue)
})

// Batch set
state.batchSet({ theme: 'light', lang: 'en' })

// Delete
state.remove('user')

// Unwatch
unwatch()
unwatchAll()
```

### Lifecycle Management

Use the `MicroApp` class to manage sub-apps uniformly:

```ts
import { MicroApp, createSandbox, createStyleSandbox, EventBus, SharedState } from '@lytjs/micro-frontend'

const app = new MicroApp({
  name: 'child-app',
  entry: MyComponent,
  container: '#app-container',
  sandbox: createSandbox({ name: 'child-app' }),
  styleSandbox: createStyleSandbox({ container: document.getElementById('app-container')! }),
  eventBus: new EventBus(),
  sharedState: new SharedState(),
  props: { theme: 'dark' },
  lifecycle: {
    beforeLoad: async () => { console.log('Loading...') },
    afterMount: async (props) => { console.log('Mounted!', props) },
    beforeUnmount: async () => { console.log('Unmounting...') },
  },
})

// Mount
await app.mount()

// Update Props
await app.update({ theme: 'light', lang: 'en' })

// Get status
console.log(app.getStatus()) // 'mounted'
console.log(app.getInfo())

// Unmount
await app.unmount()

// Destroy (unmount + cleanup all resources)
await app.destroy()
```

## Best Practices

### 1. Sandbox Configuration

- Always create independent JS and CSS sandboxes for each sub-app
- Clean up timers and event listeners in the `beforeUnmount` hook
- Use `destroy()` instead of `unmount()` to fully release resources

### 2. Communication Design

- Prefer SharedState for data sharing and EventBus for event notifications
- Use namespaced event names (e.g., `app:mounted`, `user:login`)
- Avoid executing time-consuming operations in event callbacks

### 3. Style Isolation

- Prefer Shadow DOM for style isolation
- If not using Shadow DOM, always use the CSS sandbox
- Avoid global style selectors (e.g., `body`, `html`)

### 4. Performance Optimization

- Load sub-app resources on demand
- Use `update()` instead of `unmount()` + `mount()` to update sub-apps
- Set reasonable `maxListeners` for EventBus to prevent memory leaks

### 5. Error Handling

- Configure `load_error` and `mount_error` handling for each sub-app
- Use EventBus's `app:error` event for unified error handling
- Enable `trackGlobals` in sandbox configuration for debugging

### 6. Debugging Tips

- Use `app.getInfo()` to check sub-app status
- Use EventBus wildcard listener `app:*` to track all application events
- Set `name` in sandbox configuration for identification in DevTools
