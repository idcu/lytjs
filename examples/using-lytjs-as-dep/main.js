/**
 * 真实业务应用示例（N18，2026-11-10 重写）
 *
 * ## 为什么重写
 *
 * 旧版用 `defineStore('todo', { state/getters/actions })` 的 options 形式 +
 * `useTodoStore(pinia)` 带参调用。2026-11-10 用 jsdom 真跑对照实验得到实锤：
 * getter 里 `state` 为 undefined ⇒ `remainingCount` 读 `.todos` 抛
 * `Cannot read properties of undefined`，`createApp(...).mount('#app')` 失败、
 * 页面一片空白；而 `index.html` 根本没引用本文件，`vite build` 却照样绿
 * （产物只有内联计数器）⇒ 典型「自证式假绿」。
 *
 * 现在改为只依赖稳定契约：`createApp` + `ref` / `computed` + 模板指令，
 * 数据层用 localStorage 持久化，不依赖 store 的 options 形式，也不依赖
 * `@lytjs/ui`（UI 组件是 VNode 单模式，模板组件注册链另有一套契约）。
 *
 * 运行：`npm install && npm run dev`；构建：`npm run build`。
 */
import { createApp, ref, computed } from '@lytjs/core';

const STORAGE_KEY = 'lytjs-todo-example-v1';

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTodos(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 隐私模式 / 配额不足：示例不阻断交互，内存态仍然可用
  }
}

const TodoApp = {
  setup() {
    const todos = ref(loadTodos());
    const draft = ref('');
    const filter = ref('all');

    const remaining = computed(() => todos.value.filter((t) => !t.completed).length);
    const visible = computed(() => {
      const list = todos.value;
      if (filter.value === 'active') return list.filter((t) => !t.completed);
      if (filter.value === 'completed') return list.filter((t) => t.completed);
      return list;
    });

    const commit = (next) => {
      todos.value = next;
      saveTodos(next);
    };

    const addTodo = () => {
      const text = String(draft.value ?? '').trim();
      if (!text) return;
      commit([...todos.value, { id: Date.now(), text, completed: false }]);
      draft.value = '';
    };
    const toggleTodo = (id) => {
      commit(todos.value.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    };
    const removeTodo = (id) => {
      commit(todos.value.filter((t) => t.id !== id));
    };
    const setFilter = (next) => {
      filter.value = next;
    };

    return { todos, draft, filter, remaining, visible, addTodo, toggleTodo, removeTodo, setFilter };
  },
  template: `
    <div class="todo-app">
      <h2>📝 Todo List</h2>
      <div class="todo-form">
        <input v-model="draft" placeholder="添加待办事项..." @keyup.enter="addTodo" />
        <button type="button" @click="addTodo">添加</button>
      </div>
      <p class="todo-summary">待办 {{ remaining }} 项 · 共 {{ todos.length }} 项</p>
      <div class="todo-filters">
        <button type="button" @click="setFilter('all')">全部</button>
        <button type="button" @click="setFilter('active')">未完成</button>
        <button type="button" @click="setFilter('completed')">已完成</button>
      </div>
      <ul class="todo-list">
        <li v-for="todo in visible" :key="todo.id">
          <span
            class="todo-text"
            @click="toggleTodo(todo.id)"
            :style="{ textDecoration: todo.completed ? 'line-through' : 'none' }"
          >{{ todo.text }}</span>
          <button type="button" @click="removeTodo(todo.id)">删除</button>
        </li>
      </ul>
      <p v-if="visible.length === 0" class="todo-empty">暂无待办</p>
    </div>
  `,
};

createApp(TodoApp).mount('#app');
