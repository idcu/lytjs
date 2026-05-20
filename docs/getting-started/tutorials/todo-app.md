# Todo 待办应用实战案例

本案例展示如何使用 LytJS 构建一个功能完整的待办事项管理应用。

## 📋 功能清单

- ✅ 添加新待办
- ✅ 标记完成/未完成
- ✅ 删除待办
- ✅ 过滤显示（全部/进行中/已完成）
- ✅ 本地存储持久化
- ✅ 深色/浅色主题切换
- ✅ 统计信息展示

---

## 🏗️ 项目结构

```
examples/complete-todo/
├── index.html         # 入口文件
└── main.ts           # 主应用代码
```

---

## 💻 完整代码解析

### 1. 类型定义

```typescript
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

type FilterType = 'all' | 'active' | 'completed';
```

### 2. 应用入口

```typescript
import { createApp, h, ref, computed, watch } from '@lytjs/core';

function TodoApp() {
  // 响应式状态
  const inputText = ref('');
  const todos = ref<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const darkMode = ref(false);

  // ... 后续代码
}
```

### 3. 本地存储集成

```typescript
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem('lyt-todos');
    if (saved) {
      todos.value = JSON.parse(saved);
    }
    const darkModeSaved = localStorage.getItem('lyt-dark-mode');
    if (darkModeSaved) {
      darkMode.value = darkModeSaved === 'true';
    }
  } catch (e) {
    console.error('加载数据失败', e);
  }
};

const saveToStorage = () => {
  localStorage.setItem('lyt-todos', JSON.stringify(todos.value));
  localStorage.setItem('lyt-dark-mode', String(darkMode.value));
};

// 监听变化自动保存
watch(todos, () => saveToStorage());
watch(darkMode, () => saveToStorage());
```

### 4. 计算属性

```typescript
const filteredTodos = computed(() => {
  switch (filter.value) {
    case 'active':
      return todos.value.filter((todo) => !todo.completed);
    case 'completed':
      return todos.value.filter((todo) => todo.completed);
    default:
      return todos.value;
  }
});

const activeCount = computed(() => todos.value.filter((todo) => !todo.completed).length);

const hasCompleted = computed(() => todos.value.some((todo) => todo.completed));
```

### 5. 核心功能实现

```typescript
const addTodo = (e: Event) => {
  e.preventDefault();
  const text = inputText.value.trim();
  if (text) {
    todos.value.push({
      id: Date.now(),
      text,
      completed: false,
      createdAt: Date.now(),
    });
    inputText.value = '';
  }
};

const toggleTodo = (id: number) => {
  const todo = todos.value.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
  }
};

const deleteTodo = (id: number) => {
  const index = todos.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    todos.value.splice(index, 1);
  }
};

const clearCompleted = () => {
  todos.value = todos.value.filter((todo) => !todo.completed);
};
```

### 6. 渲染函数

```typescript
return h(
  'div',
  {
    class: darkMode.value ? 'dark-mode' : '',
    style: { transition: 'all 0.3s ease' },
  },
  [renderHeader(), renderInputSection(), renderFilterButtons(), renderTodoList(), renderStats()],
);
```

---

## 🎨 UI 组件

本案例使用基础 LytJS 构建，不依赖额外的 UI 库，展示了框架的核心能力。

---

## 🔑 技术要点

### 1. 响应式系统

- 使用 `ref` 管理基础类型状态
- 使用 `computed` 派生状态
- 使用 `watch` 监听数据变化

### 2. 性能优化

- 过滤数据使用计算属性自动缓存
- 使用 key 优化列表渲染
- 批量更新避免多次重渲染

### 3. 用户体验

- 本地存储持久化数据
- 主题切换动画
- 友好的统计展示

---

## 🚀 运行示例

```bash
# 打开示例目录
cd examples/complete-todo

# 在浏览器中打开
open index.html
```

或者使用 Vite 开发服务器：

```bash
cd examples
npm install
npm run dev
```

然后在浏览器中访问 http://localhost:5173/complete-todo/

---

## 📚 进阶练习

1. 添加待办事项编辑功能
2. 实现待办事项拖拽排序
3. 添加优先级和标签分类
4. 支持数据导出/导入（JSON）
5. 添加任务截止时间提醒

---

## 🎯 下一步

完成本案例后，继续学习：

- [用户管理系统](./用户管理案例.md) - 学习状态管理和路由
- [API 集成](./api-integration.md) - 学习与后端交互
