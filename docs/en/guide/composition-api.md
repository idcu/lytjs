# Composition API Guide

The Composition API is a new API style provided by Lyt.js that allows you to organize component logic in a more flexible way, making code easier to reuse and test.

## What is the Composition API?

The Composition API is a function-based API style that allows you to organize related logic together, rather than scattering it across different option types (such as `data`, `methods`, `computed`, etc.).

The main advantages of this approach are:

- **Better logic organization**: Related logic can be grouped together, improving code readability and maintainability
- **Better code reuse**: Logic can be extracted into standalone functions and reused across multiple components
- **Better type inference**: TypeScript type inference is more accurate
- **Better tree-shaking**: Unused code can be more effectively removed

## Basic Usage

### The setup Function

The core of the Composition API is the `setup` function, which executes when the component is created and is used to set up the component's state and logic.

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    // Reactive state
    const count = ref(0)
    const message = ref('Hello Lyt.js')

    // Computed property
    const doubleCount = computed(() => count.value * 2)

    // Methods
    function increment() {
      count.value++
    }

    function updateMessage(newMessage) {
      message.value = newMessage
    }

    // Return values are exposed to the template
    return {
      count,
      message,
      doubleCount,
      increment,
      updateMessage
    }
  },
  template: `
    <div>
      <h1>{{ message }}</h1>
      <p>Count: {{ count }}</p>
      <p>Double count: {{ doubleCount }}</p>
      <button @click="increment">Increment</button>
      <input model="message" placeholder="Enter message" />
    </div>
  `
})

app.mount('#app')
```

### Parameters

The `setup` function receives two parameters:

1. `props`: The component's properties
2. `context`: The component's context, containing `attrs`, `emit`, `slots`, etc.

```javascript
import { createApp, ref } from '@lytjs/core'

const app = createApp({
  props: {
    title: String,
    initialCount: Number
  },
  setup(props, context) {
    const count = ref(props.initialCount || 0)

    function increment() {
      count.value++
      context.emit('update:count', count.value)
    }

    return {
      count,
      increment
    }
  },
  template: `
    <div>
      <h1>{{ title }}</h1>
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `
})

app.mount('#app')
```

## Reactivity APIs

Inside the `setup` function, you can use the following reactivity APIs:

### ref()

Creates a reactive reference for wrapping primitive values.

```javascript
import { ref } from '@lytjs/core'

const count = ref(0)
count.value++ // Triggers update
```

### reactive()

Creates a reactive object for wrapping complex types.

```javascript
import { reactive } from '@lytjs/core'

const state = reactive({
  count: 0,
  user: {
    name: 'John',
    age: 30
  }
})

state.count++ // Triggers update
state.user.name = 'Jane' // Deep reactivity, triggers update
```

### computed()

Creates a computed property that automatically calculates based on other reactive data.

```javascript
import { ref, computed } from '@lytjs/core'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

console.log(doubleCount.value) // 0
count.value++
console.log(doubleCount.value) // 2
```

### watch()

Watches reactive data changes.

```javascript
import { ref, watch } from '@lytjs/core'

const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})

count.value++ // Output: Count changed from 0 to 1
```

### watchEffect()

Automatically tracks dependencies in a side effect function.

```javascript
import { ref, watchEffect } from '@lytjs/core'

const count = ref(0)

watchEffect(() => {
  console.log(`Count is: ${count.value}`)
}) // Executes immediately, output: Count is: 0

count.value++ // Auto-tracked, output: Count is: 1
```

## Lifecycle Hooks

In the Composition API, you can use the following lifecycle hooks:

### onMounted()

Executes after the component is mounted.

```javascript
import { onMounted, ref } from '@lytjs/core'

setup() {
  const count = ref(0)

  onMounted(() => {
    console.log('Component mounted')
    // DOM operations can be performed here
  })

  return { count }
}
```

### onUpdated()

Executes after the component is updated.

```javascript
import { onUpdated, ref } from '@lytjs/core'

setup() {
  const count = ref(0)

  onUpdated(() => {
    console.log('Component updated')
  })

  return { count }
}
```

### onUnmounted()

Executes before the component is unmounted.

```javascript
import { onUnmounted, ref } from '@lytjs/core'

setup() {
  const count = ref(0)
  const timer = setInterval(() => {
    count.value++
  }, 1000)

  onUnmounted(() => {
    clearInterval(timer)
    console.log('Component unmounted')
  })

  return { count }
}
```

### Other Lifecycle Hooks

- `onBeforeMount`: Executes before the component is mounted
- `onBeforeUpdate`: Executes before the component is updated
- `onBeforeUnmount`: Executes before the component is unmounted
- `onErrorCaptured`: Captures errors from child components

## Dependency Injection

Use `provide` and `inject` for dependency injection between components.

### provide()

Provides dependencies in a parent component.

```javascript
import { provide, ref } from '@lytjs/core'

setup() {
  const theme = ref('light')

  provide('theme', theme)

  return { theme }
}
```

### inject()

Injects dependencies in a child component.

```javascript
import { inject } from '@lytjs/core'

setup() {
  const theme = inject('theme')

  return { theme }
}
```

## Composables

Composables are the core concept of the Composition API, allowing you to extract related logic into standalone functions.

### Example: Counter Logic

```javascript
// composables/useCounter.js
import { ref, computed } from '@lytjs/core'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  function reset() {
    count.value = initialValue
  }

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset
  }
}

// Usage in a component
import { useCounter } from './composables/useCounter'

setup() {
  const { count, doubleCount, increment, decrement, reset } = useCounter(10)

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset
  }
}
```

### Example: Form Handling

```javascript
// composables/useForm.js
import { reactive, computed } from '@lytjs/core'

export function useForm(initialValues = {}, validations = {}) {
  const values = reactive({ ...initialValues })
  const errors = reactive({})

  const isValid = computed(() => {
    validate()
    return Object.keys(errors).length === 0
  })

  function validate() {
    Object.keys(validations).forEach(key => {
      const validation = validations[key]
      if (validation.required && !values[key]) {
        errors[key] = 'This field is required'
      } else if (validation.minLength && values[key].length < validation.minLength) {
        errors[key] = `Minimum length is ${validation.minLength}`
      } else {
        delete errors[key]
      }
    })
  }

  function handleSubmit(callback) {
    validate()
    if (isValid.value) {
      callback(values)
    }
  }

  return {
    values,
    errors,
    isValid,
    validate,
    handleSubmit
  }
}

// Usage in a component
import { useForm } from './composables/useForm'

setup() {
  const { values, errors, isValid, handleSubmit } = useForm(
    { name: '', email: '' },
    {
      name: { required: true, minLength: 3 },
      email: { required: true }
    }
  )

  function onSubmit(values) {
    console.log('Form submitted:', values)
  }

  return {
    values,
    errors,
    isValid,
    handleSubmit: () => handleSubmit(onSubmit)
  }
}
```

## Comparison with Options API

### Options API

```javascript
const app = createApp({
  data() {
    return {
      count: 0,
      message: 'Hello'
    }
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  mounted() {
    console.log('Component mounted')
  }
})
```

### Composition API

```javascript
const app = createApp({
  setup() {
    const count = ref(0)
    const message = ref('Hello')

    const doubleCount = computed(() => count.value * 2)

    function increment() {
      count.value++
    }

    onMounted(() => {
      console.log('Component mounted')
    })

    return {
      count,
      message,
      doubleCount,
      increment
    }
  }
})
```

## Best Practices

### 1. Logic Organization

- Group related logic together and use composables to extract reusable logic
- Organize code by feature, not by API type

### 2. Reactivity API Usage

- For primitive types, use `ref()`
- For complex objects, use `reactive()`
- For cached computations, use `computed()`
- For watching changes, use `watch()` or `watchEffect()`

### 3. Lifecycle Hooks

- Only use lifecycle hooks when necessary
- Clean up side effects such as timers and event listeners

### 4. Code Reuse

- Create composables to encapsulate reusable logic
- Composables should return related state and methods

### 5. Performance Optimization

- Use `shallowRef()` and `shallowReactive()` to avoid deep reactivity
- Use `watch()` with `deep: false` to avoid deep watching
- Use `onMounted()` instead of `setup()` for DOM operations

## Example: Complete Composition API Application

```javascript
import { createApp, ref, computed, onMounted, watch } from '@lytjs/core'

// Composable: Counter
function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  return { count, doubleCount, increment, decrement }
}

// Composable: Theme
function useTheme() {
  const theme = ref('light')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  onMounted(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme
    }
  })

  watch(theme, (newTheme) => {
    // Save theme to localStorage
    localStorage.setItem('theme', newTheme)
    // Update document class name
    document.documentElement.className = newTheme
  }, { immediate: true })

  return { theme, toggleTheme }
}

const app = createApp({
  setup() {
    const { count, doubleCount, increment, decrement } = useCounter(10)
    const { theme, toggleTheme } = useTheme()

    return {
      count,
      doubleCount,
      increment,
      decrement,
      theme,
      toggleTheme
    }
  },
  template: `
    <div class="app" :class="theme">
      <h1>Composition API Example</h1>
      <div class="counter">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+</button>
        <p>Double: {{ doubleCount }}</p>
      </div>
      <button @click="toggleTheme">
        Toggle Theme ({{ theme }})
      </button>
    </div>
  `
})

app.mount('#app')
```

## Summary

The Composition API is a powerful API style provided by Lyt.js that allows you to organize component logic in a more flexible way. By using the `setup` function, reactivity APIs, lifecycle hooks, and composables, you can create more modular, reusable, and maintainable components.

The Composition API is particularly suitable for:

- Large components with complex logic
- Scenarios requiring logic reuse across multiple components
- Projects with high TypeScript type inference requirements
- Scenarios requiring better tree-shaking optimization

Whether you are starting a new project or migrating from the Options API, the Composition API provides a better development experience and code quality.
