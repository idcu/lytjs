# 快速开始

## 安装

### 使用 CLI 创建项目（推荐）

```bash
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

### CDN 直接使用

```html
<div id="app"></div>
<script type="module">
import { createApp } from 'https://esm.sh/@lytjs/core'

const app = createApp({
  template: `
    <div>
      <h1>{{ title }}</h1>
      <p>计数: {{ count }}</p>
      <button @click="count++">+1</button>
    </div>
  `,
  state: {
    title: 'Hello Lyt.js!',
    count: 0
  }
})

app.mount('#app')
</script>
```

### npm 安装

```bash
# 安装核心包
npm install @lytjs/core

# 或安装聚合包（包含所有运行时）
npm install @lytjs/lytjs
```

## 5 分钟 Todo App

```javascript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    const newTodo = ref('')
    const todos = ref([
      { id: 1, text: '学习 Lyt.js', done: false },
      { id: 2, text: '构建一个应用', done: false },
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
      <h1>📝 Todo App</h1>
      <p>剩余 {{ remaining }} 项</p>
      <form @submit.prevent="addTodo">
        <input model="newTodo" placeholder="添加新任务..." />
        <button type="submit">添加</button>
      </form>
      <ul>
        <each="todo in todos">
          <li>
            <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" />
            <span :style="{ textDecoration: todo.done ? 'line-through' : 'none' }">
              {{ todo.text }}
            </span>
            <button @click="removeTodo(todo.id)">删除</button>
          </li>
        </each>
      </ul>
    </div>
  `
})

app.mount('#app')
```

## 下一步

- [组合式 API 指南](./composition-api.md)
- [选项式 API 指南](./options-api.md)
- [响应式系统](./reactivity.md)
- [组件系统](./components.md)
- [路由](./router.md)
- [状态管理](./store.md)
