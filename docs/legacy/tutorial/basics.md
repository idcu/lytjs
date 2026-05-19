# 基础概念

欢迎学习 LytJS 的基础概念！本文将介绍你需要了解的核心知识。

## 什么是 LytJS？

LytJS 是一个轻量级、高性能的渐进式 JavaScript 框架，专为构建现代 Web 应用而设计。

### 核心特性

- ⚡ **Signal 响应式** - 细粒度的响应式更新
- 🧩 **渐进式架构** - 从简单到复杂，按需使用
- 📦 **TypeScript 优先** - 完整的类型支持
- 🛡️ **零运行时依赖** - 代码纯净可控

---

## 核心概念

### 1. Signal（推荐）

Signal 是 LytJS 响应式系统的基础。它是一个可以读写的响应式数据：

```typescript
import { signal } from '@lytjs/core';

// 创建一个 Signal
const count = signal(0);

// 读取值
console.log(count()); // 0

// 更新值
count(10);
console.log(count()); // 10
```

当 Signal 的值改变时，所有使用它的地方会自动更新。

### 2. Computed（计算属性）

Computed 用于创建基于其他响应式数据的派生状态：

```typescript
import { signal, computed } from '@lytjs/core';

const firstName = signal('张');
const lastName = signal('三');

const fullName = computed(() => `${firstName()} ${lastName()}`);

console.log(fullName()); // "张 三"

firstName('李');
console.log(fullName()); // "李 三"（自动更新）
```

### 3. Effect（副作用）

Effect 用于执行响应式数据变化时的副作用操作：

```typescript
import { signal, effect } from '@lytjs/core';

const count = signal(0);

effect(() => {
  console.log('当前计数:', count());
});

count(1); // 打印: 当前计数: 1
count(2); // 打印: 当前计数: 2
```

### 4. 组件

组件是构建 UI 的基本单元：

```vue
<script setup lang="ts">
import { signal } from '@lytjs/core';

const count = signal(0);
</script>

<template>
  <div>
    <p>计数: {{ count }}</p>
    <button @click="count(count() + 1)">+1</button>
  </div>
</template>
```

---

## 学习路径

按以下顺序学习，效果最佳：

1. ✅ 快速上手 - 5 分钟创建你的第一个应用
2. 📖 基础概念（本文）- 了解核心概念
3. 🎯 响应式基础 - 深入学习 Signal
4. 🧩 组件基础 - 学习组件开发
5. 🚀 实战项目 - 构建完整应用

---

## 下一步

- 学习 [响应式基础](./reactivity) - 深入了解 Signal
- 学习 [组件基础](./components) - 开始组件开发
- 查看 [示例项目](../examples) - 查看更多代码示例
