# Store API

The Lyt.js state management system provides a lightweight global state management solution built on the reactivity system. It supports modules, computed properties, async operations, and more.

## Installation

```bash
npm install @lytjs/store
```

## Creating a Store

### createStore()

Creates a state management Store.

```ts
function createStore<S extends Record<string, any>>(id: string, options: StoreOptions<S>): () => StoreApi<S>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| id | `string` | Unique Store identifier |
| options | `StoreOptions` | Store configuration options |

**StoreOptions Interface:**
```ts
interface StoreOptions<S> {
  state?: S | (() => S); // Initial state
  getters?: Record<string, (state: S) => any>; // Computed properties
  actions?: Record<string, (this: StoreApi<S>, ...args: any[]) => any>; // Action methods
  modules?: Record<string, ModuleOptions>; // Modular sub-modules
}
```

**Example:**
```ts
import { createStore } from '@lytjs/store'

// Create a Store
const useCounterStore = createStore('counter', {
  // Initial state (factory function recommended)
  state: () => ({
    count: 0,
    name: 'Lyt.js',
    users: []
  }),

  // Computed properties (getters)
  getters: {
    doubleCount: (state) => state.count * 2,
    userCount: (state) => state.users.length
  },

  // Action methods
  actions: {
    increment() {
      this.state.count++
    },

    async fetchUsers() {
      const response = await fetch('/api/users')
      const data = await response.json()
      this.state.users = data
    },

    updateName(newName) {
      this.state.name = newName
    }
  }
})

// Use the Store
const store = useCounterStore()
console.log(store.state.count) // 0
store.actions.increment()
console.log(store.state.count) // 1
console.log(store.getters.doubleCount) // 2
```

---

## State

### Accessing State

```ts
const state: S
```

**Example:**
```ts
const store = useCounterStore()
console.log(store.state.count) // Access state

// Direct modification
store.state.count = 10
```

### $patch()

Batch update state.

```ts
function $patch(partialOrFn: Partial<S> | ((state: S) => void)): void
```

**Example:**
```ts
// Object merge
store.$patch({
  count: 20,
  name: 'Updated'
})

// Function style (for complex updates)
store.$patch((state) => {
  state.users.forEach(user => {
    user.active = true
  })
  state.count += 10
})
```

### $reset()

Reset state to initial values.

```ts
function $reset(): void
```

**Example:**
```ts
store.$reset()
console.log(store.state.count) // Restored to initial value 0
```

---

## Getters

Computed properties derived from state.

```ts
const getters: Record<string, any>
```

**Example:**
```ts
const useUserStore = createStore('user', {
  state: () => ({
    users: [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: false }
    ]
  }),
  getters: {
    activeUsers: (state) => state.users.filter(user => user.active),
    activeUserCount: (state) => state.users.filter(user => user.active).length,
    getUserById: (state) => (id) => state.users.find(user => user.id === id)
  }
})

// Use getters
const store = useUserStore()
console.log(store.getters.activeUsers) // Active users list
console.log(store.getters.activeUserCount) // Active user count
console.log(store.getters.getUserById(1)) // Get user by ID
```

---

## Actions

Methods for modifying state.

```ts
const actions: Record<string, (...args: any[]) => any>
```

### Synchronous Actions

```ts
const useCounterStore = createStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment(amount = 1) {
      this.state.count += amount
    },
    decrement(amount = 1) {
      this.state.count -= amount
    }
  }
})
```

### Asynchronous Actions

```ts
const useApiStore = createStore('api', {
  state: () => ({ data: null, loading: false, error: null }),
  actions: {
    async fetchData(url) {
      try {
        this.state.loading = true
        this.state.error = null
        const response = await fetch(url)
        const data = await response.json()
        this.state.data = data
      } catch (error) {
        this.state.error = error.message
      } finally {
        this.state.loading = false
      }
    }
  }
})

// Call action
const store = useApiStore()
store.actions.fetchData('/api/data')
```

---

## State Subscriptions

### $subscribe()

Subscribe to state changes.

```ts
function $subscribe(callback: SubscriptionCallback): () => void
```

**Example:**
```ts
// Subscribe to state changes
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('State changed:', {
    type: mutation.type,
    key: mutation.key,
    newValue: mutation.newValue,
    oldValue: mutation.oldValue
  })

  // Persist to localStorage
  localStorage.setItem('counter', JSON.stringify(state.count))
})

// Unsubscribe
unsubscribe()
```

### $onAction()

Intercept action calls.

```ts
function $onAction(callback: (action: { name: string, args: any[] }) => void): () => void
```

**Example:**
```ts
const unsubscribe = store.$onAction((action) => {
  console.log(`Action called: ${action.name}`, action.args)
})

unsubscribe()
```

---

## Modular Store

### modules

Define modular sub-modules within a store.

**ModuleOptions Interface:**
```ts
interface ModuleOptions {
  state?: Record<string, any> | (() => Record<string, any>);
  getters?: Record<string, (state: any) => any>;
  actions?: Record<string, (this: StoreApi, ...args: any[]) => any>;
  modules?: Record<string, ModuleOptions>;
}
```

**Example:**
```ts
const useRootStore = createStore('root', {
  state: () => ({
    appName: 'My App'
  }),

  modules: {
    // User module
    user: {
      state: () => ({
        id: null,
        name: '',
        email: ''
      }),
      getters: {
        isLoggedIn: (state) => state.id !== null,
        userInfo: (state) => ({ id: state.id, name: state.name, email: state.email })
      },
      actions: {
        login(userData) {
          this.state.user.id = userData.id
          this.state.user.name = userData.name
          this.state.user.email = userData.email
        },
        logout() {
          this.$patch((state) => {
            state.user.id = null
            state.user.name = ''
            state.user.email = ''
          })
        }
      }
    },

    // Product module
    product: {
      state: () => ({
        items: [],
        total: 0
      }),
      getters: {
        itemCount: (state) => state.items.length,
        totalPrice: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
      actions: {
        addToCart(product, quantity = 1) {
          const existingItem = this.state.product.items.find(item => item.id === product.id)
          if (existingItem) {
            existingItem.quantity += quantity
          } else {
            this.state.product.items.push({ ...product, quantity })
          }
        },
        removeFromCart(productId) {
          this.state.product.items = this.state.product.items.filter(item => item.id !== productId)
        }
      }
    }
  }
})

// Use modular Store
const store = useRootStore()

// Access root state
console.log(store.state.appName)

// Access module state
console.log(store.state.user.name)
console.log(store.state.product.items)

// Access module getters (with namespace prefix)
console.log(store.getters['user/isLoggedIn'])
console.log(store.getters['product/totalPrice'])

// Call module actions (with namespace prefix)
store.actions['user/login']({ id: 1, name: 'John', email: 'john@example.com' })
store.actions['product/addToCart']({ id: 1, name: 'Product 1', price: 100 }, 2)
```

---

## Composable Store

For a more Composition API-friendly approach, you can create stores using composables:

```ts
import { ref, computed } from '@lytjs/core'

// Define a composable store
function useCounterStore() {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() { count.value++ }
  function decrement() { count.value-- }

  return {
    count,
    doubleCount,
    increment,
    decrement
  }
}

// Use in components
const { count, doubleCount, increment } = useCounterStore()
```

---

## Store Management

### getStore()

Get a registered Store by ID.

```ts
function getStore<S extends Record<string, any>>(id: string): StoreApi<S> | undefined
```

**Example:**
```ts
import { getStore } from '@lytjs/store'

const store = getStore('counter')
if (store) {
  console.log(store.state.count)
}
```

### getStoreIds()

Get all registered Store IDs.

```ts
function getStoreIds(): string[]
```

### $dispose()

Destroy a Store instance.

```ts
function $dispose(): void
```

**Example:**
```ts
const store = useCounterStore()
// Use the Store...
store.$dispose()
```

---

## Plugin System

### use()

Install a Store plugin.

```ts
function use(plugin: StorePlugin): () => void
```

**Example:**
```ts
const loggerPlugin = {
  install(store) {
    console.log(`Store ${store.$id} installed`)

    const unsubscribe = store.$subscribe((mutation, state) => {
      console.log(`[${store.$id}] State changed:`, mutation)
    })

    return () => {
      unsubscribe()
      console.log(`Store ${store.$id} plugin uninstalled`)
    }
  }
}

const store = useCounterStore()
const uninstall = store.use(loggerPlugin)

// Uninstall plugin
uninstall()
```

---

## Best Practices

### 1. State Design

- **Single source of truth**: Each Store manages one domain of state
- **Flat state**: Avoid deeply nested state structures
- **Factory functions**: Use functions to return initial state
- **Batch updates**: Use `$patch` for complex state updates

### 2. Getters

- **Derived state**: Use getters for computed/derived values
- **Caching**: Getters auto-cache and only recompute when dependencies change
- **Parameterized**: Create getters that return functions (e.g., `getUserById`)

### 3. Actions

- **Business logic**: Place complex business logic in actions
- **Async operations**: Handle API calls, timers, and other async operations
- **Error handling**: Properly handle errors in actions

### 4. Modules

- **By feature**: Organize related state and logic into modules
- **Namespacing**: Module getters and actions auto-add namespace prefixes
- **Nested modules**: Supports multi-level nested module structures

### 5. Performance

- **Selective subscriptions**: Only subscribe to necessary state changes
- **Efficient getters**: Avoid expensive operations in getters
- **Batch updates**: Use `$patch` to reduce reactive update count
- **Cleanup**: Dispose stores when no longer needed
