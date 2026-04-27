# Reactivity System

The Lyt.js reactivity system is built on ES6 Proxy, providing complete reactive data tracking and update mechanisms.

## reactive()

Creates a deep reactive object:

```ts
import { reactive } from 'lyt'

const state = reactive({
  count: 0,
  message: 'Hello',
  nested: {
    value: 42
  }
})

// Direct access and modification
state.count++          // Triggers update
state.nested.value++   // Deep reactivity
```

::: code-group

```ts [Type Signature]
function reactive<T extends object>(target: T, options?: ReactiveOptions): T

interface ReactiveOptions {
  deep?: boolean    // Whether to use deep reactivity (default true)
  readonly?: boolean // Whether to make it read-only (default false)
}
```

:::

## readonly()

Creates a read-only reactive proxy:

```ts
import { reactive, readonly } from 'lyt'

const state = reactive({ count: 0 })
const readonlyState = readonly(state)

readonlyState.count = 1  // Warning: Cannot modify read-only object
```

## shallowReactive()

Creates a shallow reactive object (only the first level is reactive):

```ts
import { shallowReactive } from 'lyt'

const state = shallowReactive({
  count: 0,
  nested: { value: 42 }
})

state.count++           // Triggers update
state.nested.value = 1  // Does NOT trigger update (shallow)
```

## ref()

Creates a Ref reference for wrapping primitive values:

```ts
import { ref } from 'lyt'

const count = ref(0)
console.log(count.value)  // 0

count.value++
console.log(count.value)  // 1
```

Ref can also wrap objects (internally uses reactive for deep proxying):

```ts
const user = ref({ name: 'John', age: 25 })
user.value.name = 'Jane'  // Triggers update
```

## shallowRef()

Creates a shallow Ref (no automatic deep proxying):

```ts
const state = shallowRef({ count: 0 })
state.value.count++  // Does NOT trigger update
state.value = { count: 1 }  // Replacing the entire value triggers update
```

## Utility Functions

```ts
import { isRef, unref, toRef, toRefs, triggerRef } from 'lyt'

const count = ref(0)

isRef(count)     // true
unref(count)     // 0 (returns .value if Ref, otherwise returns the original value)

const state = reactive({ name: 'John', age: 25 })
const nameRef = toRef(state, 'name')   // Creates a Ref for state.name
const { name, age } = toRefs(state)    // Converts all properties to Refs

triggerRef(count)  // Manually triggers Ref update
```

## computed()

Creates a computed property (automatically cached based on dependencies):

```ts
import { ref, computed } from 'lyt'

const firstName = ref('John')
const lastName = ref('Doe')

// Read-only computed property
const fullName = computed(() => firstName.value + lastName.value)
console.log(fullName.value)  // 'JohnDoe'

// Writable computed property
const name = computed({
  get: () => firstName.value + lastName.value,
  set: (val) => {
    firstName.value = val[0]
    lastName.value = val.slice(1)
  }
})
```

::: info How it works
Computed properties use a dirty flag for lazy evaluation and caching. They only recompute when dependencies change; otherwise, the cached value is returned.
:::

## watch()

Watches reactive data changes:

```ts
import { ref, reactive, watch } from 'lyt'

// Watch a Ref
const count = ref(0)
watch(count, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`)
})

// Watch a getter function
const state = reactive({ count: 0 })
watch(
  () => state.count,
  (newVal, oldVal) => {
    console.log(`count changed to ${newVal}`)
  },
  { immediate: true, deep: true }
)

// Watch multiple sources
watch([count, () => state.count], ([c1, c2]) => {
  console.log(c1, c2)
})
```

## watchEffect()

Automatically tracks dependencies in a side effect function:

```ts
import { ref, watchEffect } from 'lyt'

const count = ref(0)

const stop = watchEffect(() => {
  console.log(`Current count: ${count.value}`)
})  // Executes immediately

// Stop watching
stop()
```

## nextTick()

Executes a callback in the next microtask, after DOM updates are complete:

```ts
import { ref, nextTick } from 'lyt'

const count = ref(0)

async function increment() {
  count.value++
  await nextTick()
  // DOM has been updated
  console.log('DOM update complete')
}
```
