# Quick Start

## What is Lyt.js?

Lyt.js is a zero-dependency, ultra lightweight frontend framework that provides a Vue 3-compatible API. It supports reactive programming, a component system, routing, state management, and more. Its design philosophy is: lightweight, fast, and easy to use.

## Try It Online

Don't want to install locally? Try Lyt.js directly in your browser:

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/lytjs/lytjs/tree/main/examples/stackblitz-starter)

## Installation

### Using the CLI (Recommended)

```bash
# Create a new project with the Lyt.js CLI
npx @lytjs/cli create my-app

# Navigate to the project directory
cd my-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

### CDN Direct Usage

If you just want to try Lyt.js quickly, you can use it directly via CDN:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyt.js Example</title>
</head>
<body>
  <div id="app"></div>

  <script type="module">
    // Import Lyt.js from ESM CDN
    import { createApp } from '@lytjs/core'

    // Create an application instance
    const app = createApp({
      // Template
      template: `
        <div>
          <h1>{{ title }}</h1>
          <p>Count: {{ count }}</p>
          <button @click="count++">+1</button>
        </div>
      `,
      // Reactive state
      state: {
        title: 'Hello Lyt.js!',
        count: 0
      }
    })

    // Mount the app
    app.mount('#app')
  </script>
</body>
</html>
```

### npm Installation

For production projects, we recommend installing via npm:

```bash
# Install the core package (core features only)
npm install @lytjs/core

# Or install the aggregate package (includes all runtimes: router, store, etc.)
npm install @lytjs/lytjs
```

## Project Structure

A project created with the CLI has the following structure:

```
my-app/
├── public/           # Static assets
│   └── favicon.svg
├── src/              # Source code
│   ├── components/   # Components
│   ├── pages/        # Pages
│   ├── router/       # Router configuration
│   ├── store/        # State management
│   ├── styles/       # Styles
│   ├── App.lyt       # Root component (Single File Component)
│   └── main.ts       # Entry file
├── .eslintrc.json    # ESLint configuration
├── index.html        # HTML template
├── package.json      # Project configuration
└── tsconfig.json     # TypeScript configuration
```

## Core Concepts

### 1. Application Instance

Use `createApp` to create an application instance:

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  // Component options
})

app.mount('#app')
```

### 2. Reactive Data

Lyt.js provides a variety of reactive APIs:

- **ref()** — Create a reactive reference for primitive types
- **reactive()** — Create a reactive object for complex types
- **computed()** — Create a computed property
- **watch()** — Watch for data changes

### 3. Template Syntax

Lyt.js supports two template syntaxes:

**Shorthand syntax (recommended):**
- Interpolation: `{{ expression }}`
- Directives: `if`, `each`, `:model`, etc.
- Event binding: `@click`, `@input`, etc.
- Attribute binding: `:class`, `:style`, `:disabled`, etc.

**Vue-compatible syntax:**
- Interpolation: `{{ expression }}`
- Directives: `v-if`, `v-each`, `v-bind:model`, etc.
- Event binding: `@click`, `@input`, etc.
- Attribute binding: `:class`, `:style`, `:disabled`, etc.

Both syntaxes are functionally equivalent.

## Example 1: Counter App (Composition API)

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    // Reactive state
    const count = ref(0)

    // Computed property
    const doubleCount = computed(() => count.value * 2)

    // Methods
    function increment() {
      count.value++
    }

    function decrement() {
      count.value--
    }

    return { count, doubleCount, increment, decrement }
  },
  template: `
    <div class="counter">
      <h1>Counter</h1>
      <div class="controls">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+1</button>
      </div>
      <p>Double: {{ doubleCount }}</p>
    </div>
  `
})

app.mount('#app')
```

## Example 2: Todo App (Composition API)

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    const newTodo = ref('')
    const todos = ref([
      { id: 1, text: 'Learn Lyt.js', done: false },
      { id: 2, text: 'Build an app', done: false },
    ])

    const remaining = computed(() =>
      todos.value.filter(t => !t.done).length
    )

    function addTodo() {
      if (!newTodo.value.trim()) return
      todos.value.push({
        id: Date.now(),
        text: newTodo.value,
        done: false,
      })
      newTodo.value = ''
    }

    function toggleTodo(id) {
      const todo = todos.value.find(t => t.id === id)
      if (todo) todo.done = !todo.done
    }

    function removeTodo(id) {
      todos.value = todos.value.filter(t => t.id !== id)
    }

    return { newTodo, todos, remaining, addTodo, toggleTodo, removeTodo }
  },
  template: `
    <div class="todo-app">
      <h1>Todo List</h1>
      <p>{{ remaining }} items remaining</p>
      <form @submit.prevent="addTodo">
        <input
          :model="newTodo"
          placeholder="Add a new task..."
          class="todo-input"
        />
        <button type="submit" class="add-button">Add</button>
      </form>
      <ul class="todo-list">
        <li
          each="todo in todos"
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
    </div>
  `
})

app.mount('#app')
```

## Example 3: Options API

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  name: 'MyApp',
  state() {
    return {
      count: 0,
      message: 'Hello Lyt.js!'
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
    },
    decrement() {
      this.count--
    }
  },
  mounted() {
    console.log('Component mounted')
  },
  template: `
    <div>
      <h1>{{ message }}</h1>
      <p>Count: {{ count }}</p>
      <p>Double: {{ doubleCount }}</p>
      <button @click="decrement">-</button>
      <button @click="increment">+1</button>
    </div>
  `
})

app.mount('#app')
```

## Example 4: Weather App

```javascript
import { createApp, ref, onMounted } from '@lytjs/core'

const app = createApp({
  setup() {
    const city = ref('London')
    const weather = ref(null)
    const loading = ref(false)

    async function fetchWeather() {
      if (!city.value.trim()) return

      loading.value = true
      try {
        const response = await fetch(`https://api.example.com/weather?city=${encodeURIComponent(city.value)}`)
        const data = await response.json()
        weather.value = data
      } catch (error) {
        console.error('Failed to fetch weather:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      fetchWeather()
    })

    return { city, weather, loading, fetchWeather }
  },
  template: `
    <div class="weather-app">
      <h1>Weather Search</h1>
      <div class="search">
        <input
          :model="city"
          placeholder="Enter city name"
          @keyup.enter="fetchWeather"
        />
        <button @click="fetchWeather">Search</button>
      </div>

      <div if="loading" class="loading">Loading...</div>

      <div if="weather" class="weather-info">
        <h2>{{ weather.city }}</h2>
        <p>Temperature: {{ weather.temperature }}°C</p>
        <p>Condition: {{ weather.description }}</p>
        <p>Humidity: {{ weather.humidity }}%</p>
      </div>

      <div if class="no-data">Enter a city name to search weather</div>
    </div>
  `
})

app.mount('#app')
```

## FAQ

### 1. What is the difference between Lyt.js and Vue 3?

Lyt.js is a lightweight frontend framework with a Vue 3-compatible API, but with a smaller bundle size and zero dependencies. It focuses on core functionality and is ideal for small projects and performance-sensitive scenarios.

### 2. How do I use Single File Components?

Lyt.js supports `.lyt` Single File Components. You need to configure the appropriate build tools in your project. Projects created with the CLI come pre-configured.

### 3. How do I add routing?

Use the `@lytjs/router` package:

```bash
npm install @lytjs/router
```

Then use it in your application:

```javascript
import { createRouter } from '@lytjs/router'

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
})

app.use(router)
```

### 4. How do I use state management?

Use the `@lytjs/store` package (Pinia-style API):

```bash
npm install @lytjs/store
```

Then create a store:

```javascript
import { createStore } from '@lytjs/store'

const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: (s) => s.count * 2
  },
  actions: {
    increment(s) { s.count++ }
  }
})
```

## Next Steps

- [Component API](/en/api/component.md)
- [Reactivity API](/en/api/reactivity.md)
- [Router API](/en/api/router.md)
- [Store API](/en/api/store.md)
- [Server-Side Rendering](./ssr.md)
- [Migration from Vue 3](./migration-from-vue3.md)
