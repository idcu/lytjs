# 实战项目：Todo 应用

本教程将带你从零开始构建一个完整的 Todo 应用，涵盖 LytJS 的核心功能。

## 项目概述

我们将创建一个功能完整的 Todo 应用，包含以下功能：
- 添加 Todo
- 删除 Todo
- 标记 Todo
- 筛选（待办筛选（全部/未完成/已完成）
- 本地存储
- 响应式布局

## 项目结构

```
todo-app/
├── components/
│   ├── TodoInput.vue
│   ├── TodoList.vue
│   ├── TodoItem.vue
│   └── TodoFilter.vue
├── store/
│   └── todo.store.ts
├── App.vue
└── main.ts
```

## 1. 创建 Store

首先，我们创建一个 Todo Store 来管理应用状态。

```typescript
// store/todo.store.ts
import { defineStore } from '@lytjs/store'
import { signal, computed } from '@lytjs/reactivity'

export interface Todo {
  id: number
  text: string
  completed: boolean
}

export type Filter = 'all' | 'active' | 'completed'

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [] as Todo[],
    filter: 'all' as Filter
  }),

  getters: {
    filteredTodos: (state) => {
      switch (state) {
        case 'active':
          return state.todos.filter(todo => !todo.completed)
        case 'completed':
          return state.todos.filter(todo => todo.completed)
        default:
          return state.todos
      }
    },

    remainingCount: (state) => {
      return state.todos.filter(todo => !todo.completed).length
    }
  },

  actions: {
    addTodo(text: string) {
      if (!text.trim()) return
      this.todos.push({
        id: Date.now(),
        text: text.trim(),
        completed: false
      })
    },

    toggleTodo(id: number) {
      const todo = this.todos.find(todo => todo.id === id)
      if (todo) todo.completed = !todo.completed
    },

    deleteTodo(id: number) {
      this.todos = this.todos.filter(todo => todo.id !== id)
    },

    setFilter(filter: Filter) {
      this.filter = filter
    },

    clearCompleted() {
      this.todos = this.todos.filter(todo => !todo.completed)
    }
  }
})
```

## 2. 创建组件

### TodoInput 组件

```typescript
// components/TodoInput.vue
import { defineComponent, signal } from '@lytjs/core'
import { useTodoStore } from '../store/todo.store'

export default defineComponent({
  name: 'TodoInput',

  setup() {
    const todoStore = useTodoStore()
    const inputText = signal('')

    const handleSubmit = (e: Event) => {
      e.preventDefault()
      todoStore.addTodo(inputText())
      inputText('')
    }

    return {
      inputText,
      handleSubmit
    }
  },

  template: `
    <form @submit="handleSubmit" class="todo-input">
      <input
        type="text"
        v-model="inputText"
        placeholder="需要做什么？"
        autocomplete="off"
        class="new-todo"
      />
      <button type="submit" class="add-btn">添加</button>
    </form>
  `,

  styles: `
    .todo-input {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .new-todo {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .add-btn {
      padding: 8px 16px;
      background: #4fc08d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `
})
```

### TodoItem 组件

```typescript
// components/TodoItem.vue
import { defineComponent, PropType } from '@lytjs/core'
import { useTodoStore, type Todo } from '../store/todo.store'

export default defineComponent({
  name: 'TodoItem',

  props: {
    todo: Object as PropType<Todo>
  },

  setup(props) {
    const todoStore = useTodoStore()

    const toggleTodo = () => {
      todoStore.toggleTodo(props.todo.id)
    }

    const deleteTodo = () => {
      todoStore.deleteTodo(props.todo.id)
    }

    return {
      toggleTodo,
      deleteTodo
    }
  },

  template: `
    <div class="todo-item" :class="{ completed: todo.completed }">
      <input
        type="checkbox"
        :checked="todo.completed"
        @change="toggleTodo"
        class="toggle"
      />
      <div class="todo-text">{{ todo.text }}</div>
      <button @click="deleteTodo" class="destroy">×</button>
    </div>
  `,

  styles: `
    .todo-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    .todo-item.completed .todo-text {
      text-decoration: line-through;
      color: #888;
    }

    .toggle {
      width: 18px;
      height: 18px;
    }

    .todo-text {
      flex: 1;
      font-size: 16px;
    }

    .destroy {
      background: none;
      border: none;
      color: #cc9a9a;
      cursor: pointer;
      font-size: 20px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .todo-item:hover .destroy {
      opacity: 1;
    }
  `
})
```

### TodoList 组件

```typescript
// components/TodoList.vue
import { defineComponent } from '@lytjs/core'
import { useTodoStore } from '../store/todo.store'
import TodoItem from './TodoItem.vue'

export default defineComponent({
  name: 'TodoList',

  components: { TodoItem },

  setup() {
    const todoStore = useTodoStore()

    return {
      todoStore
    }
  },

  template: `
    <div class="todo-list">
      <div
        v-if="todoStore.filteredTodos.length === 0"
        class="empty-state"
      >
        暂无待办事项
      </div>
      <TodoItem
        v-for="todo in todoStore.filteredTodos"
        :key="todo.id"
        :todo="todo"
      />
    </div>
  `,

  styles: `
    .todo-list {
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .empty-state {
      padding: 20px;
      text-align: center;
      color: #888;
    }
  `
})
```

### TodoFilter 组件

```typescript
// components/TodoFilter.vue
import { defineComponent } from '@lytjs/core'
import { useTodoStore, type Filter } from '../store/todo.store'

export default defineComponent({
  name: 'TodoFilter',

  setup() {
    const todoStore = useTodoStore()

    const setFilter = (filter: Filter) => {
      todoStore.setFilter(filter)
    }

    const clearCompleted = () => {
      todoStore.clearCompleted()
    }

    return {
      todoStore,
      setFilter,
      clearCompleted
    }
  },

  template: `
    <div class="todo-footer">
      <span class="todo-count">
        <strong>{{ todoStore.remainingCount }}</strong> 项未完成
      </span>
      <div class="filters">
        <button
          :class="{ selected: todoStore.filter === 'all' }"
          @click="setFilter('all')"
        >
          全部
        </button>
        <button
          :class="{ selected: todoStore.filter === 'active' }"
          @click="setFilter('active')"
        >
          未完成
        </button>
        <button
          :class="{ selected: todoStore.filter === 'completed' }"
          @click="setFilter('completed')"
        >
          已完成
        </button>
      </div>
      <button
        class="clear-completed"
        @click="clearCompleted"
        v-if="todoStore.todos.some(t => t.completed)"
      >
        清除已完成
      </button>
    </div>
  `,

  styles: `
    .todo-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .todo-count {
      font-size: 14px;
      color: #888;
    }

    .filters {
      display: flex;
      gap: 8px;
    }

    .filters button {
      padding: 4px 8px;
      border: 1px solid #eee;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .filters button.selected {
      border-color: #4fc08d;
    }

    .clear-completed {
      padding: 4px 8px;
      border: none;
      background: none;
      color: #888;
      cursor: pointer;
    }
  `
})
```

## 3. 组装 App 组件

```typescript
// App.vue
import { defineComponent } from '@lytjs/core'
import TodoInput from './components/TodoInput.vue'
import TodoList from './components/TodoList.vue'
import TodoFilter from './components/TodoFilter.vue'

export default defineComponent({
  name: 'App',

  components: { TodoInput, TodoList, TodoFilter },

  setup() {
    return {}
  },

  template: `
    <div class="app">
      <h1>Todo 应用</h1>
      <TodoInput />
      <TodoList />
      <TodoFilter />
    </div>
  `,

  styles: `
    .app {
      max-width: 550px;
      margin: 40px auto;
      padding: 0 20px;
    }

    h1 {
      text-align: center;
      color: #4fc08d;
      margin-bottom: 32px;
    }
  `
})
```

## 4. 入口文件

```typescript
// main.ts
import { createApp } from '@lytjs/core'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

## 5. HTML 入口

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo 应用</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
```

## 本地存储持久化

我们可以添加本地存储功能，让数据刷新页面后仍然保存：

```typescript
// 在 todo.store.ts 中添加

export const useTodoStore = defineStore('todo', {
  state: () => {
    const saved = localStorage.getItem('lytjs-todos')
    return {
      todos: saved ? JSON.parse(saved) : [],
      filter: 'all' as Filter
    }
  },

  actions: {
    // ... 其他 actions ...
  },

  // 监听变化保存
  $subscribe((mutation, state) => {
    localStorage.setItem('lytjs-todos', JSON.stringify(state.todos))
  }
})
```

## 总结

这个 Todo 应用展示了 LytJS 的核心功能：
- ✅ 响应式数据管理
- ✅ 组件化开发
- ✅ 状态管理
- ✅ 组件通信
- ✅ 本地存储持久化
- ✅ 响应式 UI

希望这个示例能帮助你快速上手 LytJS！
