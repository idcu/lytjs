# Todo 应用示例

一个完整的 Todo 列表应用，演示组件、Store 和模板语法的综合使用。

## 功能特性

- 添加、删除、切换完成状态
- 统计未完成数量
- 筛选（全部/未完成/已完成）
- 本地持久化

## 完整代码

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Lyt.js Todo</title>
  <script src="https://unpkg.com/lyt/dist/lyt.global.js"></script>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 16px; }
    h1 { color: #4f46e5; }
    .input-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .input-row input { flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; }
    .input-row button { padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; }
    .filters button { padding: 4px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer; }
    .filters button.active { background: #4f46e5; color: white; border-color: #4f46e5; }
    .todo-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid #f3f4f6; }
    .todo-item.done span { text-decoration: line-through; color: #9ca3af; }
    .todo-item span { flex: 1; }
    .todo-item button { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; }
    .stats { margin-top: 16px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const { createApp, ref, computed, watch, createStore } = Lyt

    // 创建 Todo Store
    const useTodoStore = createStore('todos', {
      state: () => ({
        todos: JSON.parse(localStorage.getItem('lyt-todos') || '[]'),
        filter: 'all',
        newTodo: ''
      }),

      getters: {
        filteredTodos: (state) => {
          if (state.filter === 'active') return state.todos.filter(t => !t.done)
          if (state.filter === 'done') return state.todos.filter(t => t.done)
          return state.todos
        },
        remaining: (state) => state.todos.filter(t => !t.done).length,
        total: (state) => state.todos.length
      },

      actions: {
        addTodo() {
          const text = this.state.newTodo.trim()
          if (!text) return
          this.state.todos.push({ id: Date.now(), text, done: false })
          this.state.newTodo = ''
        },
        removeTodo(id) {
          this.state.todos = this.state.todos.filter(t => t.id !== id)
        },
        toggleTodo(id) {
          const todo = this.state.todos.find(t => t.id === id)
          if (todo) todo.done = !todo.done
        },
        setFilter(filter) {
          this.state.filter = filter
        }
      }
    })

    const app = createApp({
      init() {
        this.store = useTodoStore

        // 持久化
        watch(
          () => this.store.state.todos,
          (todos) => {
            localStorage.setItem('lyt-todos', JSON.stringify(todos))
          }
        )
      },

      template: `
        <div>
          <h1>Todo 应用</h1>
          <div class="input-row">
            <input
              v-bind:model="store.state.newTodo"
              @keyup.enter="store.actions.addTodo()"
              placeholder="添加新任务..."
            />
            <button @click="store.actions.addTodo()">添加</button>
          </div>
          <div class="filters">
            <button @click="store.actions.setFilter('all')" :class="{ active: store.state.filter === 'all' }">全部</button>
            <button @click="store.actions.setFilter('active')" :class="{ active: store.state.filter === 'active' }">未完成</button>
            <button @click="store.actions.setFilter('done')" :class="{ active: store.state.filter === 'done' }">已完成</button>
          </div>
          <div>
            <div v-each="todo in store.getters.filteredTodos" class="todo-item" :class="{ done: todo.done }">
              <input type="checkbox" :checked="todo.done" @change="store.actions.toggleTodo(todo.id)" />
              <span>{{ todo.text }}</span>
              <button @click="store.actions.removeTodo(todo.id)">&times;</button>
            </div>
          </div>
          <div class="stats">
            {{ store.getters.remaining }} / {{ store.getters.total }} 项未完成
          </div>
        </div>
      `
    })

    app.mount('#app')
  </script>
</body>
</html>
```

## 代码解析

### 1. Store 状态管理

使用 `createStore` 集中管理 Todo 数据：

```ts
const useTodoStore = createStore('todos', {
  state: () => ({ todos: [], filter: 'all', newTodo: '' }),
  getters: { filteredTodos, remaining, total },
  actions: { addTodo, removeTodo, toggleTodo, setFilter }
})
```

- **state** — 存储任务列表、筛选条件和输入值
- **getters** — 派生数据（筛选后的列表、统计信息）
- **actions** — 修改状态的操作方法

### 2. 模板语法综合使用

| 语法 | 用途 |
|------|------|
| `v-bind:model` | 双向绑定输入框 |
| `@click` | 点击事件处理 |
| `@keyup.enter` | 回车事件处理 |
| `v-each` | 列表渲染 |
| `:class` | 动态 class 绑定 |
| `:checked` | 复选框状态绑定 |
| `{{ }}` | 文本插值 |

### 3. 数据持久化

使用 `watch` 侦听 todos 变化，自动保存到 localStorage：

```ts
watch(
  () => this.store.state.todos,
  (todos) => localStorage.setItem('lyt-todos', JSON.stringify(todos))
)
```

::: tip
这个示例综合展示了 Store、响应式系统和模板语法的配合使用。更多 Store 用法请参阅 [状态管理](/guide/store)。
:::
