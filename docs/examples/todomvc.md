# 待办事项示例 (TodoMVC)

经典的 TodoMVC 应用，展示 Lyt.js 的列表渲染、计算属性和本地存储功能。

## 在线演示

[在 StackBlitz 上打开](https://stackblitz.com/edit/lytjs-todomvc)

## 完整代码

```javascript
import { createApp, ref, computed, watch, onMounted, h } from '@lytjs/core'

// 存储键名
const STORAGE_KEY = 'lytjs-todomvc'

function setup() {
  // 状态
  const todos = ref([])
  const newTodo = ref('')
  const editingTodo = ref(null)
  const beforeEditCache = ref('')
  const visibility = ref('all')

  // 从本地存储加载
  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      todos.value = JSON.parse(stored)
    }
  })

  // 保存到本地存储
  watch(
    todos,
    (newVal) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
    },
    { deep: true }
  )

  // 计算属性：过滤后的待办事项
  const filteredTodos = computed(() => {
    switch (visibility.value) {
      case 'active':
        return todos.value.filter((todo) => !todo.completed)
      case 'completed':
        return todos.value.filter((todo) => todo.completed)
      default:
        return todos.value
    }
  })

  // 计算属性：未完成的数量
  const remaining = computed(() => {
    return todos.value.filter((todo) => !todo.completed).length
  })

  // 计算属性：是否全部完成
  const allDone = computed({
    get() {
      return remaining.value === 0 && todos.value.length > 0
    },
    set(value) {
      todos.value.forEach((todo) => {
        todo.completed = value
      })
    },
  })

  // 方法：添加待办事项
  const addTodo = () => {
    const value = newTodo.value.trim()
    if (!value) return

    todos.value.push({
      id: Date.now(),
      title: value,
      completed: false,
    })
    newTodo.value = ''
  }

  // 方法：删除待办事项
  const removeTodo = (todo) => {
    const index = todos.value.indexOf(todo)
    if (index > -1) {
      todos.value.splice(index, 1)
    }
  }

  // 方法：切换待办事项状态
  const toggleTodo = (todo) => {
    todo.completed = !todo.completed
  }

  // 方法：切换全部状态
  const toggleAll = (e) => {
    allDone.value = e.target.checked
  }

  // 方法：开始编辑
  const editTodo = (todo) => {
    beforeEditCache.value = todo.title
    editingTodo.value = todo
  }

  // 方法：完成编辑
  const doneEdit = (todo) => {
    if (!editingTodo.value) return

    todo.title = todo.title.trim()
    if (!todo.title) {
      removeTodo(todo)
    }
    editingTodo.value = null
  }

  // 方法：取消编辑
  const cancelEdit = (todo) => {
    editingTodo.value = null
    todo.title = beforeEditCache.value
  }

  // 方法：删除已完成的
  const removeCompleted = () => {
    todos.value = todos.value.filter((todo) => !todo.completed)
  }

  // 过滤器：复数化
  const pluralize = (n) => {
    return n === 1 ? 'item' : 'items'
  }

  return {
    todos,
    newTodo,
    editingTodo,
    visibility,
    filteredTodos,
    remaining,
    allDone,
    addTodo,
    removeTodo,
    toggleTodo,
    toggleAll,
    editTodo,
    doneEdit,
    cancelEdit,
    removeCompleted,
    pluralize,
  }
}

function render(ctx) {
  const {
    todos,
    newTodo,
    editingTodo,
    visibility,
    filteredTodos,
    remaining,
    allDone,
    addTodo,
    removeTodo,
    toggleTodo,
    toggleAll,
    editTodo,
    doneEdit,
    cancelEdit,
    removeCompleted,
    pluralize,
  } = ctx

  return h('div', { class: 'todoapp' }, [
    // Header
    h('header', { class: 'header' }, [
      h('h1', {}, 'todos'),
      h('input', {
        class: 'new-todo',
        placeholder: 'What needs to be done?',
        value: newTodo.value,
        onInput: (e) => { newTodo.value = e.target.value },
        onKeyup: (e) => { if (e.key === 'Enter') addTodo() },
        autofocus: true,
      }),
    ]),

    // Main
    todos.value.length > 0 && h('section', { class: 'main' }, [
      h('input', {
        id: 'toggle-all',
        class: 'toggle-all',
        type: 'checkbox',
        checked: allDone.value,
        onChange: toggleAll,
      }),
      h('label', { for: 'toggle-all' }, 'Mark all as complete'),

      h('ul', { class: 'todo-list' },
        filteredTodos.value.map(todo =>
          h('li', {
            key: todo.id,
            class: {
              completed: todo.completed,
              editing: todo === editingTodo.value,
            },
          }, [
            h('div', { class: 'view' }, [
              h('input', {
                class: 'toggle',
                type: 'checkbox',
                checked: todo.completed,
                onChange: () => toggleTodo(todo),
              }),
              h('label', { onDblclick: () => editTodo(todo) }, todo.title),
              h('button', { class: 'destroy', onClick: () => removeTodo(todo) }),
            ]),
            editingTodo.value === todo && h('input', {
              class: 'edit',
              value: todo.title,
              onInput: (e) => { todo.title = e.target.value },
              onBlur: () => doneEdit(todo),
              onKeyup: (e) => {
                if (e.key === 'Enter') doneEdit(todo)
                if (e.key === 'Escape') cancelEdit(todo)
              },
            }),
          ])
        )
      ),
    ]),

    // Footer
    todos.value.length > 0 && h('footer', { class: 'footer' }, [
      h('span', { class: 'todo-count' }, [
        h('strong', {}, remaining.value),
        ` ${pluralize(remaining.value)} left`,
      ]),

      h('ul', { class: 'filters' }, [
        h('li', {}, h('a', {
          href: '#/all',
          class: { selected: visibility.value === 'all' },
        }, 'All')),
        h('li', {}, h('a', {
          href: '#/active',
          class: { selected: visibility.value === 'active' },
        }, 'Active')),
        h('li', {}, h('a', {
          href: '#/completed',
          class: { selected: visibility.value === 'completed' },
        }, 'Completed')),
      ]),

      todos.value.length > remaining.value && h('button', {
        class: 'clear-completed',
        onClick: removeCompleted,
      }, 'Clear completed'),
    ]),
  ])
}

const app = createApp({ setup, render })
app.mount('#app')
```

```css
/* TodoMVC 样式 */
.todoapp {
  background: #fff;
  margin: 130px 0 40px 0;
  position: relative;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
}

.todoapp h1 {
  position: absolute;
  top: -140px;
  width: 100%;
  font-size: 80px;
  font-weight: 200;
  text-align: center;
  color: #b83f45;
  -webkit-text-rendering: optimizeLegibility;
  -moz-text-rendering: optimizeLegibility;
  text-rendering: optimizeLegibility;
}

.new-todo,
.edit {
  position: relative;
  margin: 0;
  width: 100%;
  font-size: 24px;
  font-family: inherit;
  font-weight: inherit;
  line-height: 1.4em;
  color: inherit;
  padding: 6px;
  border: 1px solid #999;
  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.new-todo {
  padding: 16px 16px 16px 60px;
  border: none;
  background: rgba(0, 0, 0, 0.003);
  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);
}

.main {
  position: relative;
  z-index: 2;
  border-top: 1px solid #e6e6e6;
}

.toggle-all {
  width: 1px;
  height: 1px;
  border: none;
  opacity: 0;
  position: absolute;
  right: 100%;
  bottom: 100%;
}

.toggle-all + label {
  width: 60px;
  height: 34px;
  font-size: 0;
  position: absolute;
  top: -52px;
  left: -13px;
  -webkit-transform: rotate(90deg);
  transform: rotate(90deg);
}

.toggle-all + label:before {
  content: '❯';
  font-size: 22px;
  color: #e6e6e6;
  padding: 10px 27px 10px 27px;
}

.toggle-all:checked + label:before {
  color: #737373;
}

.todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.todo-list li {
  position: relative;
  font-size: 24px;
  border-bottom: 1px solid #ededed;
}

.todo-list li:last-child {
  border-bottom: none;
}

.todo-list li.editing {
  border-bottom: none;
  padding: 0;
}

.todo-list li.editing .edit {
  display: block;
  width: calc(100% - 43px);
  padding: 12px 16px;
  margin: 0 0 0 43px;
}

.todo-list li.editing .view {
  display: none;
}

.todo-list li .toggle {
  text-align: center;
  width: 40px;
  height: auto;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  border: none;
  -webkit-appearance: none;
  appearance: none;
}

.todo-list li .toggle {
  opacity: 0;
}

.todo-list li .toggle + label {
  background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E');
  background-repeat: no-repeat;
  background-position: center left;
}

.todo-list li .toggle:checked + label {
  background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E');
}

.todo-list li label {
  word-break: break-all;
  padding: 15px 15px 15px 60px;
  display: block;
  line-height: 1.2;
  transition: color 0.4s;
}

.todo-list li.completed label {
  color: #d9d9d9;
  text-decoration: line-through;
}

.todo-list li .destroy {
  display: none;
  position: absolute;
  top: 0;
  right: 10px;
  bottom: 0;
  width: 40px;
  height: 40px;
  margin: auto 0;
  font-size: 30px;
  color: #cc9a9a;
  margin-bottom: 11px;
  transition: color 0.2s ease-out;
}

.todo-list li .destroy:hover {
  color: #af5b5e;
}

.todo-list li .destroy:after {
  content: '×';
}

.todo-list li:hover .destroy {
  display: block;
}

.todo-list li .edit {
  display: none;
}

.footer {
  color: #777;
  padding: 10px 15px;
  height: 20px;
  text-align: center;
  border-top: 1px solid #e6e6e6;
}

.footer:before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 50px;
  overflow: hidden;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6,
    0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6,
    0 17px 2px -6px rgba(0, 0, 0, 0.2);
}

.todo-count {
  float: left;
  text-align: left;
}

.todo-count strong {
  font-weight: 300;
}

.filters {
  margin: 0;
  padding: 0;
  list-style: none;
  position: absolute;
  right: 0;
  left: 0;
}

.filters li {
  display: inline;
}

.filters li a {
  color: inherit;
  margin: 3px;
  padding: 3px 7px;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 3px;
}

.filters li a:hover {
  border-color: rgba(175, 47, 47, 0.1);
}

.filters li a.selected {
  border-color: rgba(175, 47, 47, 0.2);
}

.clear-completed,
html .clear-completed:active {
  float: right;
  position: relative;
  line-height: 20px;
  text-decoration: none;
  cursor: pointer;
}

.clear-completed:hover {
  text-decoration: underline;
}
```

## 关键代码解释

### 1. 列表渲染

```javascript
h('ul', { class: 'todo-list' },
  filteredTodos.value.map(todo =>
    h('li', { key: todo.id }, [...])
  )
)
```

使用数组 `map` 方法渲染列表。`key` 是必需的，用于帮助框架高效地更新列表。

### 2. 计算属性 (`computed`)

```typescript
const filteredTodos = computed(() => {
  switch (visibility.value) {
    case 'active':
      return todos.value.filter((todo) => !todo.completed)
    case 'completed':
      return todos.value.filter((todo) => todo.completed)
    default:
      return todos.value
  }
})
```

计算属性会根据依赖的响应式数据自动重新计算。这里根据当前筛选条件返回不同的待办事项列表。

### 3. 双向绑定

```javascript
h('input', {
  value: newTodo.value,
  onInput: (e) => { newTodo.value = e.target.value },
})
```

通过 `value` 和 `onInput` 实现表单输入和状态之间的双向绑定。

### 4. 本地存储持久化

```typescript
watch(
  todos,
  (newVal) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal))
  },
  { deep: true }
)
```

使用 `watch` 监听 `todos` 的变化，并保存到 `localStorage`。`deep: true` 确保嵌套属性的变化也能被监听到。

### 5. 动态类绑定

```javascript
h('li', {
  class: {
    completed: todo.completed,
    editing: todo === editingTodo.value,
  },
})
```

使用对象语法动态绑定类。当条件为真时，对应的类会被添加到元素上。

## 下一步

- 学习 [组件系统](../guide/component)
- 了解 [组合式 API](../guide/composition-api)
- 尝试 [用户列表示例](./user-list)
