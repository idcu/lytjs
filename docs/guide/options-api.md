# 选项式 API 指南

选项式 API 是 Lyt.js 提供的一种经典 API 风格，它允许你通过对象选项的方式来定义组件的行为和状态。这种风格对于熟悉传统前端框架的开发者来说非常直观。

## 什么是选项式 API？

选项式 API 是一种基于对象选项的 API 风格，你可以通过定义 `data`、`methods`、`computed`、`watch` 等选项来组织组件的逻辑。

这种方式的主要优势是：

- **直观易懂**：对于初学者来说更加容易理解
- **结构清晰**：按照功能类型组织代码，结构分明
- **向后兼容**：与传统前端框架的风格相似，迁移成本低
- **易于调试**：代码结构固定，便于排查问题

## 基本用法

### 组件定义

使用选项式 API 定义组件：

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  // 组件名称
  name: 'Counter',
  
  // 响应式数据
  data() {
    return {
      count: 0,
      message: 'Hello Lyt.js'
    }
  },
  
  // 计算属性
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  
  // 方法
  methods: {
    increment() {
      this.count++
    },
    updateMessage(newMessage) {
      this.message = newMessage
    }
  },
  
  // 生命周期钩子
  mounted() {
    console.log('Component mounted')
  },
  
  // 模板
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

## 核心选项

### data

`data` 选项用于定义组件的响应式数据，它是一个函数，返回一个对象。

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

**注意**：`data` 必须是一个函数，这样每个组件实例都能获得独立的数据副本。

### methods

`methods` 选项用于定义组件的方法，这些方法可以在模板中调用，也可以在其他方法中通过 `this` 访问。

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

`computed` 选项用于定义计算属性，计算属性会基于其依赖的响应式数据自动计算，并且会缓存计算结果。

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

`watch` 选项用于监听响应式数据的变化，当数据变化时执行相应的回调函数。

```javascript
watch: {
  count(newValue, oldValue) {
    console.log(`Count changed from ${oldValue} to ${newValue}`)
  },
  // 深度监听
  user: {
    handler(newValue, oldValue) {
      console.log('User changed:', newValue)
    },
    deep: true
  }
}
```

### props

`props` 选项用于定义组件的属性，允许父组件向子组件传递数据。

```javascript
props: {
  // 基本类型
  title: String,
  count: Number,
  
  // 带默认值
  initialCount: {
    type: Number,
    default: 0
  },
  
  // 必需属性
  message: {
    type: String,
    required: true
  },
  
  // 自定义验证
  age: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 150
    }
  }
}
```

### emits

`emits` 选项用于定义组件可以触发的事件。

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

`template` 选项用于定义组件的模板，支持插值表达式、指令等。

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

## 生命周期钩子

选项式 API 提供了以下生命周期钩子：

### 创建阶段

- **beforeCreate**：组件实例创建前调用，此时数据观察和事件机制尚未初始化
- **created**：组件实例创建完成，数据观察和事件机制已初始化，但 DOM 尚未挂载

### 挂载阶段

- **beforeMount**：DOM 挂载前调用，此时模板已编译完成
- **mounted**：DOM 挂载完成，可以进行 DOM 操作

### 更新阶段

- **beforeUpdate**：数据更新前调用，此时 DOM 尚未更新
- **updated**：数据更新完成，DOM 已更新

### 卸载阶段

- **beforeUnmount**：组件卸载前调用
- **unmounted**：组件卸载完成

### 错误处理

- **errorCaptured**：捕获子组件的错误

## 组件通信

### 父向子传递数据

使用 `props` 向子组件传递数据：

```javascript
// 父组件
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

// 子组件
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

### 子向父传递数据

使用 `$emit` 触发事件向父组件传递数据：

```javascript
// 子组件
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

// 父组件
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

### 兄弟组件通信

使用事件总线或状态管理：

```javascript
// eventBus.js
import { createApp } from '@lytjs/core'

const eventBus = createApp({})

export default eventBus

// 组件 A
import eventBus from './eventBus'

const ComponentA = {
  methods: {
    sendMessage() {
      eventBus.emit('message', 'Hello from Component A')
    }
  }
}

// 组件 B
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

## 高级特性

### 混入 (Mixins)

混入允许你复用组件逻辑：

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

// 在组件中使用
import { loggerMixin } from './mixins/logger'

const MyComponent = {
  mixins: [loggerMixin],
  name: 'MyComponent',
  mounted() {
    this.log('Custom mounted logic')
  }
}
```

### 自定义指令

自定义指令允许你操作 DOM 元素：

```javascript
// 注册全局指令
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

// 在模板中使用
// <input v-focus />

// 局部指令
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

### 过滤器

过滤器用于格式化文本：

```javascript
// 注册全局过滤器
app.config.globalProperties.$filters = {
  capitalize(value) {
    if (!value) return ''
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
}

// 在模板中使用
// {{ message | capitalize }}
```

## 与组合式 API 的对比

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

## 最佳实践

### 1. 数据管理

- 只在 `data` 中定义响应式数据
- 避免在模板中直接进行复杂计算，使用 `computed` 属性
- 对于需要监听的数据变化，使用 `watch` 或 `watchEffect`

### 2. 方法组织

- 按功能组织方法，保持方法的职责单一
- 避免在方法中进行复杂的业务逻辑，考虑拆分或使用组合函数
- 使用描述性的方法名，提高代码可读性

### 3. 生命周期钩子

- 只在需要时使用生命周期钩子
- 在 `mounted` 中进行 DOM 操作，在 `beforeUnmount` 中清理资源
- 避免在 `created` 中进行 DOM 操作，因为此时 DOM 尚未挂载

### 4. 组件通信

- 对于父子组件通信，使用 `props` 和 `$emit`
- 对于兄弟组件或跨层级组件通信，使用事件总线或状态管理
- 避免使用 `$parent` 或 `$children` 进行组件通信，这会使组件耦合度增加

### 5. 性能优化

- 使用 `v-if` 和 `v-show` 合理控制元素的显示和隐藏
- 使用 `v-for` 时，务必添加 `key` 属性
- 对于复杂的计算，使用 `computed` 属性缓存结果
- 对于大型列表，考虑使用虚拟滚动

## 示例：完整的选项式 API 应用

```javascript
import { createApp } from '@lytjs/core'

const app = createApp({
  name: 'TodoApp',
  
  data() {
    return {
      newTodo: '',
      todos: [
        { id: 1, text: '学习 Lyt.js', done: false },
        { id: 2, text: '构建一个应用', done: false }
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
      <h1>📝 Todo App</h1>
      <div class="stats">
        <p>剩余 {{ remaining }} 项，已完成 {{ completed }} 项</p>
      </div>
      <form @submit.prevent="addTodo">
        <input 
          v-model="newTodo" 
          placeholder="添加新任务..." 
          class="todo-input"
        />
        <button type="submit" class="add-button">添加</button>
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
          <button @click="removeTodo(todo.id)" class="remove-button">删除</button>
        </li>
      </ul>
      <button 
        v-if="completed > 0" 
        @click="clearCompleted"
        class="clear-button"
      >
        清除已完成
      </button>
    </div>
  `
})

app.mount('#app')
```

## 总结

选项式 API 是 Lyt.js 提供的一种经典 API 风格，它通过对象选项的方式来组织组件逻辑，对于初学者来说更加直观易懂。通过使用 `data`、`methods`、`computed`、`watch` 等选项，你可以创建功能完整的组件。

选项式 API 特别适合：

- 小型组件，逻辑简单的场景
- 初学者，需要直观易懂的 API 风格
- 从传统前端框架迁移的项目
- 快速原型开发

无论是使用选项式 API 还是组合式 API，Lyt.js 都能为你提供良好的开发体验。你可以根据项目的复杂度和团队的熟悉程度选择适合的 API 风格，甚至可以在同一个项目中混合使用两种风格。