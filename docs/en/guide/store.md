# State Management

Lyt.js includes a lightweight state management system (Store) with a Pinia-inspired API that is simple and easy to use.

## Creating a Store

```ts
import { createStore } from '@lytjs/store'

const useCounterStore = createStore('counter', {
  // Initial state
  state: {
    count: 0,
    history: [] as number[]
  },

  // Getters
  getters: {
    doubleCount: (state) => state.count * 2,
    isPositive: (state) => state.count > 0
  },

  // Actions
  actions: {
    increment() {
      this.state.count++
      this.state.history.push(this.state.count)
    },
    decrement() {
      this.state.count--
      this.state.history.push(this.state.count)
    }
  }
})
```

## Using in Components

### Options API

```ts
import { defineComponent } from '@lytjs/component'
import { useCounterStore } from './stores/counter'

const Counter = defineComponent({
  init() {
    this.counterStore = useCounterStore()
  },
  methods: {
    increment() {
      this.counterStore.actions.increment()
    }
  },
  template: `
    <div>
      <p>Count: {{ counterStore.state.count }}</p>
      <p>Double: {{ counterStore.getters.doubleCount }}</p>
      <button @click="increment">+1</button>
    </div>
  `
})
```

### Composition API

```ts
import { defineComponent, onMounted } from '@lytjs/component'
import { useCounterStore } from './stores/counter'

const Counter = defineComponent({
  setup() {
    const store = useCounterStore()

    onMounted(() => {
      // Subscribe to state changes
      const unsubscribe = store.$subscribe((mutation, state) => {
        console.log('State changed:', mutation.type, mutation.key)
      })
    })

    return { store }
  },

  template: `
    <div>
      <p>Count: {{ store.state.count }}</p>
      <button @click="store.actions.increment()">+1</button>
    </div>
  `
})
```

## Store API

### $patch()

Batch update state:

```ts
const store = useCounterStore()

// Object merge
store.$patch({ count: 10, history: [] })

// Function-style update
store.$patch((state) => {
  state.count++
  state.history.push(state.count)
})
```

### $reset()

Reset state to initial values:

```ts
store.$reset()
```

### $subscribe()

Subscribe to state changes:

```ts
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log(mutation.storeId)  // Store ID
  console.log(mutation.type)     // 'set' | 'delete' | 'add' | 'direct'
  console.log(mutation.key)      // Changed key name
  console.log(mutation.newValue) // New value
  console.log(mutation.oldValue) // Old value
})

// Unsubscribe
unsubscribe()
```

## Plugins

Extend Store functionality with plugins:

```ts
import { createStore } from '@lytjs/store'

// Logger plugin
const loggerPlugin = {
  install(store) {
    store.$subscribe((mutation, state) => {
      console.log(`[${mutation.storeId}] ${mutation.type}: ${mutation.key}`)
    })
  }
}

// Persistence plugin
const persistencePlugin = {
  install(store) {
    const saved = localStorage.getItem(store.$id)
    if (saved) {
      store.$patch(JSON.parse(saved))
    }

    store.$subscribe((mutation, state) => {
      localStorage.setItem(store.$id, JSON.stringify(state))
    })
  }
}

const store = createStore('app', {
  state: { /* ... */ }
}, [loggerPlugin, persistencePlugin])
```

## Utility Functions

```ts
import { getStore, getStoreIds, clearAllStores } from '@lytjs/store'

getStore('counter')     // Get an already-created Store
getStoreIds()           // Get all Store IDs
clearAllStores()        // Clear all Stores
```
