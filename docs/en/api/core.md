# @lytjs/core — Core API

The Lyt.js core entry point provides application creation (`createApp`), render function (`h`), Fragment support, and the plugin system. Built with pure native code and zero dependencies.

## Installation & Imports

```typescript
import {
  createApp,
  h,
  Fragment,
  ShapeFlags,
  createProvidesContext,
  installPlugin,
  nextTick,
} from '@lytjs/core'
```

---

## createApp

Creates an application instance. Supports both template string compilation and render function approaches.

### Signature

```typescript
function createApp(
  rootComponent: ComponentOptions | (() => VNode),
  rootProps?: Record<string, any>
): App
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `rootComponent` | `ComponentOptions \| (() => VNode)` | Root component (component options object or render function) |
| `rootProps` | `Record<string, any>` | Props to pass to the root component (optional) |

### Returns

An `App` instance.

### Example

```typescript
import { createApp, h } from '@lytjs/core'

const app = createApp({
  name: 'App',
  state: () => ({
    count: 0,
    message: 'Hello Lyt.js',
  }),
  render() {
    return h('div', { class: 'app' }, [
      h('h1', null, this.message),
      h('p', null, `Count: ${this.count}`),
      h('button', { onClick: () => this.count++ }, 'Increment'),
    ])
  },
})

app.use(myPlugin)
app.provide('config', { theme: 'dark' })
app.component('MyButton', MyButtonComponent)
app.mount('#app')
```

---

## App Instance

### Methods

#### mount

Renders the root component to real DOM and mounts it to the specified container.

```typescript
app.mount(container: string | Element): App
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | `string \| Element` | Mount target (CSS selector or DOM element) |

Returns the `App` instance (supports chaining).

#### unmount

Unmounts the application. Cleans up the root component, removes DOM, and destroys reactive dependencies.

```typescript
app.unmount(): void
```

#### use

Installs a plugin.

```typescript
app.use(plugin: Plugin, ...options: any[]): App
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `plugin` | `Plugin` | Plugin (object or function) |
| `options` | `any[]` | Plugin options |

#### unuse

Uninstalls a previously installed plugin.

```typescript
app.unuse(plugin: Plugin): App
```

#### isInstalled

Checks whether a plugin is installed.

```typescript
app.isInstalled(plugin: Plugin): boolean
```

#### provide

Provides a value at the application level. All descendant components can inject it.

```typescript
app.provide<T = any>(key: string | symbol, value: T): App
```

#### inject

Retrieves a value provided by an ancestor component via `provide`.

```typescript
app.inject<T = any>(key: string | symbol, defaultValue?: T): T | undefined
```

#### component

Registers or retrieves a global component.

```typescript
// Register
app.component(name: string, component: ComponentOptions): App

// Retrieve
app.component(name: string): ComponentOptions | undefined
```

#### directive

Registers or retrieves a global directive.

```typescript
// Register
app.directive(name: string, directive: DirectiveHooks): App

// Retrieve
app.directive(name: string): DirectiveHooks | undefined
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `config` | `AppConfig` | Global configuration |
| `globalProperties` | `Record<string, any>` | Global properties |
| `_instance` | `any` | Root component instance reference |

---

## h

The render function. Used to create virtual nodes (VNodes) in render functions.

### Signature

```typescript
function h(
  type: string | object | symbol,
  props?: Props,
  children?: Children
): VNode
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `string \| object \| symbol` | Node type (HTML tag string, component object, or Fragment) |
| `props` | `Record<string, any> \| null` | Node attributes (optional) |
| `children` | `string \| number \| VNode \| Children[]` | Child nodes (optional) |

### Returns

`VNode`

### Example

```typescript
import { h, Fragment } from '@lytjs/core'

// Create an element
h('div', { class: 'container', id: 'app' }, [
  h('h1', null, 'Hello Lyt.js'),
  h('p', { style: { color: 'red' } }, 'This is a paragraph'),
  h('button', { onClick: () => console.log('clicked') }, 'Click me'),
])

// Create a component
h(MyComponent, { title: 'Props', onCustom: handleEvent }, [
  h('span', null, 'Slot content'),
])

// Use Fragment
h(Fragment, null, [h('li', null, 'Item 1'), h('li', null, 'Item 2')])

// With event binding
h('input', {
  class: 'input',
  onInput: (e) => console.log(e.target.value),
  onFocus: () => console.log('focused'),
})

// With ref
h('div', { ref: (el) => console.log('mounted:', el) }, 'Content')
```

---

## defineComponent

Defines a component with full type inference.

### Signature

```typescript
function defineComponent(options: ComponentOptions): ComponentDefine
```

### ComponentOptions

| Option | Type | Description |
|--------|------|-------------|
| name | `string` | Component name |
| props | `string[] \| Record<string, PropOptions>` | Props declaration |
| state | `() => Record<string, any>` | Reactive state factory function |
| computed | `ComputedOptions` | Computed properties |
| watch | `WatchOptions` | Watchers |
| methods | `Record<string, Function>` | Methods |
| template | `string` | Template string |
| render | `RenderFunction` | Render function (takes priority over template) |
| init | `Function` | Initialization function |
| setup | `SetupFunction` | Composition API setup function |
| emits | `EmitsOptions` | Event declarations |
| slots | `SlotChildren` | Default slot content |

### Example

```typescript
import { defineComponent, ref } from '@lytjs/core'

const Counter = defineComponent({
  name: 'Counter',
  props: {
    title: { type: String, default: 'Counter' },
    initialCount: { type: Number, default: 0 }
  },
  setup(props) {
    const count = ref(props.initialCount)

    function increment() { count.value++ }
    function decrement() { count.value-- }

    return { count, increment, decrement }
  },
  template: `
    <div class="counter">
      <h2>{{ title }}</h2>
      <div class="controls">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+</button>
      </div>
    </div>
  `
})
```

---

## Lifecycle Hooks

Lyt.js provides the following lifecycle hooks:

| Hook | Timing | Description |
|------|--------|-------------|
| `onInit` | Component initialization | After instance creation, before props initialization |
| `onMounted` | After component mount | DOM is mounted; safe for DOM operations |
| `onBeforeUpdate` | Before component update | After data change, before DOM update |
| `onUpdated` | After component update | DOM is updated; latest DOM state available |
| `onBeforeUnmount` | Before component unmount | Component is about to unmount; clean up resources |
| `onUnmounted` | After component unmount | Component is unmounted; perform final cleanup |
| `onErrorCaptured` | On child component error | Captures errors from child components |

### Usage in Composition API

```typescript
import { defineComponent, onMounted, onUnmounted, onBeforeUpdate, onUpdated } from '@lytjs/core'

defineComponent({
  setup() {
    onMounted(() => {
      console.log('Component mounted')
    })

    onBeforeUpdate(() => {
      console.log('Before update')
    })

    onUpdated(() => {
      console.log('Updated')
    })

    onBeforeUnmount(() => {
      console.log('Before unmount')
    })

    onUnmounted(() => {
      console.log('Unmounted')
    })

    return {}
  }
})
```

### Usage in Options API

```typescript
defineComponent({
  init() {
    console.log('Component initialized')
  },
  mounted() {
    console.log('Component mounted')
  },
  beforeUpdate() {
    console.log('Before update')
  },
  updated() {
    console.log('Updated')
  },
  beforeUnmount() {
    console.log('Before unmount')
  },
  unmounted() {
    console.log('Unmounted')
  }
})
```

---

## Plugin System

### Plugin Type

A plugin can be an object (with an `install` method) or a function.

```typescript
type Plugin = PluginObject | ((app: AppAPI, ...options: any[]) => void)

interface PluginObject {
  install: (app: AppAPI, ...options: any[]) => void
}
```

### installPlugin

Installs a plugin to the application.

```typescript
function installPlugin(app: AppAPI, plugin: Plugin, ...options: any[]): void
```

### createProvidesContext

Creates a dependency injection container using prototype chain for hierarchical lookup.

```typescript
function createProvidesContext(parent?: Record<string | symbol, any>): Record<string | symbol, any>
```

### AppConfig

```typescript
interface AppConfig {
  [key: string]: any
  errorHandler?: (err: any, instance: any, info: string) => void
  warnHandler?: (msg: string, instance: any, trace: string) => void
}
```

### Plugin Example

```typescript
// Object form
const myPlugin = {
  install(app, options) {
    app.provide('config', options)
    app.globalProperties.$myMethod = () => console.log('hello')
  }
}
app.use(myPlugin, { theme: 'dark' })

// Function form
const myPluginFn = (app, options) => {
  app.provide('config', options)
}
app.use(myPluginFn)
```

---

## provide / inject

Dependency injection for cross-hierarchy component communication.

```typescript
// In an ancestor component
import { provide, ref } from '@lytjs/core'

setup() {
  const theme = ref('light')
  provide('theme', theme)
}

// In a descendant component
import { inject } from '@lytjs/core'

setup() {
  const theme = inject('theme')
  // theme is the ref provided by the ancestor
}
```

### App-level provide

```typescript
app.provide('globalConfig', { apiUrl: 'https://api.example.com' })
```

---

## nextTick

Defers the execution of a callback until after the next DOM update cycle.

```typescript
function nextTick(callback?: () => void): Promise<void>
```

### Example

```typescript
import { nextTick, ref } from '@lytjs/core'

const count = ref(0)

async function incrementAndGetDOM() {
  count.value++
  await nextTick()
  // DOM is now updated
  console.log(document.querySelector('.count').textContent) // '1'
}
```

---

## Fragment

A Fragment type identifier used to represent a group of child nodes without a parent container (multi-root node support).

```typescript
const Fragment = Symbol('Fragment')
```

### Example

```typescript
// Component returning multiple root nodes
render() {
  return h(Fragment, null, [
    h('header', null, 'Header'),
    h('main', null, 'Content'),
    h('footer', null, 'Footer'),
  ])
}
```

---

## ShapeFlags

VNode shape flags using bit flags to describe VNode type and children shape.

| Constant | Value | Description |
|----------|-------|-------------|
| `ELEMENT` | 1 | Regular HTML/SVG element |
| `FUNCTIONAL_COMPONENT` | 2 | Functional component |
| `STATEFUL_COMPONENT` | 4 | Stateful component |
| `TEXT_CHILDREN` | 8 | Children are plain text |
| `ARRAY_CHILDREN` | 16 | Children are an array |
| `SLOTS_CHILDREN` | 32 | Children are slots |

---

## VNode Interface

```typescript
interface VNode {
  type: string | object | symbol    // Node type
  props: Record<string, any> | null  // Node attributes
  children: string | VNode[] | Record<string, any> | null  // Child nodes
  key: string | number | null        // Unique node identifier
  ref: ((el: any) => void) | { current: any } | null  // ref
  shapeFlag: number                   // Shape flag
  el: any                             // Real DOM element reference
  component: any                      // Associated component instance
}
```

---

## DirectiveHooks

Global directive hooks.

```typescript
interface DirectiveHooks {
  created?(el: any, binding: DirectiveBinding): void
  beforeMount?(el: any, binding: DirectiveBinding): void
  mounted?(el: any, binding: DirectiveBinding): void
  beforeUpdate?(el: any, binding: DirectiveBinding): void
  updated?(el: any, binding: DirectiveBinding): void
  beforeUnmount?(el: any, binding: DirectiveBinding): void
  unmounted?(el: any, binding: DirectiveBinding): void
}

interface DirectiveBinding {
  value: any
  oldValue: any
  arg?: string
  modifiers: Record<string, boolean>
  instance: any
}
```

### Directive Example

```typescript
app.directive('focus', {
  mounted(el) {
    el.focus()
  },
  unmounted(el) {
    console.log('focus directive unmounted')
  }
})
```
