# Component API

The Lyt.js component system provides component definition, Props, event emission, lifecycle hooks, slots, and built-in components — the foundation for building complex applications.

## Component Definition

### defineComponent()

Defines a component.

```ts
function defineComponent(options: ComponentOptions): ComponentDefine
```

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

**Example:**
```ts
import { defineComponent, ref } from '@lytjs/core'

const Counter = defineComponent({
  name: 'Counter',
  props: {
    title: {
      type: String,
      default: 'Counter'
    },
    initialCount: {
      type: Number,
      default: 0
    }
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

## Props

### PropOptions

```ts
interface PropOptions {
  type?: PropType | PropType[]
  default?: any
  required?: boolean
  validator?: (value: any) => boolean
}
```

**Example:**
```ts
props: {
  // Basic types
  name: String,
  age: Number,

  // With default value
  title: {
    type: String,
    default: 'Default Title'
  },

  // Required
  id: {
    type: String,
    required: true
  },

  // Custom validation
  score: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 100
    }
  },

  // Multiple types
  value: {
    type: [String, Number],
    default: ''
  }
}
```

---

## Emits

### Declaring Events

```ts
emits: ['update:count', 'custom-event']
```

### Using emit in Composition API

```ts
import { defineComponent, ref } from '@lytjs/core'

const ChildComponent = defineComponent({
  name: 'ChildComponent',
  emits: ['update:count', 'custom-event'],
  setup(props, { emit }) {
    const count = ref(0)

    function increment() {
      count.value++
      emit('update:count', count.value)
      emit('custom-event', { count: count.value, message: 'Count updated' })
    }

    return { count, increment }
  },
  template: `
    <button @click="increment">Increment</button>
    <p>Child count: {{ count }}</p>
  `
})

// Parent component usage
const ParentComponent = defineComponent({
  components: { ChildComponent },
  setup() {
    const parentCount = ref(0)

    function handleCountUpdate(newCount) {
      parentCount.value = newCount
    }

    function handleCustomEvent(data) {
      console.log('Custom event:', data)
    }

    return { parentCount, handleCountUpdate, handleCustomEvent }
  },
  template: `
    <div>
      <p>Parent count: {{ parentCount }}</p>
      <ChildComponent
        @update:count="handleCountUpdate"
        @custom-event="handleCustomEvent"
      />
    </div>
  `
})
```

---

## Slots

### Default Slot

```ts
// Parent component
const Parent = defineComponent({
  template: `
    <Child>
      <p>This is default slot content</p>
    </Child>
  `
})

// Child component
const Child = defineComponent({
  template: `
    <div>
      <h2>Child Component</h2>
      <slot></slot> <!-- Renders default slot -->
    </div>
  `
})
```

### Named Slots

```ts
// Parent component
const Parent = defineComponent({
  template: `
    <Child>
      <template #header>
        <h1>Page Title</h1>
      </template>
      <template #content>
        <p>Page Content</p>
      </template>
      <template #footer>
        <p>Page Footer</p>
      </template>
    </Child>
  `
})

// Child component
const Child = defineComponent({
  template: `
    <div>
      <header><slot name="header"></slot></header>
      <main><slot name="content"></slot></main>
      <footer><slot name="footer"></slot></footer>
    </div>
  `
})
```

### Scoped Slots

```ts
// Parent component
const Parent = defineComponent({
  template: `
    <Child>
      <template #item="{ todo }">
        <li>
          <input type="checkbox" :checked="todo.done" />
          <span>{{ todo.text }}</span>
        </li>
      </template>
    </Child>
  `
})

// Child component
const Child = defineComponent({
  setup() {
    const todos = ref([
      { id: 1, text: 'Learn Lyt.js', done: false },
      { id: 2, text: 'Build an app', done: true }
    ])
    return { todos }
  },
  template: `
    <ul>
      <li each="todo in todos" :key="todo.id">
        <slot name="item" :todo="todo"></slot>
      </li>
    </ul>
  `
})
```

### Slot API

| Function | Signature | Description |
|----------|-----------|-------------|
| `initSlots` | `(instance, children) => void` | Initialize component instance slots |
| `renderSlot` | `(slots, name, props?, fallback?) => any` | Render a named slot |
| `hasSlot` | `(slots, name) => boolean` | Check if a named slot exists |

---

## Composition API setup

### setup() Function

The `setup()` function is the entry point for the Composition API. It runs before the component is created and receives props and context as arguments.

```ts
setup(props: Props, context: SetupContext): object
```

**SetupContext:**
```ts
interface SetupContext {
  attrs: Record<string, any>    // Non-prop attributes
  slots: Slots                   // Slots
  emit: (event: string, ...args: any[]) => void  // Event emitter
}
```

**Example:**
```ts
import { defineComponent, ref, computed, onMounted } from '@lytjs/core'

const MyComponent = defineComponent({
  props: {
    initialCount: { type: Number, default: 0 }
  },
  setup(props, { emit, attrs, slots }) {
    const count = ref(props.initialCount)
    const doubleCount = computed(() => count.value * 2)

    function increment() {
      count.value++
      emit('change', count.value)
    }

    onMounted(() => {
      console.log('Component mounted with attrs:', attrs)
    })

    return { count, doubleCount, increment }
  }
})
```

### getCurrentInstance()

```ts
function getCurrentInstance(): ComponentInternalInstance | null
```

Gets the current component instance (only available inside `setup`).

**Example:**
```ts
import { defineComponent, getCurrentInstance } from '@lytjs/core'

defineComponent({
  setup() {
    const instance = getCurrentInstance()

    if (instance) {
      console.log('Component instance:', instance)
      console.log('Component props:', instance.props)
    }

    return {}
  }
})
```

---

## Built-in Components

### KeepAlive

Caches inactive component instances.

```ts
const KeepAlive: ComponentDefine
```

**Example:**
```ts
<KeepAlive>
  <component :is="currentComponent" />
</KeepAlive>

<!-- With include/exclude -->
<KeepAlive include="ComponentA,ComponentB" exclude="ComponentC">
  <component :is="currentComponent" />
</KeepAlive>

<!-- With max cache -->
<KeepAlive :max="10">
  <component :is="currentComponent" />
</KeepAlive>
```

### Suspense

Handles loading states for asynchronous components.

```ts
const Suspense: ComponentDefine
```

**Example:**
```ts
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <div>Loading...</div>
  </template>
</Suspense>
```

### Transition

Provides transition animations for elements entering/leaving.

```ts
const Transition: ComponentDefine
```

**Example:**
```ts
<Transition name="fade" mode="out-in">
  <div if="show">Hello</div>
</Transition>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

**Transition Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| name | `string` | - | Transition name prefix |
| mode | `string` | - | Transition mode (`in-out`, `out-in`, `default`) |
| appear | `boolean` | `false` | Apply transition on initial render |
| duration | `number \| { enter, leave }` | - | Transition duration |
| type | `string` | - | Transition type (`transition` or `animation`) |

### TransitionGroup

Provides transition animations for list items (add/remove/move).

```ts
const TransitionGroup: ComponentDefine
```

**Example:**
```ts
<TransitionGroup name="list" tag="ul">
  <li each="item in items" :key="item.id">
    {{ item.text }}
  </li>
</TransitionGroup>
```

### defineAsyncComponent()

Defines an asynchronously loaded component.

```ts
function defineAsyncComponent(options: AsyncComponentOptions): ComponentDefine
```

**Example:**
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

---

## Advanced Component Patterns

### Dynamic Components

```ts
const DynamicComponent = defineComponent({
  setup() {
    const currentComponent = ref('ComponentA')

    const components = {
      ComponentA: defineComponent({ template: '<div>Component A</div>' }),
      ComponentB: defineComponent({ template: '<div>Component B</div>' })
    }

    function switchComponent() {
      currentComponent.value = currentComponent.value === 'ComponentA' ? 'ComponentB' : 'ComponentA'
    }

    return { currentComponent, components, switchComponent }
  },
  template: `
    <div>
      <button @click="switchComponent">Switch Component</button>
      <component :is="components[currentComponent]" />
    </div>
  `
})
```

### Recursive Components

```ts
const Tree = defineComponent({
  name: 'Tree', // Must specify a name
  props: {
    data: { type: Object, required: true }
  },
  template: `
    <div class="tree-node">
      <span>{{ data.name }}</span>
      <div if="data.children && data.children.length" class="tree-children">
        <Tree
          each="child in data.children"
          :key="child.id"
          :data="child"
        />
      </div>
    </div>
  `
})
```

### Higher-Order Components

```ts
function withLogging(Component) {
  return defineComponent({
    setup(props, { slots, attrs }) {
      console.log('Component mounted')

      return () => h(Component, props, slots)
    }
  })
}

// Usage
const LoggedComponent = withLogging(MyComponent)
```

### Functional Components

```ts
const FunctionalComponent = defineComponent({
  functional: true,
  props: {
    message: String
  },
  render(h, { props }) {
    return h('div', null, props.message)
  }
})
```

---

## Component Communication

### 1. Props / Events

For parent-child component communication:

```ts
// Parent component
<ChildComponent
  :message="parentMessage"
  @update:message="parentMessage = $event"
/>

// Child component
props: { message: String },
methods: {
  updateMessage() {
    this.$emit('update:message', 'New message')
  }
}
```

### 2. provide / inject

For cross-hierarchy component communication:

```ts
// Ancestor component
provide('key', value)

// Descendant component
const value = inject('key')
```

### 3. Event Bus

For communication between any components:

```ts
// eventBus.js
import { createApp } from '@lytjs/core'
const eventBus = createApp({})

export default eventBus

// Component A
eventBus.emit('event', data)

// Component B
eventBus.on('event', (data) => {
  // Handle event
})
```

### 4. State Management

For global state management:

```ts
// store.js
import { createStore } from '@lytjs/store'

export const store = createStore('app', {
  state: { count: 0 },
  actions: {
    increment(s) { s.count++ }
  }
})

// In components
import { store } from './store'
store.actions.increment()
console.log(store.state.count)
```

---

## Best Practices

### 1. Component Design

- **Single responsibility**: Each component handles one concern
- **Proper splitting**: Break complex components into smaller sub-components
- **Naming conventions**: Use PascalCase for component names, kebab-case in templates
- **Props design**: Use TypeScript types, provide defaults and validation

### 2. Performance Optimization

- **Use `if` and `show`**: Choose the right conditional rendering for the scenario
- **Use `key`**: Use unique keys in `each` loops
- **Avoid unnecessary updates**: Optimize with computed and watch
- **Use KeepAlive**: Cache inactive components
- **Async components**: Lazy-load large components
