# Renderer API

The Lyt.js renderer renders VNode trees to target platforms, supporting DOM, SSR, native mobile, and mini-apps.

## createRenderer()

Creates a renderer instance.

```ts
function createRenderer(renderer: LytRenderer): RendererInstance
```

| Parameter | Type | Description |
|-----------|------|-------------|
| renderer | `LytRenderer` | Platform renderer implementation |

**Returns:** `RendererInstance`

```ts
import { createRenderer, DOMRenderer } from 'lyt/renderer'

const renderer = createRenderer(new DOMRenderer())
```

---

## VNode Types

```ts
interface VNode {
  type: string | object | symbol    // Node type
  props: Record<string, any> | null // Properties
  children: string | VNode[] | Record<string, any> | null  // Children
  key: string | number | null       // Key
  ref: any                          // Ref
  shapeFlag: number                 // Shape flag
  patchFlag: number                 // Patch flag
  dynamicChildren: VNode[] | null   // Dynamic children
  dynamicProps: string[] | null     // Dynamic props
  component: any                    // Component instance
  el: any                           // DOM element
  anchor: any                       // Anchor
}
```

---

## VNode Utilities

### Fragment

```ts
const Fragment: unique symbol
```

Fragment node, renders multiple children without creating a wrapper element.

### Text

```ts
const Text: unique symbol
```

Text node type symbol.

### Comment

```ts
const Comment: unique symbol
```

Comment node type symbol.

### ShapeFlags

```ts
const ShapeFlags: {
  ELEMENT: number
  FUNCTIONAL_COMPONENT: number
  STATEFUL_COMPONENT: number
  TEXT_CHILDREN: number
  ARRAY_CHILDREN: number
  SLOTS_CHILDREN: number
  // ...
}
```

VNode shape flag constants.

### PatchFlags

```ts
const PatchFlags: {
  TEXT: number
  CLASS: number
  STYLE: number
  PROPS: number
  FULL_PROPS: number
  // ...
}
```

VNode patch flag constants.

---

## DOM Renderer

### DOMRenderer

```ts
class DOMRenderer implements LytRenderer {
  createElement(tag: string): Element
  createText(text: string): Text
  insert(child: Node, parent: Node, anchor?: Node): void
  remove(child: Node): void
  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
  // ...
}
```

### domRenderer

```ts
const domRenderer: DOMRenderer
```

Pre-created DOM renderer singleton.

---

## DOM Operation Helpers

### setDOMProp()

```ts
function setDOMProp(el: Element, key: string, value: any): void
```

Sets a DOM property.

### removeDOMProp()

```ts
function removeDOMProp(el: Element, key: string): void
```

Removes a DOM property.

### patchDOMProps()

```ts
function patchDOMProps(el: Element, prevProps: Record<string, any>, nextProps: Record<string, any>): void
```

Batch updates DOM properties.

### isSVGElement()

```ts
function isSVGElement(tag: string): boolean
```

Checks if a tag is an SVG element.

### getSVGPropName()

```ts
function getSVGPropName(name: string): string
```

Gets the SVG property name.

---

## Precise Property Updates

```ts
function patchClass(el: Element, next: string, prev?: string): void
function patchStyle(el: Element, next: Record<string, any>, prev?: Record<string, any>): void
function patchEventOnElement(el: Element, name: string, next: Function, prev?: Function): void
function patchDOMProp(el: Element, key: string, next: any, prev?: any): void
function patchProp(el: Element, key: string, next: any, prev: any): void
function patchAllProps(el: Element, next: Record<string, any>, prev: Record<string, any>): void
function patchElementProps(el: Element, next: Record<string, any>, prev: Record<string, any>): void
```

---

## Event System

```ts
function normalizeEventName(name: string): string
function getEventKey(name: string, options?: EventListenerOptions): string
function parseEventModifier(name: string): { name: string, modifiers: string[] }
function createInvoker(fn: Function): EventInvoker
function getEventInvokers(el: Element): Map<string, EventInvoker>
function patchEvent(el: Element, name: string, next: Function, prev?: Function): void
function removeAllEventListeners(el: Element): void
```

---

## SSR Rendering

### renderToString()

```ts
function renderToString(vnode: VNode): string
```

Synchronously renders a VNode tree to an HTML string.

### renderToStream()

```ts
function renderToStream(vnode: VNode, options?: RenderToStreamOptions): ReadableStream<string>
```

Asynchronously renders a VNode tree as a stream.

### renderToStreamGenerator()

```ts
function renderToStreamGenerator(vnode: VNode): AsyncGenerator<string>
```

Stream rendering using Generator.

### StringRenderer / ssrRenderer

```ts
class StringRenderer implements LytRenderer { /* ... */ }
const ssrRenderer: StringRenderer
```

SSR string renderer.

---

## Hydration

### hydrate()

```ts
function hydrate(app: App, container: Element, options?: HydrateOptions): HydrateResult
```

Client-side hydration entry function.

```ts
interface HydrateOptions {
  warnOnMismatch?: boolean
}

interface HydrateResult {
  success: boolean
  mismatches: number
}
```

### Utility Functions

```ts
function isHydrating(): boolean
function setHydrating(value: boolean): void
function onHydrated(callback: () => void): void
function getHydrateStats(): { mismatches: number, nodes: number }
function resetHydrateStats(): void
```

---

## Multi-Platform Renderers

### NativeRenderer (Mobile)

```ts
class NativeRenderer implements LytRenderer { /* ... */ }
const nativeRenderer: NativeRenderer
```

Native mobile renderer.

### MiniAppRenderer (Mini-Apps)

```ts
class MiniAppRenderer implements LytRenderer { /* ... */ }
const miniAppRenderer: MiniAppRenderer
```

Mini-app renderer.

---

## Vapor Mode API

Vapor Mode is a no-virtual-DOM rendering mode in Lyt.js that achieves precise DOM updates through Signal-driven fine-grained bindings.

### bindStyle(el, sig)

Binds a Signal's value to an element's style, supporting both string and object forms.

```ts
function bindStyle(el: Element, sig: Signal<string | Record<string, string>>): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| el | `Element` | Target DOM element |
| sig | `Signal<string \| Record<string, string>>` | Style Signal (string or object) |

**String form:** The Signal value is set directly as `el.style.cssText`.

**Object form:** Performs per-property diff updates, only modifying changed style properties.

```ts
import { bindStyle } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

// String form
const cssSig = signal('color: red; font-size: 16px')
bindStyle(el, cssSig)

// Object form
const styleSig = signal({ color: 'red', fontSize: '16px' })
bindStyle(el, styleSig)
```

### bindHTML(el, sig)

Binds a Signal's value to an element's innerHTML.

```ts
function bindHTML(el: Element, sig: Signal<string>): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| el | `Element` | Target DOM element |
| sig | `Signal<string>` | HTML content Signal |

```ts
import { bindHTML } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const htmlSig = signal('<strong>Bold text</strong>')
bindHTML(el, htmlSig)
```

### bindIf(el, parentSig, anchor?)

Controls DOM insertion/removal of an element based on a Signal's value.

```ts
function bindIf(el: Element, parentSig: Signal<boolean>, anchor?: Node): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| el | `Element` | DOM element to control |
| parentSig | `Signal<boolean>` | Signal controlling visibility |
| anchor | `Node` (optional) | Anchor node for insertion position |

When `parentSig` is `true`, the element is inserted into the DOM (before the anchor); when `false`, the element is removed from the DOM.

```ts
import { bindIf } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const visible = signal(true)
bindIf(el, visible)
// When visible becomes false, el is removed from DOM
// When visible becomes true, el is re-inserted into DOM
```

### bindEach(container, sig, keyFn, renderFn)

Signal-driven keyed diff list rendering.

```ts
function bindEach<T>(
  container: Element,
  sig: Signal<T[]>,
  keyFn: (item: T) => string | number,
  renderFn: (item: T, index: number) => Element
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| container | `Element` | Parent container element |
| sig | `Signal<T[]>` | List data Signal |
| keyFn | `(item: T) => string \| number` | Key function for identifying list items |
| renderFn | `(item: T, index: number) => Element` | Render function, returns DOM element |

Uses a keyed diff algorithm, performing DOM operations only for added, removed, and moved nodes.

```ts
import { bindEach } from '@lytjs/renderer/vapor'
import { signal } from '@lytjs/reactivity'

const items = signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' }
])

bindEach(
  container,
  items,
  item => item.id,
  (item) => {
    const div = document.createElement('div')
    div.textContent = item.name
    return div
  }
)
```

### Other Vapor Mode APIs

```ts
// Text binding
function bindText(el: Element, sig: Signal<any>): void

// Property binding
function bindProp(el: Element, key: string, sig: Signal<any>): void

// Class binding
function bindClass(el: Element, sig: Signal<string>): void

// Event binding
function bindEvent(el: Element, event: string, handler: Function): void

// Vapor component definition
function defineVaporComponent(options: VaporComponentOptions): VaporComponent

// Vapor app creation
function createVaporApp(component: VaporComponent): VaporApp

// Vapor component rendering
function renderVaporComponent(
  component: VaporComponent,
  container: Element,
  options?: { props?: Record<string, any> }
): void

// Vapor template compilation
function compileToVapor(template: string): VaporRenderFunction
```
