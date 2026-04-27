# Vapor Mode

Vapor Mode is a new compilation strategy introduced in Lyt.js v3.1.0 that achieves near-native JavaScript rendering performance by eliminating Virtual DOM overhead.

## Overview

In traditional mode, Lyt.js compiles templates to generate VNode trees, and the renderer compares old and new VNodes for DOM updates (Diff algorithm). Vapor Mode, on the other hand, directly compiles templates into precise DOM operation instructions, skipping VNode creation and the Diff process.

### Performance Comparison

| Metric | Traditional Mode | Vapor Mode |
|--------|-----------------|------------|
| Memory Usage | Higher (VNode trees) | Very low (no VNodes) |
| Initial Render | Normal | 30%-50% faster |
| Update Performance | Depends on Diff optimization | Precise updates, no Diff |
| Bundle Size | Baseline | ~2-3KB smaller |

## Enabling Vapor Mode

### Enable at Compile Time

Enable Vapor Mode compilation in your Vite configuration:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import lyt from '@lytjs/vite-plugin'

export default defineConfig({
  plugins: [
    lyt({
      vapor: true  // Enable Vapor Mode
    })
  ]
})
```

### Enable Per Component

Use the `vapor` compile hint to mark specific components:

```ts
import { defineComponent } from 'lyt'

export default defineComponent({
  vapor: true,  // Only this component uses Vapor Mode

  setup() {
    const count = ref(0)
    return { count }
  },

  template: `
    <div>
      <span>Count: {{ count }}</span>
      <button @click="count++">+1</button>
    </div>
  `
})
```

### Runtime Switch

```ts
import { createApp } from 'lyt'

const app = createApp(App)
app.config.vaporMode = true
app.mount('#app')
```

::: warning Note
Runtime switching only affects components that have not been Vapor-compiled. It is recommended to enable at compile time for best performance.
:::

## How It Works

Vapor Mode's compilation output is fundamentally different from traditional mode:

### Traditional Mode Compilation Output

```ts
// Traditional mode: generates VNode creation functions
function render(_ctx) {
  return h('div', null, [
    h('span', null, 'Count: ' + _ctx.count),
    h('button', { onClick: () => _ctx.count++ }, '+1')
  ])
}
```

### Vapor Mode Compilation Output

```ts
// Vapor Mode: generates precise DOM operation instructions
import { insert, setText, listen, createText, createElement } from 'lyt/vapor'

export function render(_ctx, container) {
  const div = createElement('div')
  insert(div, container)

  const span = createElement('span')
  const text = createText('Count: ' + _ctx.count)
  insert(span, div)
  insert(text, span)

  const btn = createElement('button')
  const btnText = createText('+1')
  insert(btn, div)
  insert(btnText, btn)

  listen(btn, 'click', () => _ctx.count++)

  // Precise update function
  return (prevCtx, nextCtx) => {
    if (prevCtx.count !== nextCtx.count) {
      setText(text, 'Count: ' + nextCtx.count)
    }
  }
}
```

## Supported Features

### Fully Supported

- Text interpolation `{{ }}`
- Attribute binding `v-bind` / `:`
- Event binding `v-on` / `@`
- Conditional rendering `v-if` / `v-else`
- List rendering `v-each`
- Two-way binding `v-bind:model`
- Computed properties `computed()`
- `ref()` reactive references

### Partially Supported

| Feature | Support Level | Description |
|---------|--------------|-------------|
| `<slot>` slots | Supported | Slot structure must be determined at compile time |
| `<component>` dynamic components | Supported | Requires compile-time type inference |
| `v-once` | Supported | Compiled as static content |
| `v-memo` | Supported | Compiled as conditional updates |

### Not Supported

- Runtime template compilation (the `compile()` function)
- `$refs` (use `ref()` + template ref instead)
- Recursive components (maximum depth must be known at compile time)

## Vapor Mode Reactive Binding API

Vapor Mode provides a set of fine-grained reactive binding APIs based on Signals for precise DOM updates.

### bindText(el, sig)

Binds a Signal's value to an element's text content.

```ts
import { bindText } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const count = signal(0)
const el = document.querySelector('#count')
bindText(el, count)
// When count changes, el.textContent is automatically updated
```

### bindProp(el, key, sig)

Binds a Signal's value to an element's property.

```ts
import { bindProp } from '@lytjs/renderer/vapor'

const placeholder = signal('Enter text')
bindProp(inputEl, 'placeholder', placeholder)
```

### bindClass(el, sig)

Binds a Signal's value to an element's class.

```ts
import { bindClass } from '@lytjs/renderer/vapor'

const activeClass = signal('active highlighted')
bindClass(el, activeClass)
```

### bindStyle(el, sig) {#bindstyle}

Binds a Signal's value to an element's style, supporting both string and object forms.

**String form:**

```ts
import { bindStyle } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const styleSig = signal('color: red; font-size: 16px')
bindStyle(el, styleSig)
// When Signal updates, el.style.cssText is automatically synced
```

**Object form:**

```ts
const styleSig = signal({
  color: 'red',
  fontSize: '16px',
  display: 'flex'
})
bindStyle(el, styleSig)
// Only updates changed style properties for better performance
```

### bindHTML(el, sig) {#bindhtml}

Binds a Signal's value to an element's innerHTML.

```ts
import { bindHTML } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const htmlSig = signal('<strong>Bold text</strong>')
bindHTML(el, htmlSig)
// When Signal updates, el.innerHTML is automatically synced
```

::: warning Security
`bindHTML` directly sets `innerHTML`. Make sure the Signal's value comes from a trusted source to avoid XSS attacks.
:::

### bindIf(el, parentSig, anchor?) {#bindif}

Controls DOM insertion/removal of an element based on a Signal's value (not display:none toggling).

```ts
import { bindIf } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const visible = signal(true)
bindIf(el, visible)
// When visible is true, el is inserted into the DOM
// When visible is false, el is removed from the DOM
```

**Parameter description:**

| Parameter | Type | Description |
|-----------|------|-------------|
| el | `Element` | DOM element to control |
| parentSig | `Signal<boolean>` | Signal controlling visibility |
| anchor | `Node` (optional) | Anchor node for insertion position |

::: tip Difference from previous version
The previous version of `bindIf` used `display:none` to toggle visibility, keeping the element in the DOM at all times. The new version uses actual DOM insertion/removal, which is more performant and doesn't leave hidden DOM nodes.
:::

### bindEach(container, sig, keyFn, renderFn) {#bindeach}

Signal-driven keyed diff list rendering.

```ts
import { bindEach } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const items = signal([
  { id: 1, name: 'Item A' },
  { id: 2, name: 'Item B' },
  { id: 3, name: 'Item C' }
])

bindEach(
  container,           // Parent container element
  items,               // Signal<Array<T>>
  item => item.id,     // Key function for identifying list items
  (item, index) => {   // Render function, returns DOM element
    const div = document.createElement('div')
    div.textContent = item.name
    return div
  }
)
```

::: tip Difference from previous version
The previous version of `bindEach` rebuilt all DOM nodes from scratch when the Signal changed. The new version uses a true keyed diff algorithm, performing DOM operations only for added, removed, and moved nodes, significantly improving list update performance.
:::

### bindEvent(el, event, handler)

Binds an event listener.

```ts
import { bindEvent } from '@lytjs/renderer/vapor'

bindEvent(button, 'click', () => {
  console.log('clicked!')
})
```

## Reactive Template Compilation

Vapor Mode's template compiler now supports Signal-based reactive directives. The compiled code automatically creates Signal bindings and updates the DOM when data changes.

### Reactive v-if

The `v-if` directive in templates is automatically compiled to a `bindIf` call:

```html
<!-- Template -->
<div v-if="show">Conditional content</div>
```

```ts
// Compiled output (pseudocode)
const show = signal(true)
const el = createElement('div')
el.textContent = 'Conditional content'
bindIf(el, show)
```

### Reactive v-each

The `v-each` directive in templates is automatically compiled to a `bindEach` call (using keyed diff):

```html
<!-- Template -->
<ul>
  <li v-each="item in items">{{ item.name }}</li>
</ul>
```

```ts
// Compiled output (pseudocode)
const items = signal([...])
bindEach(ul, items, item => item.id, (item) => {
  const li = createElement('li')
  bindText(li, computed(() => item.name))
  return li
})
```

### Reactive Text Interpolation

`{{ }}` interpolation is automatically compiled to a `bindText` call:

```html
<span>{{ message }}</span>
```

```ts
// Compiled output
const message = signal('Hello')
bindText(span, message)
```

### Reactive Dynamic Attribute Binding

Dynamic attribute bindings are automatically compiled to corresponding `bindProp` / `bindClass` / `bindStyle` calls:

```html
<div :class="activeClass" :style="styleObj" :data-id="id">
```

```ts
// Compiled output
bindClass(div, activeClass)
bindStyle(div, styleObj)
bindProp(div, 'data-id', id)
```

## renderVaporComponent() {#renderVaporComponent}

`renderVaporComponent()` renders a Vapor component into a specified container. It now supports a `props` parameter.

```ts
import { renderVaporComponent, defineVaporComponent } from '@lytjs/renderer/vapor'

const MyComponent = defineVaporComponent({
  props: ['title', 'count'],
  setup(props) {
    // props are reactive
    return {}
  },
  template: `<div><h1>{{ title }}</h1><span>{{ count }}</span></div>`
})

// Render component, passing props
renderVaporComponent(
  MyComponent,
  document.querySelector('#app'),
  {
    props: {
      title: 'Hello Vapor',
      count: signal(42)
    }
  }
)
```

**Parameter description:**

| Parameter | Type | Description |
|-----------|------|-------------|
| component | `VaporComponent` | Vapor component definition |
| container | `Element` | Mount container |
| options.props | `Record<string, any>` | Props to pass to the component; values can be Signals |

::: tip
If a value in props is a Signal, it will be automatically unwrapped inside the component. Non-Signal values are passed through as-is.
:::

## Mixing with Traditional Mode

Vapor Mode components can coexist with traditional mode components:

```ts
// Traditional mode component
const ParentComponent = defineComponent({
  components: { VaporChild },
  template: `
    <div>
      <h1>Traditional Mode Parent</h1>
      <VaporChild />  <!-- Vapor Mode child component -->
    </div>
  `
})

// Vapor Mode child component
const VaporChild = defineComponent({
  vapor: true,
  setup() {
    const msg = ref('From Vapor Mode')
    return { msg }
  },
  template: `<p>{{ msg }}</p>`
})
```

## Best Practices

### 1. Prioritize Performance-Critical Components

```ts
// List item components -- Vapor Mode provides the most benefit
const ListItem = defineComponent({
  vapor: true,
  props: ['item'],
  template: `
    <div class="item">
      <span>{{ item.name }}</span>
      <span>{{ item.price }}</span>
    </div>
  `
})
```

### 2. Avoid Complex Expressions in Vapor Components

```ts
// Recommended: simple binding
template: `<span>{{ count }}</span>`

// Not recommended: complex expression (Vapor Mode cannot optimize)
template: `<span>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</span>`
```

### 3. Use `v-memo` to Optimize List Rendering

```ts
template: `
  <div v-each="item in items" v-memo="[item.id]">
    <span>{{ item.name }}</span>
  </div>
`
```

### 4. Use `v-once` to Mark Static Content

```ts
template: `
  <div>
    <header v-once>
      <h1>{{ title }}</h1>  <!-- Rendered only once -->
    </header>
    <main>
      <p>{{ dynamicContent }}</p>
    </main>
  </div>
`
```

## Debugging

Vapor Mode provides dedicated debugging tools:

```ts
import { isVaporComponent, getVaporBlock } from 'lyt/vapor'

isVaporComponent(component)  // Check if a component uses Vapor Mode
getVaporBlock(component)     // Get the compiled operation block
```

::: tip
Vapor Mode is a progressive enhancement feature. You can gradually migrate performance-critical components to Vapor Mode without rewriting the entire application at once.
:::
