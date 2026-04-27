# Web Component API

Lyt.js v3.1.0 provides a Web Component adapter that allows Lyt.js components to be registered as standard Web Components (Custom Elements), enabling cross-framework reuse.

## defineCustomElement()

Converts a Lyt.js component into a Custom Element constructor.

```ts
import { defineCustomElement } from 'lyt/web-component'

function defineCustomElement(
  component: ComponentOptions,
  options?: CustomElementOptions
): CustomElementConstructor
```

| Parameter | Type | Description |
|-----------|------|-------------|
| component | `ComponentOptions` | Lyt.js component definition |
| options.shadowRoot | `boolean` | Whether to use Shadow DOM, default `true` |
| options.shadowRootMode | `'open' \| 'closed'` | Shadow DOM mode, default `'open'` |
| options.delegatesFocus | `boolean` | Whether to delegate focus, default `false` |

**Returns:** `CustomElementConstructor` -- Standard Custom Element constructor

```ts
import { defineCustomElement } from 'lyt/web-component'

const MyButton = defineCustomElement({
  props: {
    label: { type: String, default: 'Click me' },
    variant: { type: String, default: 'primary' }
  },

  setup(props) {
    const count = ref(0)

    function onClick() {
      count.value++
    }

    return { props, count, onClick }
  },

  template: `
    <button class="btn btn-{{ props.variant }}" @click="onClick">
      {{ props.label }} ({{ count }})
    </button>
  `
})

// Register with the browser
customElements.define('my-button', MyButton)
```

Usage in HTML:

```html
<my-button label="Submit" variant="success"></my-button>
```

---

## CustomElementOptions

```ts
interface CustomElementOptions {
  /** Whether to use Shadow DOM */
  shadowRoot?: boolean
  /** Shadow DOM mode */
  shadowRootMode?: 'open' | 'closed'
  /** Whether to delegate focus to the first focusable element inside */
  delegatesFocus?: boolean
}
```

---

## registerComponents()

Batch registers multiple components as Custom Elements.

```ts
import { registerComponents } from 'lyt/web-component'

function registerComponents(
  components: Record<string, ComponentOptions>,
  options?: RegisterOptions
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| components | `Record<string, ComponentOptions>` | Map of component names to component definitions |
| options.prefix | `string` | Tag name prefix, default `''` |
| options.kebabCase | `boolean` | Whether to auto-convert to kebab-case, default `true` |

```ts
import { registerComponents } from 'lyt/web-component'

registerComponents({
  'my-counter': CounterComponent,
  'my-card': CardComponent,
  'my-modal': ModalComponent
}, {
  prefix: 'app'
})
// Registered as app-my-counter, app-my-card, app-my-modal
```

---

## Props Mapping

Web Component attributes are automatically mapped to Lyt.js component props.

### Type Inference

| HTML Attribute Type | Corresponding Prop Type |
|---------------------|------------------------|
| Valueless attribute (`disabled`) | `Boolean` |
| Number (`count="42"`) | `Number` |
| JSON string (`data='{"a":1}'`) | `Object` |
| Other strings | `String` |

### Reflection

Internal prop changes are automatically synced back to HTML attributes:

```html
<my-counter count="0"></my-counter>
<script>
  const el = document.querySelector('my-counter')
  el.count = 5  // Internal update
  // HTML becomes <my-counter count="5"></my-counter>
</script>
```

---

## Event System

Lyt.js component events are dispatched outward as Custom Events.

### emitToHost()

```ts
import { emitToHost } from 'lyt/web-component'

function emitToHost(
  el: HTMLElement,
  eventName: string,
  detail?: any,
  options?: CustomEventInit
): void
```

```ts
// Inside component
emitToHost(hostElement, 'change', { value: newValue })
```

```html
<!-- External listener -->
<my-counter @change="handleChange"></my-counter>
```

### Listening to Custom Events

```js
document.querySelector('my-counter').addEventListener('change', (e) => {
  console.log(e.detail)  // { value: newValue }
})
```

---

## Slots Support

The Web Component adapter supports native `<slot>` slots.

```ts
const MyCard = defineCustomElement({
  template: `
    <div class="card">
      <header><slot name="header">Default Title</slot></header>
      <main><slot>Default Content</slot></main>
      <footer><slot name="footer"></slot></footer>
    </div>
  `
})
```

```html
<my-card>
  <span slot="header">Custom Title</span>
  <p>Custom Content</p>
  <span slot="footer">Footer Info</span>
</my-card>
```

---

## Lifecycle Hooks

The Web Component adapter triggers Lyt.js component hooks during Custom Element lifecycle:

| Custom Element Lifecycle | Lyt.js Hook |
|--------------------------|-------------|
| `connectedCallback` | `onMounted` |
| `disconnectedCallback` | `onUnmounted` |
| `attributeChangedCallback` | `watch` props |
| `adoptedCallback` | `onActivated` |

---

## Framework-Agnostic Usage

Registered Custom Elements can be used in any framework:

```jsx
// React
function App() {
  return <my-counter count={0} onChange={(e) => console.log(e.detail)} />
}
```

```html
<!-- Angular -->
<my-counter [count]="count" (change)="handleChange($event)"></my-counter>
```

```html
<!-- Svelte -->
<my-counter count={count} on:change={handleChange} />
```

::: tip
The Web Component adapter is zero-dependency and adds no extra runtime size to your bundle.
:::
