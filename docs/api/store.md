# @lytjs/store API Reference

## Installation

```bash
pnpm add @lytjs/store
```

## Basic Usage

### Options Store

```typescript
import { defineStore } from '@lytjs/store';

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});
```

### Setup Store

```typescript
import { defineStore } from '@lytjs/store';
import { signal, computed } from '@lytjs/reactivity';

const useCounterStore = defineStore('counter', () => {
  const count = signal(0);
  const doubleCount = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, doubleCount, increment };
});
```

## API

### defineStore(id, options)

Creates a store definition.

**Options Store:**

- `state` - Function returning initial state
- `getters` - Computed properties
- `actions` - Methods

**Setup Store:**

- Accepts a setup function that returns store properties

### createPinia()

Creates a Pinia instance.

### storeToRefs(store)

Extracts refs from a store, preserving reactivity.

### useStore()

Returns the store instance.

## Store Instance

### $id

Store unique identifier.

### $state

Reactive state object.

### $patch(partialOrMutator)

Update state partially.

```typescript
// Object syntax
store.$patch({ count: 10 });

// Function syntax
store.$patch((state) => {
  state.count++;
});
```

### $reset()

Reset state to initial values.

### $subscribe(callback)

Subscribe to state changes.

```typescript
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('Type:', mutation.type);
  console.log('Store ID:', mutation.storeId);
});

// Later: unsubscribe()
```

### $onAction(callback)

Subscribe to action calls.

```typescript
const unsubscribe = store.$onAction((context) => {
  console.log('Action:', context.name);
  console.log('Args:', context.args);

  context.after = (result) => {
    console.log('After:', result);
  };

  context.onError = (error) => {
    console.error('Error:', error);
  };
});
```

### $dispose()

Dispose the store and clear subscriptions.
