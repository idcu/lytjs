# 5 分钟快速上手

欢迎使用 LytJS！本教程将带你在 5 分钟内创建并运行你的第一个 LytJS 应用。

## 前置准备

- Node.js 18.0 或更高版本
- pnpm（推荐）或 npm/yarn

## 1. 创建项目

使用 LytJS CLI 创建新项目：

```bash
npx @lytjs/cli create my-first-app
cd my-first-app
pnpm install
```

## 2. 启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 `http://localhost:5173`，你将看到 LytJS 的欢迎页面！

## 3. 你的第一个组件

让我们修改 `src/App.vue`，创建一个简单的计数器：

```vue
<script setup lang="ts">
import { signal } from '@lytjs/core';

// 创建响应式状态 - Signal 是推荐方式
const count = signal(0);

// 定义方法
const increment = () => count(count() + 1);
const decrement = () => count(count() - 1);
</script>

<template>
  <div style="text-align: center; padding: 2rem;">
    <h1>你好，LytJS！</h1>
    <p>当前计数: {{ count }}</p>
    <div>
      <button @click="decrement" style="margin: 0 0.5rem; padding: 0.5rem 1rem;">-</button>
      <button @click="increment" style="margin: 0 0.5rem; padding: 0.5rem 1rem;">+</button>
    </div>
  </div>
</template>
```

保存后，页面会自动更新！

## 4. 添加计算属性

让我们添加一个计算属性，显示是否为偶数：

```vue
<script setup lang="ts">
import { signal, computed } from '@lytjs/core';

const count = signal(0);
const increment = () => count(count() + 1);
const decrement = () => count(count() - 1);

// 计算属性
const isEven = computed(() => count() % 2 === 0);
</script>

<template>
  <div style="text-align: center; padding: 2rem;">
    <h1>你好，LytJS！</h1>
    <p>当前计数: {{ count }}</p>
    <p>{{ isEven ? '是偶数 ✓' : '是奇数 ✗' }}</p>
    <div>
      <button @click="decrement" style="margin: 0 0.5rem; padding: 0.5rem 1rem;">-</button>
      <button @click="increment" style="margin: 0 0.5rem; padding: 0.5rem 1rem;">+</button>
    </div>
  </div>
</template>
```

## 关于 Signal

在 LytJS 中，**Signal 是推荐的响应式方式**：

```typescript
import { signal, computed } from '@lytjs/core';

// 创建
const count = signal(0);

// 读取
console.log(count()); // 0

// 更新
count(10);
console.log(count()); // 10

// 计算属性
const doubled = computed(() => count() * 2);
```

> 提示：如果你习惯 Vue 的 Ref 语法，也可以使用 `ref()`，但 Signal 是推荐方式。
> 详见[响应式基础](./reactivity.md)。

## 下一步

现在你已经掌握了基础！接下来可以按顺序学习：

1. [基础概念](./basics.md) - 了解 LytJS 的核心概念
2. [响应式基础](./reactivity.md) - 深入学习响应式系统
3. [组件基础](./components.md) - 学习组件开发
4. [实战项目](./todo-app-example.md) - 构建一个完整的 Todo 应用

需要帮助？查看 [FAQ](./faq.md) 或 [示例项目](../examples/)。
