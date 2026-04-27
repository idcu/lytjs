# Component System

Lyt.js provides a complete component system supporting both the Options API and the Composition API.

## defineComponent()

Use `defineComponent` to define components:

```ts
import { defineComponent, ref, computed } from 'lyt'

const Counter = defineComponent({
  name: 'Counter',

  // Props declaration
  props: {
    initialCount: { type: Number, default: 0 },
    step: { type: Number, default: 1 }
  },

  // Internal state
  state() {
    return {
      count: ref(0)
    }
  },

  // Initialization
  init() {
    this.count.value = this.$props.initialCount
  },

  // Computed properties
  computed: {
    doubleCount: {
      get() { return this.count.value * 2 },
      set(val) { this.count.value = val / 2 }
    }
  },

  // Methods
  methods: {
    increment() {
      this.count.value += this.$props.step
    },
    decrement() {
      this.count.value -= this.$props.step
    }
  },

  // Template
  template: `
    <div>
      <p>Count: {{ count }} (Double: {{ doubleCount }})</p>
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  `
})
```

## Props

Props are component inputs, passed from parent components:

```ts
const UserCard = defineComponent({
  props: {
    name: String,
    age: Number,
    address: {
      type: String,
      default: 'Unknown'
    }
  },

  template: `
    <div>
      <h3>{{ name }}</h3>
      <p>Age: {{ age }}</p>
      <p>Address: {{ address }}</p>
    </div>
  `
})

// Usage
// <UserCard name="John" :age="25" />
```

## Emits

Declares events that a component can trigger:

```ts
const SearchInput = defineComponent({
  props: {
    modelValue: String
  },

  emits: ['update:modelValue', 'search'],

  methods: {
    onInput(e) {
      this.$emit('update:modelValue', e.target.value)
    },
    onSearch() {
      this.$emit('search', this.$props.modelValue)
    }
  },

  template: `
    <div>
      <input v-bind:model="modelValue" @input="onInput" />
      <button @click="onSearch">Search</button>
    </div>
  `
})
```

## Slots

### Default Slot

```ts
const Card = defineComponent({
  template: `
    <div class="card">
      <div class="card-body">
        <slot></slot>
      </div>
    </div>
  `
})

// Usage
// <Card>Card content</Card>
```

### Named Slots

```ts
const Layout = defineComponent({
  template: `
    <div>
      <header><slot name="header"></slot></header>
      <main><slot></slot></main>
      <footer><slot name="footer"></slot></footer>
    </div>
  `
})

// Usage
// <Layout>
//   <template #header>Header</template>
//   <template #default>Main Content</template>
//   <template #footer>Footer</template>
// </Layout>
```

### Scoped Slots

```ts
const List = defineComponent({
  props: {
    items: Array
  },
  template: `
    <ul>
      <li v-each="item in items">
        <slot name="item" :item="item" :index="$index"></slot>
      </li>
    </ul>
  `
})
```

## Lifecycle Hooks

Components provide a complete set of lifecycle hooks:

```ts
import { defineComponent, onMounted, onUnmounted, onUpdated } from 'lyt'

const MyComponent = defineComponent({
  setup() {
    onMounted(() => {
      console.log('Component mounted to DOM')
    })

    onUpdated(() => {
      console.log('Component data updated, DOM re-rendered')
    })

    onUnmounted(() => {
      console.log('Component unmounted from DOM')
    })

    return {}
  }
})
```

| Hook | Description |
|------|-------------|
| `onInit` | Component initialization |
| `onBeforeMount` | Before mounting |
| `onMounted` | Mounting complete |
| `onBeforeUpdate` | Before updating |
| `onUpdated` | Update complete |
| `onBeforeUnmount` | Before unmounting |
| `onUnmounted` | Unmounting complete |

## Composition API

Use the `setup()` function to write component logic:

```ts
import { defineComponent, ref, computed, provide, inject } from 'lyt'

const Child = defineComponent({
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: `<div :class="theme">Child Component</div>`
})

const Parent = defineComponent({
  setup() {
    const theme = ref('dark')

    provide('theme', theme)

    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    return { theme, toggleTheme }
  },

  template: `
    <div>
      <button @click="toggleTheme">Toggle Theme</button>
      <Child />
    </div>
  `
})
```

## Built-in Components

Lyt.js provides the following built-in components:

- **`Transition`** - Transition animations
- **`TransitionGroup`** - List transition animations
- **`KeepAlive`** - Component caching
- **`Suspense`** - Async component waiting
- **`defineAsyncComponent`** - Async component definition
