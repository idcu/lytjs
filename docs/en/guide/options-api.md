# Options API Guide

The Options API is a classic API style provided by Lyt.js that allows you to define component behavior and state through object options. This style is very intuitive for developers familiar with traditional frontend frameworks.

## What is the Options API?

The Options API is an object-options-based API style where you organize component logic by defining options such as `data`, `methods`, `computed`, `watch`, etc.

The main advantages of this approach are:

- **Intuitive and easy to understand**: Easier to grasp for beginners
- **Clear structure**: Code is organized by functional type with a clear structure
- **Backward compatible**: Similar style to traditional frontend frameworks, low migration cost
- **Easy to debug**: Fixed code structure makes troubleshooting easier

## Basic Usage

### Component Definition

Define a component using the Options API:

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  // Component name
  name: 'Counter',

  // Reactive data
  data() {
    return {
      count: 0,
      message: 'Hello Lyt.js'
    }
  },

  // Computed properties
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },

  // Methods
  methods: {
    increment() {
      this.count++
    },
    updateMessage(newMessage) {
      this.message = newMessage
    }
  },

  // Lifecycle hooks
  mounted() {
    console.log('Component mounted')
  },

  // Template
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

## Core Options

### data

The `data` option defines the component's reactive data. It must be a function that returns an object.

```javascript
data() {
  return {
    count: 0,
    user: {
      name: 'John',
      age: 30
    },
    items: [1, 2, 3]
  }
}
```

**Note:** `data` must be a function so that each component instance gets its own independent copy of the data.

### methods

The `methods` option defines component methods that can be called in templates or accessed via `this` in other methods.

```javascript
methods: {
  increment() {
    this.count++
  },
  greet(name) {
    return `Hello, ${name}!`
  }
}
```

### computed

The `computed` option defines computed properties that automatically calculate based on their reactive dependencies and cache the results.

```javascript
computed: {
  doubleCount() {
    return this.count * 2
  },
  fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

### watch

The `watch` option monitors reactive data changes and executes callback functions when data changes.

```javascript
watch: {
  count(newValue, oldValue) {
    console.log(`Count changed from ${oldValue} to ${newValue}`)
  },
  // Deep watch
  user: {
    handler(newValue, oldValue) {
      console.log('User changed:', newValue)
    },
    deep: true
  }
}
```

### props

The `props` option defines component properties, allowing parent components to pass data to child components.

```javascript
props: {
  // Basic types
  title: String,
  count: Number,

  // With default value
  initialCount: {
    type: Number,
    default: 0
  },

  // Required property
  message: {
    type: String,
    required: true
  },

  // Custom validation
  age: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 150
    }
  }
}
```

### emits

The `emits` option defines events that a component can trigger.

```javascript
emits: ['update:count', 'submit'],
methods: {
  increment() {
    this.count++
    this.$emit('update:count', this.count)
  },
  submit() {
    this.$emit('submit', this.formData)
  }
}
```

### template

The `template` option defines the component's template, supporting interpolation expressions, directives, etc.

```javascript
template: `
  <div>
    <h1>{{ title }}</h1>
    <p v-if="showMessage">{{ message }}</p>
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ item.name }}
      </li>
    </ul>
    <button @click="increment">Increment</button>
  </div>
`
```

## Lifecycle Hooks

The Options API provides the following lifecycle hooks:

### Creation Phase

- **beforeCreate**: Called before the component instance is created. Data observation and event mechanisms are not yet initialized.
- **created**: Component instance creation is complete. Data observation and event mechanisms are initialized, but the DOM is not yet mounted.

### Mounting Phase

- **beforeMount**: Called before DOM mounting. The template has been compiled.
- **mounted**: DOM mounting is complete. DOM operations can be performed.

### Updating Phase

- **beforeUpdate**: Called before data update. The DOM has not yet been updated.
- **updated**: Data update is complete. The DOM has been updated.

### Unmounting Phase

- **beforeUnmount**: Called before the component is unmounted.
- **unmounted**: Component unmounting is complete.

### Error Handling

- **errorCaptured**: Captures errors from child components.

## Component Communication

### Parent to Child: Passing Data

Use `props` to pass data to child components:

```javascript
// Parent component
const Parent = {
  template: `
    <Child :title="title" :count="count" />
  `,
  data() {
    return {
      title: 'Parent Component',
      count: 10
    }
  }
}

// Child component
const Child = {
  props: ['title', 'count'],
  template: `
    <div>
      <h2>{{ title }}</h2>
      <p>Count: {{ count }}</p>
    </div>
  `
}
```

### Child to Parent: Passing Data

Use `$emit` to trigger events and pass data to parent components:

```javascript
// Child component
const Child = {
  data() {
    return {
      localCount: 0
    }
  },
  methods: {
    increment() {
      this.localCount++
      this.$emit('update:count', this.localCount)
    }
  },
  template: `
    <button @click="increment">Increment</button>
  `
}

// Parent component
const Parent = {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    handleUpdateCount(newCount) {
      this.count = newCount
    }
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <Child @update:count="handleUpdateCount" />
    </div>
  `
}
```

### Sibling Component Communication

Use an event bus or state management:

```javascript
// eventBus.js
import { createApp } from '@lytjs/core'

const eventBus = createApp({})

export default eventBus

// Component A
import eventBus from './eventBus'

const ComponentA = {
  methods: {
    sendMessage() {
      eventBus.emit('message', 'Hello from Component A')
    }
  }
}

// Component B
import eventBus from './eventBus'

const ComponentB = {
  data() {
    return {
      message: ''
    }
  },
  mounted() {
    eventBus.on('message', (msg) => {
      this.message = msg
    })
  }
}
```

## Advanced Features

### Mixins

Mixins allow you to reuse component logic:

```javascript
// mixins/logger.js
export const loggerMixin = {
  methods: {
    log(message) {
      console.log(`[${this.name || 'Component'}] ${message}`)
    }
  },
  mounted() {
    this.log('Component mounted')
  }
}

// Usage in a component
import { loggerMixin } from './mixins/logger'

const MyComponent = {
  mixins: [loggerMixin],
  name: 'MyComponent',
  mounted() {
    this.log('Custom mounted logic')
  }
}
```

### Custom Directives

Custom directives allow you to manipulate DOM elements:

```javascript
// Register a global directive
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

// Usage in template
// <input v-focus />

// Local directive
const MyComponent = {
  directives: {
    focus: {
      mounted(el) {
        el.focus()
      }
    }
  }
}
```

### Filters

Filters are used for text formatting:

```javascript
// Register a global filter
app.config.globalProperties.$filters = {
  capitalize(value) {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

// Usage in template
// {{ message | capitalize }}
```

## Comparison with Composition API

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
import { ref, computed, onMounted } from '@lytjs/core'

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

### 1. Data Management

- Only define reactive data in `data`
- Avoid complex computations in templates; use `computed` properties
- Use `watch` or `watchEffect` for data changes that need monitoring

### 2. Method Organization

- Organize methods by functionality, keeping each method focused on a single responsibility
- Avoid complex business logic in methods; consider splitting or using composables
- Use descriptive method names for better code readability

### 3. Lifecycle Hooks

- Only use lifecycle hooks when necessary
- Perform DOM operations in `mounted`, clean up resources in `beforeUnmount`
- Avoid DOM operations in `created` since the DOM is not yet mounted

### 4. Component Communication

- For parent-child communication, use `props` and `$emit`
- For sibling or cross-level component communication, use an event bus or state management
- Avoid using `$parent` or `$children` for component communication, as it increases coupling

### 5. Performance Optimization

- Use `v-if` and `v-show` appropriately to control element visibility
- Always add a `key` attribute when using `v-for`
- Use `computed` properties to cache results for complex computations
- Consider virtual scrolling for large lists

## Example: Complete Options API Application

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  name: 'TodoApp',

  data() {
    return {
      newTodo: '',
      todos: [
        { id: 1, text: 'Learn Lyt.js', done: false },
        { id: 2, text: 'Build an app', done: false }
      ]
    }
  },

  computed: {
    remaining() {
      return this.todos.filter(todo => !todo.done).length
    },
    completed() {
      return this.todos.filter(todo => todo.done).length
    }
  },

  methods: {
    addTodo() {
      if (!this.newTodo.trim()) return
      this.todos.push({
        id: Date.now(),
        text: this.newTodo,
        done: false
      })
      this.newTodo = ''
    },
    toggleTodo(id) {
      const todo = this.todos.find(todo => todo.id === id)
      if (todo) {
        todo.done = !todo.done
      }
    },
    removeTodo(id) {
      this.todos = this.todos.filter(todo => todo.id !== id)
    },
    clearCompleted() {
      this.todos = this.todos.filter(todo => !todo.done)
    }
  },

  mounted() {
    console.log('Todo app mounted')
  },

  template: `
    <div class="todo-app">
      <h1>Todo App</h1>
      <div class="stats">
        <p>{{ remaining }} remaining, {{ completed }} completed</p>
      </div>
      <form @submit.prevent="addTodo">
        <input
          v-model="newTodo"
          placeholder="Add a new task..."
          class="todo-input"
        />
        <button type="submit" class="add-button">Add</button>
      </form>
      <ul class="todo-list">
        <li
          v-for="todo in todos"
          :key="todo.id"
          :class="{ completed: todo.done }"
        >
          <input
            type="checkbox"
            :checked="todo.done"
            @change="toggleTodo(todo.id)"
          />
          <span>{{ todo.text }}</span>
          <button @click="removeTodo(todo.id)" class="remove-button">Remove</button>
        </li>
      </ul>
      <button
        v-if="completed > 0"
        @click="clearCompleted"
        class="clear-button"
      >
        Clear Completed
      </button>
    </div>
  `
})

app.mount('#app')
```

## Summary

The Options API is a classic API style provided by Lyt.js that organizes component logic through object options, making it intuitive and easy to understand for beginners. By using options such as `data`, `methods`, `computed`, and `watch`, you can create fully functional components.

The Options API is particularly suitable for:

- Small components with simple logic
- Beginners who need an intuitive and easy-to-understand API style
- Projects migrating from traditional frontend frameworks
- Rapid prototyping

Whether you use the Options API or the Composition API, Lyt.js provides a great development experience. You can choose the appropriate API style based on your project's complexity and your team's familiarity, and you can even mix both styles in the same project.
