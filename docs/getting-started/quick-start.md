# LytJS 快速入门

> **5分钟上手 LytJS**，开始构建你的第一个应用！

---

## 目录

1. [环境准备](#环境准备)
2. [创建项目](#创建项目)
3. [第一个组件](#第一个组件)
4. [响应式基础](#响应式基础)
5. [运行项目](#运行项目)
6. [下一步](#下一步)

---

## 环境准备

确保你的环境满足要求：

```bash
# 检查 Node 版本 (需要 >= 18)
node -v

# 检查 pnpm (推荐)
pnpm -v

# 如果没有安装 pnpm
npm install -g pnpm
```

---

## 创建项目

### 方法 1: 使用 CLI (推荐)

```bash
# 使用 npx
npx @lytjs/cli create my-first-app

# 或者使用 pnpm dlx
pnpm dlx @lytjs/cli create my-first-app

# 进入项目目录
cd my-first-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 方法 2: 手动安装

```bash
# 创建项目目录
mkdir my-first-app
cd my-first-app

# 初始化项目
pnpm init -y

# 安装核心包
pnpm add @lytjs/core @lytjs/reactivity

# 安装开发依赖
pnpm add -D vite typescript @vitejs/plugin-lytjs
```

创建基础文件：

```bash
# 创建项目结构
mkdir -p src
touch index.html src/main.ts src/App.lyt
```

---

## 第一个组件

让我们创建你的第一个 LytJS 组件：

### 1. `index.html` (入口 HTML)

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>我的第一个 LytJS 应用</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 2. `src/App.lyt` (主组件)

```vue
<template>
  <div class="app">
    <h1>{{ message }}</h1>
    <p>计数: {{ count }}</p>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    <button @click="reset">重置</button>
    <p>双倍计数: {{ doubleCount }}</p>
  </div>
</template>

<script setup lang="ts">
import { signal, computed } from '@lytjs/reactivity';

// 创建响应式状态
const count = signal(0);
const message = signal('欢迎使用 LytJS!');

// 计算属性
const doubleCount = computed(() => count.value * 2);

// 方法
const increment = () => {
  count.value++;
};

const decrement = () => {
  count.value--;
};

const reset = () => {
  count.value = 0;
};
</script>

<style scoped>
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: #3b82f6;
}

button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
}

button:hover {
  background: #2563eb;
}
</style>
```

### 3. `src/main.ts` (入口文件)

```typescript
import { createApp } from '@lytjs/core';
import App from './App.lyt';

const app = createApp(App);
app.mount('#app');
```

### 4. `vite.config.ts` (Vite 配置)

```typescript
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [
    lytjs({
      vapor: true, // 启用 Vapor 模式 (可选)
    }),
  ],
});
```

---

## 响应式基础

### 信号 (Signal)

```typescript
import { signal } from '@lytjs/reactivity';

// 创建信号
const count = signal(0);
const user = signal({ name: '张三', age: 25 });

// 读取值
console.log(count.value); // 0
console.log(user.value); // { name: '张三', age: 25 }

// 更新值
count.value = 100;
user.value.name = '李四';

// 批量更新 (避免多次渲染)
user.value = { ...user.value, name: '王五', age: 30 };
```

### 计算属性 (Computed)

```typescript
import { signal, computed } from '@lytjs/reactivity';

const firstName = signal('张');
const lastName = signal('三');

// 计算属性会自动追踪依赖
const fullName = computed(() => {
  return `${firstName.value}${lastName.value}`;
});

console.log(fullName.value); // '张三'

// 更新依赖会自动更新计算值
lastName.value = '四';
console.log(fullName.value); // '张四'
```

### 效应 (Effect)

```typescript
import { signal, effect } from '@lytjs/reactivity';

const count = signal(0);

// 创建效应 - 会在依赖变化时自动运行
effect(() => {
  console.log(`计数变为: ${count.value}`);
});

// 更新值会触发效应
count.value = 1; // 输出: 计数变为: 1
count.value = 2; // 输出: 计数变为: 2
```

---

## 运行项目

### 启动开发服务器

```bash
# 进入项目目录
cd my-first-app

# 启动开发服务器
pnpm dev
```

现在打开浏览器访问 `http://localhost:5173`，你会看到你的第一个 LytJS 应用！

### 构建生产版本

```bash
# 构建项目
pnpm build

# 预览生产构建
pnpm preview
```

构建的文件在 `dist/` 目录中，可以部署到任何静态托管服务。

---

## 更多功能演示

让我们添加一些更实用的功能：

### Todo 列表示例

```vue
<template>
  <div class="todo-app">
    <h2>Todo 列表</h2>

    <input type="text" :value="newTodo" @input="handleInput" placeholder="添加新 todo..." />
    <button @click="addTodo">添加</button>

    <ul>
      <li v-for="todo in todos" :key="todo.id">
        <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)" />
        <span :class="{ done: todo.done }">{{ todo.text }}</span>
        <button @click="removeTodo(todo.id)">删除</button>
      </li>
    </ul>

    <p>完成: {{ doneCount }} / {{ todos.length }}</p>
  </div>
</template>

<script setup lang="ts">
import { signal, computed } from '@lytjs/reactivity';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const todos = signal<Todo[]>([
  { id: 1, text: '学习 LytJS', done: false },
  { id: 2, text: '创建第一个应用', done: true },
]);

const newTodo = signal('');

const doneCount = computed(() => todos.value.filter((todo) => todo.done).length);

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  newTodo.value = target.value;
};

const addTodo = () => {
  if (!newTodo.value.trim()) return;

  todos.value = [
    ...todos.value,
    {
      id: Date.now(),
      text: newTodo.value,
      done: false,
    },
  ];
  newTodo.value = '';
};

const toggleTodo = (id: number) => {
  todos.value = todos.value.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
};

const removeTodo = (id: number) => {
  todos.value = todos.value.filter((todo) => todo.id !== id);
};
</script>

<style scoped>
.todo-app {
  max-width: 500px;
  margin: 2rem auto;
}

li {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0.5rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.done {
  text-decoration: line-through;
  color: #999;
}
</style>
```

---

## 下一步

恭喜你完成了第一个 LytJS 应用！接下来你可以：

1. 📖 阅读 [完整核心概念](./index.md) 深入了解
2. 📚 查看 [实战案例教程](./tutorials.md) 学习更多例子
3. 🔌 探索 [官方插件](./official-plugins.md) 增强你的应用
4. 🛠️ 学习如何使用 [CLI 工具](./cli-guide.md)
5. 💻 了解 [TypeScript 类型系统](./typescript-guide.md)
6. 🌐 试试 [SSR/SSG](./ssr-guide.md) 进行服务端渲染

---

## 常见问题

### Q: 如何选择 Vapor 模式还是 VDOM 模式？

- **Vapor 模式** (推荐): 性能更好，包体积更小
- **VDOM 模式**: 更熟悉的开发体验，更好的兼容性

### Q: LytJS 和 Vue/React 的主要区别？

查看我们的迁移指南：

- [Vue → LytJS](./migration-from-vue.md)
- [React → LytJS](./migration-from-react.md)

### Q: 如何获取帮助？

- 查看 [FAQ](./faq.md)
- 访问 [GitHub Issues](https://github.com/lytjs/lytjs/issues)
- 加入 [Discord 社区](https://discord.gg/lytjs)

---

**祝你编码愉快！** 🚀

---

[返回文档索引](../SUMMARY.md)
