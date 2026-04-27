# Dual Reactivity System: Proxy & Signal

Lyt.js uniquely provides two reactivity systems side by side — **Proxy Mode** and **Signal Mode**. Developers can freely choose between them based on their use case, or even mix both within the same project.

## Overview

| Feature | Proxy Mode | Signal Mode |
|---------|-----------|-------------|
| Core mechanism | ES6 Proxy intercepting get/set | Explicit Signal read/write |
| Dependency tracking | Automatic (on property access) | Automatic (on Signal call) |
| Best for | Deeply nested objects, forms, Vue-like DX | Fine-grained updates, large lists, functional style |
| API style | `reactive()` / `ref()` / `computed()` / `watch()` | `signal()` / `computed()` / `effect()` / `batch()` |
| Learning curve | Low (Vue 3 compatible) | Medium (similar to Solid.js) |
| Granularity control | Object-level | Value-level |

Both systems share the same scheduler (`queueJob` from `@lytjs/common`), so their updates are correctly merged and ordered.

## Proxy Mode

Proxy Mode is built on ES6 Proxy, automatically tracking dependencies by intercepting property access and modification. Its API is fully compatible with Vue 3.

### When to Use

- Deeply nested configuration or state objects
- Form data management (naturally supports nested structures)
- Projects migrating from Vue 3
- Developers who prefer a declarative, object-oriented style

### Core API

#### `reactive()`

Create a deeply reactive object:

```ts
import { reactive } from 'lyt'

const state = reactive({
  count: 0,
  user: {
    name: 'Alice',
    address: {
      city: 'Beijing'
    }
  }
})

// Direct access and mutation with automatic dependency tracking
state.count++
state.user.address.city = 'Shanghai'  // Deep reactivity
```

::: code-group

```ts [Type Signature]
function reactive<T extends object>(target: T, options?: ReactiveOptions): T

interface ReactiveOptions {
  deep?: boolean     // Deep reactivity (default true)
  readonly?: boolean // Read-only mode (default false)
}
```

:::

#### `ref()`

Create a Ref for wrapping primitive values:

```ts
import { ref } from 'lyt'

const count = ref(0)
console.log(count.value)  // 0
count.value++

// Can also wrap objects
const user = ref({ name: 'Alice' })
user.value.name = 'Bob'  // Deep reactivity
```

#### `computed()`

Create a computed property (lazy evaluation + caching):

```ts
import { ref, computed } from 'lyt'

const count = ref(0)
const double = computed(() => count.value * 2)

console.log(double.value)  // 0
count.value = 5
console.log(double.value)  // 10
```

#### `watch()` / `watchEffect()`

Watch for reactive data changes:

```ts
import { ref, watch, watchEffect } from 'lyt'

const count = ref(0)

// watch: explicitly specify the source
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`)
})

// watchEffect: auto-track dependencies
watchEffect(() => {
  console.log(`Current value: ${count.value}`)
})
```

### Complete Example

```ts
import { reactive, ref, computed, watch, watchEffect } from 'lyt'

// Use reactive for complex state
const form = reactive({
  username: '',
  email: '',
  preferences: {
    theme: 'light',
    language: 'en-US'
  }
})

// Use ref for simple values
const isSubmitting = ref(false)

// Computed property
const isValid = computed(() => {
  return form.username.length >= 3 && form.email.includes('@')
})

// Watch for changes
watchEffect(() => {
  console.log(`Form valid: ${isValid.value}`)
})

watch(() => form.preferences.theme, (newTheme) => {
  console.log(`Theme changed to: ${newTheme}`)
})
```

## Signal Mode

Signal Mode is built on explicit Signal read/write, providing finer-grained update control and better performance. Its design is similar to Solid.js and Angular Signals.

### When to Use

- Performance-sensitive scenarios requiring fine-grained updates
- Large lists or table rendering
- Functional programming style
- Scenarios requiring precise dependency tracking control

### Core API

#### `signal()`

Create a writable signal:

```ts
import { signal } from 'lyt'

const count = signal(0)
console.log(count())  // 0 — call to read

count.set(1)              // Set value
count.update(n => n + 1)  // Update based on previous value
console.log(count())  // 2
```

::: code-group

```ts [Type Signature]
function signal<T>(initialValue: T): WritableSignal<T>

interface WritableSignal<T> extends Signal<T> {
  set(value: T): void
  update(fn: (prev: T) => T): void
  dispose(): void
}

interface Signal<T> {
  (): T  // Call to read
}
```

:::

#### `computed()` (Signal version)

Create a computed signal (read-only, lazy evaluation):

```ts
import { signal, computed as computedSignal } from 'lyt'

const count = signal(0)
const double = computedSignal(() => count() * 2)

console.log(double())  // 0
count.set(5)
console.log(double())  // 10
```

::: tip
In the unified export, the Signal `computed` is aliased as `computedSignal` to distinguish it from the Proxy mode `computed`. You can also import it directly from `@lytjs/reactivity/signal`.
:::

#### `effect()` (Signal version)

Create a side effect that auto-tracks Signal dependencies:

```ts
import { signal, effect as signalEffect } from 'lyt'

const count = signal(0)

const dispose = signalEffect((onCleanup) => {
  console.log(`Current value: ${count()}`)
  onCleanup(() => {
    console.log('Cleaning up old effect')
  })
})

count.set(1)   // Output: Cleaning up -> Current value: 1
dispose()      // Stop the effect
```

#### `batch()`

Batch updates, deferring notifications until the outermost batch completes:

```ts
import { signal, effect as signalEffect, batch } from 'lyt'

const a = signal(0)
const b = signal(0)

signalEffect(() => {
  console.log(`a=${a()}, b=${b()}`)
})

// Without batch: effect runs twice
a.set(1)  // Triggers once
b.set(1)  // Triggers again

// With batch: effect runs only once
batch(() => {
  a.set(2)
  b.set(2)
})  // Only one trigger, output: a=2, b=2
```

#### `untrack()`

Read a Signal without creating a subscription:

```ts
import { signal, effect as signalEffect, untrack } from 'lyt'

const count = signal(0)
const multiplier = signal(2)

signalEffect(() => {
  // Changes to multiplier won't trigger this effect
  const m = untrack(() => multiplier())
  console.log(`Result: ${count() * m}`)
})
```

### Component Integration API

Lyt.js provides bridge utilities between Signals and component render functions:

```ts
import {
  useSignal,
  useSignalState,
  enterSignalComponentContext,
  onSignalCleanup
} from 'lyt'

// Using Signals in a component
function setup() {
  // Create a Signal bound to the component lifecycle
  const [count, setCount] = useSignalState(0)

  // Track Signal dependencies in the render function
  const currentCount = useSignal(count)

  // Register cleanup on component unmount
  onSignalCleanup(() => {
    console.log('Component unmounted, cleaning up')
  })

  return { count, setCount }
}
```

### Complete Example

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch,
  untrack
} from 'lyt'

// Create signals
const items = signal<string[]>([])
const filter = signal('')
const selectedId = signal<number | null>(null)

// Computed signal: filtered list
const filteredItems = computedSignal(() => {
  const keyword = filter()
  if (!keyword) return items()
  return items().filter(item =>
    item.toLowerCase().includes(keyword.toLowerCase())
  )
})

// Computed signal: selected item
const selectedItem = computedSignal(() => {
  const id = selectedId()
  if (id === null) return null
  return items()[id] ?? null
})

// Side effect: logging
signalEffect(() => {
  console.log(`${filteredItems().length} items matched`)
})

// Batch operations
function addItem(newItem: string) {
  batch(() => {
    items.update(list => [...list, newItem])
    filter.set('')  // Reset filter
  })
}
```

## Interoperability

Proxy Mode and Signal Mode can be freely mixed. Below are common interoperability patterns.

### Using Signals in a Proxy Component

When your component primarily uses `reactive` / `ref`, but a submodule needs Signal's fine-grained control:

```ts
import {
  reactive,
  ref,
  computed,
  watch,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// Proxy mode for form state
const form = reactive({
  username: '',
  email: ''
})

// Signal mode for search (needs fine-grained updates)
const searchQuery = signal('')
const searchResults = computedSignal(() => {
  // Reading Proxy data inside Signal computation
  return performSearch(searchQuery(), form.username)
})

// Signal side effect
signalEffect(() => {
  console.log(`Search "${searchQuery()}" returned ${searchResults().length} results`)
})

// Update Signal from Proxy watch
watch(() => form.username, (newName) => {
  searchQuery.set(newName)  // Update Signal from Proxy
})
```

### Using Proxy Refs in a Signal Component

When your component primarily uses Signals, but needs to interact with a composable that uses `ref`:

```ts
import {
  ref,
  signal,
  computed as computedSignal,
  effect as signalEffect,
  watch
} from 'lyt'

// A composable using ref (possibly from a third-party library)
function useCounter(initial: number) {
  const count = ref(initial)
  const increment = () => count.value++
  return { count, increment }
}

// Use in a Signal component
const counter = useCounter(0)
const displayCount = computedSignal(() => {
  // Reading ref inside Signal computation
  return counter.count.value * 2
})

// Use Proxy watch to listen for ref changes
watch(counter.count, (newVal) => {
  console.log(`Counter updated to: ${newVal}`)
})

// Read ref in Signal effect
signalEffect(() => {
  console.log(`Double count: ${displayCount()}`)
})
```

### Bridging with `toRef` / `toRefs`

`toRef` and `toRefs` can convert `reactive` object properties to `Ref`s, making them easy to use in Signal contexts:

```ts
import { reactive, toRef, toRefs, signal, computed as computedSignal } from 'lyt'

const state = reactive({
  firstName: 'John',
  lastName: 'Doe',
  age: 25
})

// Convert a single property to Ref
const firstNameRef = toRef(state, 'firstName')

// Convert all properties to Refs
const refs = toRefs(state)

// Use Refs in Signal computation
const fullName = computedSignal(() => {
  return refs.firstName.value + refs.lastName.value
})
```

### Best Practices

1. **Stay consistent**: Use the same mode within a module; avoid frequent switching
2. **Clear boundaries**: Use `ref` as a bridge when passing data between Proxy and Signal
3. **Signals for hot paths**: Implement performance-sensitive parts (large lists, frequently updated data) with Signals
4. **Proxy for data modeling**: Manage complex data structures with Proxy, leveraging its deep reactivity

### Anti-Patterns

```ts
// Anti-pattern 1: Mixing both systems in a single effect
// This can lead to confusing dependency tracking
import { reactive, signal, effect as signalEffect } from 'lyt'

const state = reactive({ count: 0 })
const count = signal(0)

signalEffect(() => {
  // Not recommended: reading both reactive and signal
  console.log(state.count, count())
})

// Recommended: Separate concerns
signalEffect(() => {
  console.log(count())
})
watch(() => state.count, (val) => {
  console.log(val)
})
```

```ts
// Anti-pattern 2: Side effects in Signal computed
import { signal, computed as computedSignal } from 'lyt'

const count = signal(0)

// Not recommended: computed signals should not have side effects
const bad = computedSignal(() => {
  console.log('This runs on every computation')  // Side effect
  return count() * 2
})

// Recommended: Put side effects in effect
import { effect as signalEffect } from 'lyt'

const good = computedSignal(() => count() * 2)
signalEffect(() => {
  console.log(`Result: ${good()}`)
})
```

## Performance Comparison

### Proxy Mode

**Strengths:**
- Deeply nested objects are automatically reactive, no manual management needed
- Clean and intuitive API, low learning curve
- Fully compatible with the Vue 3 ecosystem

**Weaknesses:**
- Proxy itself has some runtime overhead
- Dependency tracking is property-granular; modifying one property may trigger multiple effects
- Deep proxying of large objects incurs memory overhead

**Best for:**
- Small to medium applications
- Structured data like forms and configurations
- Projects migrating from Vue 3

### Signal Mode

**Strengths:**
- Explicit dependency tracking for precise update control
- No Proxy overhead, better runtime performance
- `batch()` effectively merges multiple updates
- Naturally supports fine-grained updates (only update what actually changed)

**Weaknesses:**
- Requires manual management of each state's Signal
- Nested objects need a Signal for each reactive property, more code
- Steeper learning curve

**Best for:**
- Performance-sensitive applications
- Large lists, tables, canvases with high-frequency updates
- Functional programming style

### Performance Comparison Table

| Scenario | Proxy Mode | Signal Mode | Recommendation |
|----------|-----------|-------------|----------------|
| Simple counter | Excellent | Excellent | Either |
| Deeply nested objects | Excellent (auto) | Fair (manual) | Proxy |
| Large list (1000+ items) | Fair | Excellent | Signal |
| Frequent batch updates | Fair | Excellent (batch) | Signal |
| Form management | Excellent | Fair | Proxy |
| Computation-intensive | Good | Excellent | Signal |
| Memory usage | Higher (Proxy cache) | Lower | Signal |

### Benchmark Reference

```ts
import { reactive, ref, signal, computed as computedSignal, effect as signalEffect, batch } from 'lyt'

// Proxy mode: updating a nested object
const proxyState = reactive({
  items: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false
  }))
})

// Signal mode: updating a Signal array
const signalItems = signal(
  Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    selected: false
  }))
)

// Proxy: modifying a single item triggers effects depending on the object
// Signal: only effects depending on that specific item are triggered
```

## Migration Guide

If you have already developed a project using Proxy Mode and want to gradually migrate to Signal Mode, follow these steps.

### Step 1: Identify Migration Candidates

Prioritize migrating these scenarios:

- Frequently updated data (real-time data streams, animation state)
- Large lists or tables
- Performance bottleneck modules

### Step 2: Replace Module by Module

```ts
// Before migration (Proxy mode)
import { reactive, ref, computed, watch } from 'lyt'

const state = reactive({
  items: [],
  filter: '',
  selectedId: null
})

const filteredItems = computed(() => {
  return state.items.filter(item =>
    item.name.includes(state.filter)
  )
})

watch(() => state.selectedId, (id) => {
  console.log(`Selected: ${id}`)
})
```

```ts
// After migration (Signal mode)
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

const items = signal<Item[]>([])
const filter = signal('')
const selectedId = signal<number | null>(null)

const filteredItems = computedSignal(() => {
  const keyword = filter()
  return items().filter(item =>
    item.name.includes(keyword)
  )
})

signalEffect(() => {
  const id = selectedId()
  console.log(`Selected: ${id}`)
})
```

### Step 3: Leverage batch for Optimization

Combine multiple Signal updates into a single batch:

```ts
// Before
state.items.push(newItem)
state.filter = ''
state.selectedId = null

// After
batch(() => {
  items.update(list => [...list, newItem])
  filter.set('')
  selectedId.set(null)
})
```

### Step 4: Handle Interoperability

If the project cannot be fully migrated at once, use these strategies:

```ts
// Strategy 1: Use ref as a bridge
import { ref, toRef, signal, computed as computedSignal } from 'lyt'

const proxyState = reactive({ count: 0 })
const countRef = toRef(proxyState, 'count')
const countSignal = computedSignal(() => countRef.value)

// Strategy 2: Use watch to sync state
import { watch } from 'lyt'

const sourceRef = ref(0)
const targetSignal = signal(0)

watch(sourceRef, (newVal) => {
  targetSignal.set(newVal)
})
```

### Important Notes

1. **Signal has no deep reactivity**: Nested objects require manually creating Signals for each reactive property
2. **Signal `computed` is read-only**: Unlike Proxy mode, writable computed properties with `set` are not supported
3. **Signal `effect` returns a dispose function**: Instead of Proxy mode's `stop()` method
4. **Signal uses `batch()` instead of `nextTick()`**: To control update timing

## Related Documentation

- [Reactivity System](./reactivity.md) — Detailed Proxy mode documentation
- [Composition API Guide](./composition-api.md) — Using reactive APIs in components
- [Performance Optimization](./performance.md) — Framework performance strategies
- [Example: Proxy Basics](./examples/proxy-basic.md)
- [Example: Signal Basics](./examples/signal-basic.md)
- [Example: Mixed Mode Usage](./examples/mixed-mode.md)
