# Reactivity API

The reactivity system is the core of Lyt.js. It provides ES6 Proxy-based reactive data tracking and update mechanisms. It allows you to create reactive data that automatically updates the UI or executes side effects when data changes.

## Core APIs

### ref()

Creates a reactive reference for wrapping primitive values.

```ts
function ref<T>(value: T): Ref<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| value | `T` | Initial value |

**Returns:** `Ref<T>`

**Use cases:**
- Managing reactive data for primitive types
- Managing state in the Composition API
- As return values of computed properties

**Example:**
```ts
const count = ref(0)
const message = ref('Hello')
const user = ref({ name: 'John' })

// Modify values
count.value++  // Triggers update
message.value = 'Hello Lyt.js'  // Triggers update
user.value.name = 'Jane'  // Triggers update (ref auto-deep-proxies objects)
```

**Related APIs:** [`shallowRef()`](#shallowref), [`isRef()`](#utility-functions), [`toRef()`](#utility-functions), [`toRefs()`](#utility-functions)

---

### shallowRef()

Creates a shallow Ref (no automatic deep proxying).

```ts
function shallowRef<T>(value: T): Ref<T>
```

**Use cases:**
- When you don't need deep reactivity
- Working with large objects or third-party library objects
- Improving performance

**Example:**
```ts
const state = shallowRef({ count: 0 })

// Does NOT trigger update
state.value.count++

// Triggers update
state.value = { count: 1 }
```

---

### reactive()

Creates a deep reactive proxy object.

```ts
function reactive<T extends object>(target: T, options?: ReactiveOptions): T
```

| Parameter | Type | Description |
|-----------|------|-------------|
| target | `object` | Object to proxy |
| options.deep | `boolean` | Whether to use deep reactivity, default `true` |
| options.readonly | `boolean` | Whether to make it read-only, default `false` |

**Returns:** `T` — Reactive proxy object

**Use cases:**
- Managing complex state objects
- When you need deep reactivity (default behavior)
- Suitable as component state management

**Example:**
```ts
const state = reactive({
  count: 0,
  user: {
    name: 'John',
    age: 30,
    address: {
      city: 'Beijing',
      district: 'Haidian'
    }
  }
})

// Triggers update
state.count++
// Deep reactivity - also triggers update
state.user.address.city = 'Shanghai'
```

**Related APIs:** [`readonly()`](#readonly), [`shallowReactive()`](#shallowreactive)

---

### shallowReactive()

Creates a shallow reactive proxy (only the first level is reactive).

```ts
function shallowReactive<T extends object>(target: T): T
```

**Use cases:**
- When you only care about first-level property changes
- Improving performance by avoiding deep proxying overhead
- Working with large objects

**Example:**
```ts
const state = shallowReactive({
  count: 0,
  nested: { value: 1 }
})

state.count++           // Triggers update
state.nested.value = 2  // Does NOT trigger update

// But replacing the nested object triggers update
state.nested = { value: 3 } // Triggers update
```

---

### readonly()

Creates a read-only reactive proxy.

```ts
function readonly<T extends object>(target: T): Readonly<T>
```

**Use cases:**
- Protecting state from modification
- Passing immutable data to child components
- Preventing accidental modification of global state

**Example:**
```ts
const state = reactive({ count: 0 })
const copy = readonly(state)

// Attempting to modify produces a warning
copy.count = 1  // Warning: Cannot modify read-only object

// But the original object can still be modified
state.count = 1 // Works normally
console.log(copy.count) // 1 (auto-updated)
```

---

### computed()

Creates a computed property (automatically cached based on dependencies).

```ts
function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>
function computed<T>(options: WritableComputedOptions<T>): WritableComputedRef<T>
```

**Use cases:**
- Deriving values from other reactive data
- Caching computation results
- Creating writable computed properties

**Example:**
```ts
const count = ref(0)

// Basic computed property
const double = computed(() => count.value * 2)
console.log(double.value)  // 0
count.value = 1
console.log(double.value)  // 2 (auto-updated)

// Writable computed property
const sum = computed({
  get: () => count.value * 2,
  set: (val) => { count.value = val / 2 }
})

sum.value = 4  // Automatically sets count.value = 2
console.log(count.value)  // 2
```

---

### watch()

Watches reactive data changes.

```ts
function watch<T>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle
```

| Parameter | Type | Description |
|-----------|------|-------------|
| source | `WatchSource \| WatchSource[]` | Watch source |
| callback | `WatchCallback` | Callback function `(newVal, oldVal, onCleanup) => void` |
| options.immediate | `boolean` | Whether to execute immediately, default `false` |
| options.deep | `boolean` | Whether to deep watch, default `true` |
| options.flush | `'pre' \| 'post' \| 'sync'` | Flush timing |

**Returns:** `WatchStopHandle` — Function to stop watching

**Use cases:**
- Executing side effects when data changes
- Needing to compare new and old values
- Watching multiple data sources
- Cleaning up side effects

**Example:**
```ts
const count = ref(0)
const user = reactive({ name: 'John' })

// Watch a single ref
const stop1 = watch(count, (newVal, oldVal) => {
  console.log(`Count changed: ${oldVal} -> ${newVal}`)
})

// Watch a reactive object
const stop2 = watch(
  () => user.name,
  (newName, oldName) => {
    console.log(`Name changed: ${oldName} -> ${newName}`)
  }
)

// Watch multiple sources
const stop3 = watch([count, () => user.name], ([newCount, newName], [oldCount, oldName]) => {
  console.log('Multiple sources changed')
})

// Cleanup side effects
const stop4 = watch(count, (newVal, oldVal, onCleanup) => {
  const timer = setTimeout(() => {
    console.log(`Delayed: ${newVal}`)
  }, 1000)

  onCleanup(() => {
    clearTimeout(timer)
  })
})

// Stop watching
stop1()
```

---

### watchEffect()

Automatically tracks dependencies in a side effect function.

```ts
function watchEffect(
  effect: EffectFn,
  options?: WatchEffectOptions
): WatchStopHandle
```

**Use cases:**
- Automatically tracking all dependencies
- No need to compare new and old values
- Only caring about side effect execution

**Example:**
```ts
const count = ref(0)
const message = ref('Hello')

// Automatically tracks dependencies
const stop = watchEffect(() => {
  console.log(`Count: ${count.value}, Message: ${message.value}`)
}) // Executes immediately: Count: 0, Message: Hello

// Triggers update
count.value++ // Output: Count: 1, Message: Hello
message.value = 'Hello Lyt.js' // Output: Count: 1, Message: Hello Lyt.js

// Stop watching
stop()
```

---

## Signal API

Lyt.js supports a Signal-based reactivity mode alongside the Proxy-based system. Signals provide fine-grained reactivity with minimal overhead.

### signal()

Creates a reactive signal.

```ts
function signal<T>(initialValue: T): Signal<T>
```

**Example:**
```ts
import { signal, computed, effect } from '@lytjs/core'

const count = signal(0)
const double = computed(() => count() * 2)

effect(() => {
  console.log(`Count: ${count()}, Double: ${double()}`)
})

count() // Read value: 0
count.set(1) // Set value, triggers effect
count.update(v => v + 1) // Update with function
```

### effect()

Creates a reactive effect that automatically tracks signal dependencies.

```ts
function effect(fn: () => void, options?: EffectOptions): Effect
```

---

## Utility Functions

### isReactive()

```ts
function isReactive(value: unknown): boolean
```

Checks if a value is a reactive proxy object.

**Example:**
```ts
const state = reactive({ count: 0 })
const normalObj = { count: 0 }

console.log(isReactive(state)) // true
console.log(isReactive(normalObj)) // false
```

### isReadonly()

```ts
function isReadonly(value: unknown): boolean
```

Checks if a value is a readonly proxy object.

### isRef()

```ts
function isRef<T>(value: unknown): value is Ref<T>
```

Checks if a value is a Ref object.

### unref()

```ts
function unref<T>(value: T | Ref<T>): T
```

If the value is a Ref, returns `.value`; otherwise returns the original value.

**Example:**
```ts
const count = ref(0)
const normalValue = 10

console.log(unref(count)) // 0
console.log(unref(normalValue)) // 10
```

### toRef()

```ts
function toRef<T extends object, K extends keyof T>(obj: T, key: K): Ref<T[K]>
```

Creates a Ref for a specific property of a reactive object.

**Use cases:**
- When you need to pass a reactive object's property as a ref
- Maintaining reactive connection with the original object

**Example:**
```ts
const state = reactive({ count: 0, name: 'John' })
const countRef = toRef(state, 'count')

countRef.value++ // Also modifies state.count
console.log(state.count) // 1

state.count = 5 // Also updates countRef.value
console.log(countRef.value) // 5
```

### toRefs()

```ts
function toRefs<T extends object>(obj: T): { [K in keyof T]: Ref<T[K]> }
```

Converts all properties of a reactive object to Refs.

**Use cases:**
- Returning multiple reactive states in the Composition API
- Maintaining reactive connection with the original object

**Example:**
```ts
const state = reactive({
  count: 0,
  name: 'John',
  age: 30
})

const refs = toRefs(state)

// All properties become refs
refs.count.value++
console.log(state.count) // 1

state.name = 'Jane'
console.log(refs.name.value) // Jane

// Destructuring preserves reactivity
const { count, name, age } = toRefs(state)
```

### triggerRef()

```ts
function triggerRef(ref: Ref): void
```

Manually triggers a Ref update.

**Use cases:**
- When using shallowRef and modifying deep properties
- Forcing side effects that depend on the ref

**Example:**
```ts
const state = shallowRef({ count: 0 })

watchEffect(() => {
  console.log(`Count: ${state.value.count}`)
}) // Output: Count: 0

// Modifying deep property does not auto-trigger
state.value.count++

// Manually trigger update
triggerRef(state) // Output: Count: 1
```

### toRaw()

```ts
function toRaw<T>(observed: T): T
```

Gets the original object of a reactive proxy.

**Use cases:**
- When you need to bypass the reactivity system and operate on the raw object
- Improving performance by avoiding reactive proxy overhead
- Integrating with third-party libraries

---

## Best Practices

### 1. Choosing the Right Reactive API

- **Primitive types**: Use `ref()`
- **Complex objects**: Use `reactive()`
- **Only care about the first level**: Use `shallowRef()` or `shallowReactive()`
- **Derived values**: Use `computed()`

### 2. Performance Optimization

- **Large objects**: Use `shallowReactive()` or `shallowRef()`
- **Frequent access**: Use `toRefs()` for destructured access
- **Avoid deep watching**: Use `watch` with `deep: false`
- **Batch updates**: Use `nextTick()` or effect schedulers

### 3. Code Organization

- **Composables**: Encapsulate related reactive logic in composable functions
- **Single responsibility**: Each composable handles one concern
- **Clear naming**: Use descriptive function and variable names
- **Type annotations**: Use TypeScript types for better code readability

### 4. Common Pitfalls

- **Modifying ref values**: Remember to use `.value`
- **Deep object reactivity**: `reactive` auto-deep-proxies, `shallowReactive` does not
- **Array operations**: Mutation methods (push, splice, etc.) trigger updates
- **Object replacement**: Replacing an entire reactive object loses reactivity
- **Circular dependencies**: Avoid circular dependencies between computed properties
