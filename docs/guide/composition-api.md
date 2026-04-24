# 组合式 API 指南

组合式 API 是 Lyt.js 提供的一种新的 API 风格，它允许你以更灵活的方式组织组件逻辑，使代码更易于复用和测试。

## 什么是组合式 API？

组合式 API 是一种基于函数的 API 风格，它允许你将相关的逻辑组织在一起，而不是按照选项类型（如 `data`、`methods`、`computed` 等）分散在不同的选项中。

这种方式的主要优势是：

- **更好的逻辑组织**：相关的逻辑可以放在一起，提高代码可读性和可维护性
- **更好的代码复用**：可以将逻辑提取到独立的函数中，在多个组件中复用
- **更好的类型推断**：TypeScript 类型推断更加准确
- **更好的 tree-shaking**：未使用的代码可以被更好地移除

## 基本用法

### setup 函数

组合式 API 的核心是 `setup` 函数，它在组件创建时执行，用于设置组件的状态和逻辑。

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    // 响应式状态
    const count = ref(0)
    const message = ref('Hello Lyt.js')

    // 计算属性
    const doubleCount = computed(() => count.value * 2)

    // 方法
    function increment() {
      count.value++
    }

    function updateMessage(newMessage) {
      message.value = newMessage
    }

    // 返回值会暴露给模板
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

### 参数

`setup` 函数接收两个参数：

1. `props`：组件的属性
2. `context`：组件的上下文，包含 `attrs`、`emit`、`slots` 等

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

## 响应式 API

在 `setup` 函数中，你可以使用以下响应式 API：

### ref()

创建一个响应式的引用，用于包装基本类型值。

```javascript
import { ref } from '@lytjs/core'

const count = ref(0)
count.value++ // 触发更新
```

### reactive()

创建一个响应式对象，用于包装复杂类型值。

```javascript
import { reactive } from '@lytjs/core'

const state = reactive({
  count: 0,
  user: {
    name: 'John',
    age: 30
  }
})

state.count++ // 触发更新
state.user.name = 'Jane' // 深层响应式，触发更新
```

### computed()

创建一个计算属性，基于其他响应式数据自动计算。

```javascript
import { ref, computed } from '@lytjs/core'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)

console.log(doubleCount.value) // 0
count.value++
console.log(doubleCount.value) // 2
```

### watch()

监听响应式数据的变化。

```javascript
import { ref, watch } from '@lytjs/core'

const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`)
})

count.value++ // 输出: Count changed from 0 to 1
```

### watchEffect()

自动追踪依赖的副作用函数。

```javascript
import { ref, watchEffect } from '@lytjs/core'

const count = ref(0)

watchEffect(() => {
  console.log(`Count is: ${count.value}`)
}) // 立即执行，输出: Count is: 0

count.value++ // 自动追踪，输出: Count is: 1
```

## 生命周期钩子

在组合式 API 中，你可以使用以下生命周期钩子：

### onMounted()

组件挂载后执行。

```javascript
import { onMounted, ref } from '@lytjs/core'

setup() {
  const count = ref(0)

  onMounted(() => {
    console.log('Component mounted')
    // 可以在这里进行 DOM 操作
  })

  return { count }
}
```

### onUpdated()

组件更新后执行。

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

组件卸载前执行。

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

### 其他生命周期钩子

- `onBeforeMount`：组件挂载前执行
- `onBeforeUpdate`：组件更新前执行
- `onBeforeUnmount`：组件卸载前执行
- `onErrorCaptured`：捕获子组件错误

## 依赖注入

使用 `provide` 和 `inject` 实现组件间的依赖注入。

### provide()

在父组件中提供依赖。

```javascript
import { provide, ref } from '@lytjs/core'

setup() {
  const theme = ref('light')

  provide('theme', theme)

  return { theme }
}
```

### inject()

在子组件中注入依赖。

```javascript
import { inject } from '@lytjs/core'

setup() {
  const theme = inject('theme')

  return { theme }
}
```

## 组合函数

组合函数是组合式 API 的核心概念，它允许你将相关的逻辑提取到独立的函数中。

### 示例：计数器逻辑

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

// 在组件中使用
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

### 示例：表单处理

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

// 在组件中使用
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

## 与选项式 API 的对比

### 选项式 API

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

### 组合式 API

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

## 最佳实践

### 1. 逻辑组织

- 将相关的逻辑放在一起，使用组合函数提取可复用的逻辑
- 按功能组织代码，而不是按 API 类型组织

### 2. 响应式 API 使用

- 对于基本类型，使用 `ref()`
- 对于复杂对象，使用 `reactive()`
- 对于需要缓存的计算，使用 `computed()`
- 对于需要监听的变化，使用 `watch()` 或 `watchEffect()`

### 3. 生命周期钩子

- 只在需要时使用生命周期钩子
- 清理副作用，如定时器、事件监听器等

### 4. 代码复用

- 创建组合函数来封装可复用的逻辑
- 组合函数应该返回相关的状态和方法

### 5. 性能优化

- 使用 `shallowRef()` 和 `shallowReactive()` 来避免深层响应式
- 使用 `watch()` 的 `deep: false` 选项来避免深层监听
- 使用 `onMounted()` 而不是 `setup()` 来进行 DOM 操作

## 示例：完整的组合式 API 应用

```javascript
import { createApp, ref, computed, onMounted, watch } from '@lytjs/core'

// 组合函数：计数器
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

// 组合函数：主题
function useTheme() {
  const theme = ref('light')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  onMounted(() => {
    // 从 localStorage 加载主题
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      theme.value = savedTheme
    }
  })

  watch(theme, (newTheme) => {
    // 保存主题到 localStorage
    localStorage.setItem('theme', newTheme)
    // 更新文档类名
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
      <h1>组合式 API 示例</h1>
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

## 总结

组合式 API 是 Lyt.js 提供的一种强大的 API 风格，它允许你以更灵活的方式组织组件逻辑。通过使用 `setup` 函数、响应式 API、生命周期钩子和组合函数，你可以创建更加模块化、可复用和可维护的组件。

组合式 API 特别适合：

- 大型组件，逻辑复杂的场景
- 需要在多个组件中复用逻辑的场景
- 对 TypeScript 类型推断有较高要求的场景
- 需要更好的 tree-shaking 优化的场景

无论是新项目还是从选项式 API 迁移的项目，组合式 API 都能为你提供更好的开发体验和代码质量。