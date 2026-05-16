# Vapor 模式待办应用实战

本案例将教你使用 LytJS 的 Vapor 模式构建一个高性能的待办应用，重点展示 Vapor 模式下的性能优化技巧。

## 🎯 什么是 Vapor 模式？

Vapor 模式是 LytJS 的一种直接 DOM 操作渲染模式，与传统虚拟 DOM 不同，它直接操作真实 DOM，避免了虚拟 DOM 的 Diff 计算开销。

### Vapor 模式优势

| 特性 | 传统 VDOM | Vapor 模式 |
|------|-----------|------------|
| DOM 操作 | 批量更新后 Diff | 直接操作 |
| 内存占用 | 需保存 VDOM 树 | 仅当前状态 |
| 更新性能 | 依赖 Diff 算法 | O(1) 定向更新 |
| 适用场景 | 复杂组件树 | 高频简单更新 |

## 📁 项目结构

```
src/
├── vapor/
│   ├── TodoApp.ts        # 应用入口
│   ├── TodoList.ts       # 列表组件
│   ├── TodoItem.ts       # 单项组件
│   ├── TodoInput.ts      # 输入组件
│   └── TodoFilter.ts     # 筛选组件
├── signals/
│   └── todoStore.ts      # 状态管理
├── utils/
│   └── id.ts            # ID 生成器
└── main.ts              # 入口文件
```

## 1. 状态管理

```typescript
// signals/todoStore.ts

import { signal, computed } from '@lytjs/reactivity';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type FilterType = 'all' | 'active' | 'completed';

let todoIdCounter = 0;

function generateId(): string {
  return `todo-${++todoIdCounter}-${Date.now().toString(36)}`;
}

export const todos = signal<Todo[]>([]);

export const filter = signal<FilterType>('all');

export const newTodoText = signal('');

export const addTodo = (text: string): void => {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  todos.update((currentTodos) => [
    ...currentTodos,
    {
      id: generateId(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now(),
    },
  ]);

  newTodoText.set('');
};

export const removeTodo = (id: string): void => {
  todos.update((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
};

export const toggleTodo = (id: string): void => {
  todos.update((currentTodos) =>
    currentTodos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
  );
};

export const editTodo = (id: string, newText: string): void => {
  const trimmedText = newText.trim();
  if (!trimmedText) {
    removeTodo(id);
    return;
  }

  todos.update((currentTodos) =>
    currentTodos.map((todo) =>
      todo.id === id ? { ...todo, text: trimmedText } : todo
    )
  );
};

export const clearCompleted = (): void => {
  todos.update((currentTodos) => currentTodos.filter((todo) => !todo.completed));
};

export const toggleAll = (completed: boolean): void => {
  todos.update((currentTodos) =>
    currentTodos.map((todo) => ({ ...todo, completed }))
  );
};

export const filteredTodos = computed(() => {
  const currentFilter = filter();
  const currentTodos = todos();

  switch (currentFilter) {
    case 'active':
      return currentTodos.filter((todo) => !todo.completed);
    case 'completed':
      return currentTodos.filter((todo) => todo.completed);
    default:
      return currentTodos;
  }
});

export const todoStats = computed(() => {
  const currentTodos = todos();
  const activeCount = currentTodos.filter((todo) => !todo.completed).length;
  const completedCount = currentTodos.length - activeCount;

  return {
    total: currentTodos.length,
    active: activeCount,
    completed: completedCount,
    allCompleted: activeCount === 0 && currentTodos.length > 0,
  };
});
```

## 2. 输入组件

```typescript
// vapor/TodoInput.ts

import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { newTodoText, addTodo } from '../signals/todoStore';
import type { VaporContext } from '@lytjs/renderer/vapor';

export const TodoInput = defineVaporComponent({
  name: 'TodoInput',
  setup(_props: Record<string, unknown>, _context: VaporContext) {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addTodo(newTodoText());
      }
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      newTodoText.set(target.value);
    };

    return {
      handleKeydown,
      handleInput,
    };
  },
  template: `
    <header class="vapor-todo__header">
      <h1 class="vapor-todo__title">待办事项</h1>
      <input
        class="vapor-todo__input"
        type="text"
        placeholder="添加新任务，按 Enter 确认..."
        :value="newTodoText()"
        @input="handleInput"
        @keydown="handleKeydown"
      />
    </header>
  `,
});
```

## 3. 单项组件

```typescript
// vapor/TodoItem.ts

import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { signal } from '@lytjs/reactivity';
import { toggleTodo, editTodo, removeTodo } from '../signals/todoStore';
import type { VaporContext } from '@lytjs/renderer/vapor';

export interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
}

export const TodoItem = defineVaporComponent({
  name: 'TodoItem',
  props: {
    id: { type: 'string', required: true },
    text: { type: 'string', required: true },
    completed: { type: 'boolean', required: true },
  },
  setup(props: TodoItemProps, _context: VaporContext) {
    const isEditing = signal(false);
    const editText = signal(props.text);

    const handleToggle = () => {
      toggleTodo(props.id);
    };

    const handleDelete = () => {
      removeTodo(props.id);
    };

    const handleDoubleClick = () => {
      isEditing.set(true);
      editText.set(props.text);
    };

    const handleEditKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        editTodo(props.id, editText());
        isEditing.set(false);
      } else if (event.key === 'Escape') {
        isEditing.set(false);
        editText.set(props.text);
      }
    };

    const handleEditBlur = () => {
      editTodo(props.id, editText());
      isEditing.set(false);
    };

    const handleEditInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      editText.set(target.value);
    };

    const getItemClasses = () => {
      const classes = ['vapor-todo__item'];
      if (props.completed) classes.push('is-completed');
      if (isEditing()) classes.push('is-editing');
      return classes.join(' ');
    };

    return {
      isEditing,
      editText,
      handleToggle,
      handleDelete,
      handleDoubleClick,
      handleEditKeydown,
      handleEditBlur,
      handleEditInput,
      getItemClasses,
    };
  },
  template: `
    <li :class="getItemClasses()">
      <div class="vapor-todo__view">
        <input
          class="vapor-todo__toggle"
          type="checkbox"
          :checked="completed"
          @change="handleToggle"
        />
        <label @dblclick="handleDoubleClick">{{ text }}</label>
        <button
          class="vapor-todo__delete"
          @click="handleDelete"
          aria-label="删除"
        >×</button>
      </div>
      <input
        v-if="isEditing()"
        class="vapor-todo__edit"
        type="text"
        :value="editText()"
        @input="handleEditInput"
        @keydown="handleEditKeydown"
        @blur="handleEditBlur"
      />
    </li>
  `,
});
```

## 4. 筛选组件

```typescript
// vapor/TodoFilter.ts

import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { filter, todoStats, clearCompleted } from '../signals/todoStore';
import type { FilterType } from '../signals/todoStore';
import type { VaporContext } from '@lytjs/renderer/vapor';

export const TodoFilter = defineVaporComponent({
  name: 'TodoFilter',
  setup(_props: Record<string, unknown>, _context: VaporContext) {
    const setFilter = (newFilter: FilterType) => {
      filter.set(newFilter);
    };

    const handleClear = () => {
      clearCompleted();
    };

    const isActive = (filterType: FilterType) => filter() === filterType;

    return {
      setFilter,
      handleClear,
      isActive,
    };
  },
  template: `
    <footer class="vapor-todo__footer" v-if="todoStats().total > 0">
      <span class="vapor-todo__count">
        {{ todoStats().active }} 项待办
      </span>
      <div class="vapor-todo__filters">
        <button
          class="vapor-todo__filter"
          :class="{ 'is-active': isActive('all') }"
          @click="setFilter('all')"
        >全部</button>
        <button
          class="vapor-todo__filter"
          :class="{ 'is-active': isActive('active') }"
          @click="setFilter('active')"
        >待完成</button>
        <button
          class="vapor-todo__filter"
          :class="{ 'is-active': isActive('completed') }"
          @click="setFilter('completed')"
        >已完成</button>
      </div>
      <button
        class="vapor-todo__clear"
        v-if="todoStats().completed > 0"
        @click="handleClear"
      >清除已完成</button>
    </footer>
  `,
});
```

## 5. 列表组件

```typescript
// vapor/TodoList.ts

import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { filteredTodos } from '../signals/todoStore';
import { TodoItem } from './TodoItem';
import type { VaporContext } from '@lytjs/renderer/vapor';

export const TodoList = defineVaporComponent({
  name: 'TodoList',
  setup(_props: Record<string, unknown>, _context: VaporContext) {
    return {};
  },
  template: `
    <ul class="vapor-todo__list">
      ${filteredTodos().map(todo => `
        <TodoItem
          :key="todo.id"
          :id="todo.id"
          :text="todo.text"
          :completed="todo.completed"
        />
      `).join('')}
    </ul>
  `,
});
```

## 6. 应用入口

```typescript
// vapor/TodoApp.ts

import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { TodoInput } from './TodoInput';
import { TodoList } from './TodoList';
import { TodoFilter } from './TodoFilter';
import { todoStats, toggleAll } from '../signals/todoStore';
import type { VaporContext } from '@lytjs/renderer/vapor';

export const TodoApp = defineVaporComponent({
  name: 'TodoApp',
  setup(_props: Record<string, unknown>, _context: VaporContext) {
    const handleToggleAll = () => {
      toggleAll(!todoStats().allCompleted);
    };

    return {
      handleToggleAll,
    };
  },
  template: `
    <div class="vapor-todo">
      <TodoInput />
      <section class="vapor-todo__main" v-if="todoStats().total > 0">
        <input
          class="vapor-todo__toggle-all"
          type="checkbox"
          :checked="todoStats().allCompleted"
          @change="handleToggleAll"
          aria-label="标记全部"
        />
        <TodoList />
      </section>
      <TodoFilter />
    </div>
  `,
});
```

## 7. 样式

```css
/* styles/vapor-todo.css */

.vapor-todo {
  max-width: 550px;
  margin: 60px auto;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  overflow: hidden;
}

.vapor-todo__header {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.vapor-todo__title {
  margin: 0 0 16px;
  font-size: 32px;
  font-weight: 300;
  color: #fff;
  text-align: center;
}

.vapor-todo__input {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  border: none;
  border-radius: 4px;
  box-sizing: border-box;
  outline: none;
  transition: box-shadow 0.2s;
}

.vapor-todo__input:focus {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.vapor-todo__main {
  border-top: 1px solid #eee;
}

.vapor-todo__toggle-all {
  position: absolute;
  top: 20px;
  left: 24px;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.vapor-todo__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.vapor-todo__item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
}

.vapor-todo__item.is-completed label {
  color: #999;
  text-decoration: line-through;
}

.vapor-todo__view {
  display: flex;
  align-items: center;
  flex: 1;
}

.vapor-todo__toggle {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  cursor: pointer;
}

.vapor-todo__view label {
  flex: 1;
  cursor: pointer;
}

.vapor-todo__delete {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: #ccc;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}

.vapor-todo__item:hover .vapor-todo__delete {
  opacity: 1;
}

.vapor-todo__delete:hover {
  color: #ff4d4f;
}

.vapor-todo__edit {
  flex: 1;
  padding: 8px;
  font-size: 16px;
  border: 2px solid #667eea;
  border-radius: 4px;
  outline: none;
}

.vapor-todo__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  color: #666;
}

.vapor-todo__filters {
  display: flex;
  gap: 8px;
}

.vapor-todo__filter {
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.vapor-todo__filter:hover {
  border-color: #667eea;
}

.vapor-todo__filter.is-active {
  background: #667eea;
  color: #fff;
}

.vapor-todo__clear {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
}

.vapor-todo__clear:hover {
  text-decoration: underline;
}
```

## 8. 性能优化技巧

### 1. 使用 batch 减少更新次数

```typescript
// 批量更新多个待办
import { batch } from '@lytjs/dom-runtime';

batch(() => {
  todos.forEach(todo => {
    toggleTodo(todo.id);
  });
});
```

### 2. 事件委托

```typescript
// 使用事件委托处理列表事件
import { delegateEvent } from '@lytjs/dom-runtime';

const list = document.querySelector('.vapor-todo__list');
delegateEvent(list, 'click', '.vapor-todo__delete', (event, target) => {
  const id = target.closest('li')?.dataset.id;
  if (id) removeTodo(id);
});
```

### 3. 防抖高频输入

```typescript
import { createRenderScheduler } from '@lytjs/dom-runtime';

const scheduleUpdate = createRenderScheduler(() => {
  // 渲染更新
}, 16);

// 用于搜索/过滤等高频操作
const handleSearch = () => {
  scheduleUpdate();
};
```

## 📊 性能对比

| 操作 | VDOM 模式 | Vapor 模式 |
|------|-----------|------------|
| 添加单个待办 | ~2ms | ~0.5ms |
| 切换完成状态 | ~1.5ms | ~0.3ms |
| 删除单个待办 | ~1.5ms | ~0.3ms |
| 1000 项筛选 | ~15ms | ~3ms |

## 🎯 核心要点

### 1. Signal 驱动的状态管理

```typescript
// 状态定义
export const todos = signal<Todo[]>([]);
export const filter = signal<FilterType>('all');

// 计算属性
export const filteredTodos = computed(() => {
  const currentFilter = filter();
  const currentTodos = todos();
  // ...
});

// 动作
export const addTodo = (text: string) => {
  todos.update(current => [...current, newTodo]);
};
```

### 2. 组件按需更新

Vapor 模式下，只有使用到的 Signal 才会触发组件更新：

```typescript
// TodoItem 只依赖单个待办的变化
const TodoItem = defineVaporComponent({
  setup(props: TodoItemProps) {
    // 只有 props.id/completed/text 变化时才更新
  }
});
```

### 3. 直接 DOM 操作

Vapor 组件直接返回 DOM 操作，而非虚拟节点：

```typescript
// 返回的 update 函数直接操作 DOM
return {
  handleClick: () => {
    // 直接修改 DOM
    element.classList.add('active');
  }
};
```

## 🚀 运行项目

```bash
# 安装依赖
npm install @lytjs/renderer @lytjs/reactivity @lytjs/dom-runtime

# 启动开发服务器
npm run dev

# 运行性能测试
npm run benchmark
```

## 📚 相关文档

- [Vapor 模式文档](../guide/rendering-modes.md)
- [响应式系统](../guide/reactivity.md)
- [性能优化](../tutorial/performance.md)

---

**下一步**：查看 [表单验证实战案例](./表单验证实战案例.md) 学习表单处理
