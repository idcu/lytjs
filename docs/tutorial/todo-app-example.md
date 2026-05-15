# 实战项目：Todo 应用

本教程将带你从零开始构建一个完整的 Todo 应用，涵盖 LytJS 的核心功能。

## 项目概述

我们将创建一个功能完整的 Todo 应用，包含以下功能：
- 添加 Todo
- 删除 Todo
- 标记完成/未完成
- 筛选（全部/未完成/已完成）
- 本地存储

## 第一步：创建项目

使用 CLI 创建一个新项目：

```bash
npx @lytjs/cli create todo-app
cd todo-app
pnpm install
pnpm dev
```

## 第二步：实现基础功能

让我们修改 `App.vue`，实现完整的 Todo 功能：

```vue
<script setup lang="ts">
import { signal, computed, onMounted } from '@lytjs/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = 'all' | 'active' | 'completed';

// 响应式数据
const newTodoText = signal('');
const todos = signal<Todo[]>([]);
const filter = signal<Filter>('all');

// 计算属性：筛选后的 todos
const filteredTodos = computed(() => {
  switch (filter()) {
    case 'active':
      return todos().filter(todo => !todo.completed);
    case 'completed':
      return todos().filter(todo => todo.completed);
    default:
      return todos();
  }
});

// 计算属性：未完成的数量
const remainingCount = computed(() => {
  return todos().filter(todo => !todo.completed).length;
});

// 添加 Todo
const addTodo = (e?: Event) => {
  e?.preventDefault();
  const text = newTodoText().trim();
  if (text) {
    todos([
      ...todos(),
      { id: Date.now(), text, completed: false }
    ]);
    newTodoText('');
  }
};

// 切换完成状态
const toggleTodo = (id: number) => {
  todos(todos().map(todo => 
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ));
};

// 删除 Todo
const deleteTodo = (id: number) => {
  todos(todos().filter(todo => todo.id !== id));
};

// 清除已完成
const clearCompleted = () => {
  todos(todos().filter(todo => !todo.completed));
};

// 本地存储
onMounted(() => {
  const saved = localStorage.getItem('lytjs-todos');
  if (saved) {
    todos(JSON.parse(saved));
  }
});

// 监听变化并保存
const originalTodos = todos;
todos = ((val?: Todo[] | ((prev: Todo[]) => Todo[])) => {
  if (typeof val !== 'undefined') {
    const newValue = typeof val === 'function' ? val(originalTodos()) : val;
    localStorage.setItem('lytjs-todos', JSON.stringify(newValue));
    return originalTodos(newValue);
  }
  return originalTodos();
}) as typeof originalTodos;
</script>

<template>
  <div class="app">
    <h1>Todo 应用</h1>
    
    <!-- 添加输入框 -->
    <form @submit="addTodo" class="todo-input">
      <input
        v-model="newTodoText"
        placeholder="需要做什么？"
        autocomplete="off"
      />
      <button type="submit">添加</button>
    </form>

    <!-- Todo 列表 -->
    <div class="todo-list">
      <div v-if="filteredTodos.length === 0" class="empty">
        暂无待办事项
      </div>
      <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item">
        <input
          type="checkbox"
          :checked="todo.completed"
          @change="toggleTodo(todo.id)"
        />
        <span class="text" :class="{ completed: todo.completed }">
          {{ todo.text }}
        </span>
        <button class="delete" @click="deleteTodo(todo.id)">×</button>
      </div>
    </div>

    <!-- 底部筛选 -->
    <div v-if="todos.length > 0" class="footer">
      <span>{{ remainingCount }} 项未完成</span>
      <div class="filters">
        <button
          :class="{ active: filter === 'all' }"
          @click="filter('all')"
        >全部</button>
        <button
          :class="{ active: filter === 'active' }"
          @click="filter('active')"
        >未完成</button>
        <button
          :class="{ active: filter === 'completed' }"
          @click="filter('completed')"
        >已完成</button>
      </div>
      <button
        v-if="todos.some(t => t.completed)"
        @click="clearCompleted"
        class="clear"
      >清除已完成</button>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  padding: 40px 20px;
}

.app {
  max-width: 550px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #4fc08d;
  margin-bottom: 30px;
}

.todo-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #eee;
  border-radius: 6px;
  font-size: 16px;
}

.todo-input button {
  padding: 12px 24px;
  background: #4fc08d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.todo-list {
  border-radius: 6px;
  overflow: hidden;
}

.empty {
  text-align: center;
  padding: 30px;
  color: #888;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.todo-item .text {
  flex: 1;
  font-size: 16px;
}

.todo-item .text.completed {
  text-decoration: line-through;
  color: #888;
}

.todo-item .delete {
  background: none;
  border: none;
  color: #cc9a9a;
  font-size: 24px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.todo-item:hover .delete {
  opacity: 1;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #eee;
  font-size: 14px;
  color: #666;
}

.filters {
  display: flex;
  gap: 8px;
}

.filters button {
  padding: 6px 12px;
  border: 1px solid #eee;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.filters button.active {
  border-color: #4fc08d;
  color: #4fc08d;
}

.clear {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
}
</style>
```

## 代码解析

### 1. 响应式数据

使用 `signal` 创建响应式数据：

```typescript
const newTodoText = signal('');
const todos = signal<Todo[]>([]);
const filter = signal<Filter>('all');
```

### 2. 计算属性

使用 `computed` 创建派生状态：

```typescript
const filteredTodos = computed(() => {
  // 根据 filter 返回筛选后的 todos
});
```

### 3. 本地存储

使用 `onMounted` 读取本地存储，通过包装 signal 实现自动保存：

```typescript
onMounted(() => {
  const saved = localStorage.getItem('lytjs-todos');
  if (saved) {
    todos(JSON.parse(saved));
  }
});
```

## 运行应用

```bash
pnpm dev
```

打开浏览器访问 `http://localhost:5173`，你就可以使用 Todo 应用了！

## 总结

这个 Todo 应用展示了 LytJS 的核心功能：
- ✅ Signal 响应式数据
- ✅ Computed 计算属性
- ✅ 组件化开发
- ✅ 本地存储持久化
- ✅ 响应式 UI

下一步可以继续学习：
- [状态管理](./state-management) - 更高级的状态管理
- [路由导航](./routing) - 单页应用路由
- [API 集成](./api-integration) - 与后端 API 交互
