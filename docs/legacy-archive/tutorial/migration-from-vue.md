# 从 Vue 迁移到 LytJS

本指南将帮助你从 Vue 3 迁移到 LytJS，展示如何将 Vue 的概念映射到 LytJS。

## 为什么选择 LytJS？

LytJS 与 Vue 有很多相似之处，但提供了一些独特优势：

- ✅ **零第三方依赖** - 运行时不依赖任何第三方库
- ✅ **双渲染模式** - Vapor（信号驱动）和 VDOM 两种模式可选
- ✅ **极致性能** - Vapor 模式下比 Vue 更轻量、更快
- ✅ **相同的开发体验** - 熟悉的 Composition API 风格

## 快速对比

| 功能       | Vue 3           | LytJS           |
| ---------- | --------------- | --------------- |
| 响应式系统 | ref/reactive    | signal/reactive |
| 组件定义   | defineComponent | defineComponent |
| 模板语法   | 相同            | 相同            |
| 生命周期   | onMounted 等    | 相同            |
| 渲染模式   | VDOM            | Vapor + VDOM    |
| 生态插件   | VueUse 等       | 官方 10+ 插件   |

## 第一步：安装和设置

### 安装依赖

```bash
# Vue 项目
npm install vue vue-router pinia

# LytJS 项目
npm install @lytjs/core @lytjs/reactivity @lytjs/router @lytjs/store @lytjs/ui
```

### 创建应用

**Vue:**

```typescript
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.use(router);
app.use(pinia);
app.mount('#app');
```

**LytJS:**

```typescript
import { createApp } from '@lytjs/core';
import App from './App.vue';

const app = createApp(App);
app.use(router);
app.use(store);
app.mount('#app');

// 或者使用 Vapor 模式（性能更佳）
import { createVaporApp } from '@lytjs/renderer';
const app = createVaporApp(App);
app.mount('#app');
```

## 响应式系统迁移

### 基础响应式值

**Vue 3:**

```typescript
import { ref, computed, watch, watchEffect } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

watch(count, (newVal) => console.log(newVal));
```

**LytJS:**

```typescript
import { signal, computed, watch, watchEffect } from '@lytjs/reactivity';

const count = signal(0);
const doubled = computed(() => count() * 2);

watch(count, (newVal) => console.log(newVal));

// ⚠️ 注意：signal 使用函数调用语法
console.log(count()); // 读取
count.set(1); // 写入
```

### 响应式对象

**Vue 3:**

```typescript
import { reactive } from 'vue';

const state = reactive({
  name: 'LytJS',
  count: 0,
});

state.count++;
```

**LytJS:**

```typescript
import { reactive } from '@lytjs/reactivity';

const state = reactive({
  name: 'LytJS',
  count: 0,
});

state.count++; // 相同的语法！
```

## 组件定义

### 基础组件

**Vue 3 (Options API):**

```typescript
export default {
  name: 'MyComponent',
  props: {
    message: String,
  },
  data() {
    return {
      count: 0,
    };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
};
```

**Vue 3 (Composition API):**

```typescript
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'MyComponent',
  props: {
    message: String,
  },
  setup(props) {
    const count = ref(0);

    const increment = () => {
      count.value++;
    };

    return { count, increment };
  },
});
```

**LytJS:**

```typescript
import { defineComponent, signal } from '@lytjs/component';

export default defineComponent({
  name: 'MyComponent',
  props: {
    message: String,
  },
  setup(props) {
    const count = signal(0);

    const increment = () => {
      count.set(count() + 1);
    };

    return { count, increment };
  },
});
```

### 模板语法

**好消息：模板语法基本相同！**

```html
<!-- Vue 和 LytJS 相同 -->
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="increment">点击 {{ count }} 次</button>
    <input v-model="inputValue" />
    <div v-if="show">显示内容</div>
    <div v-for="item in items" :key="item.id">{{ item }}</div>
  </div>
</template>
```

## 状态管理

### Vue (Pinia)

```typescript
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Pinia',
  }),
  actions: {
    increment() {
      this.count++;
    },
  },
  getters: {
    doubleCount: (state) => state.count * 2,
  },
});
```

### LytJS (Store)

```typescript
import { defineStore } from '@lytjs/store';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'LytJS',
  }),
  actions: {
    increment() {
      this.count++;
    },
  },
  getters: {
    doubleCount: (state) => state.count * 2,
  },
});
```

## 路由

### Vue Router

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 在组件中使用
import { useRouter, useRoute } from 'vue-router'

setup() {
  const router = useRouter()
  const route = useRoute()

  const goToAbout = () => {
    router.push('/about')
  }
}
```

### LytJS Router

```typescript
import { createRouter, createWebHistory } from '@lytjs/router'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 在组件中使用
import { useRouter, useRoute } from '@lytjs/router'

setup() {
  const router = useRouter()
  const route = useRoute()

  const goToAbout = () => {
    router.push('/about')
  }
}
```

## 生命周期钩子

| Vue 3             | LytJS             |
| ----------------- | ----------------- |
| `onBeforeMount`   | `onBeforeMount`   |
| `onMounted`       | `onMounted`       |
| `onBeforeUpdate`  | `onBeforeUpdate`  |
| `onUpdated`       | `onUpdated`       |
| `onBeforeUnmount` | `onBeforeUnmount` |
| `onUnmounted`     | `onUnmounted`     |

**示例：**

```typescript
import { onMounted, onUnmounted } from '@lytjs/core'

setup() {
  onMounted(() => {
    console.log('组件已挂载')
  })

  onUnmounted(() => {
    console.log('组件已卸载')
  })
}
```

## UI 组件库

### 使用 LytJS UI 组件

```typescript
import { Button, Input, Card, Dialog } from '@lytjs/ui'

// 在模板中使用
<template>
  <Card>
    <Input v-model="value" placeholder="输入内容" />
    <Button type="primary" @click="submit">提交</Button>
  </Card>
</template>
```

## 常见问题 FAQ

### Q: LytJS 和 Vue 的主要区别是什么？

A: 主要区别在：

1. **signal vs ref** - LytJS 使用 signal 函数调用语法
2. **双渲染模式** - LytJS 同时支持 Vapor 和 VDOM 模式
3. **零依赖** - LytJS 运行时没有任何第三方依赖

### Q: 可以渐进式迁移吗？

A: 完全可以！你可以：

- 先在新项目中使用 LytJS
- 逐步重构现有模块
- 使用 LytJS 的 Vue 兼容插件

### Q: Vue 项目迁移难度如何？

A: 由于语法非常相似，迁移难度较低。主要需要：

- 将 `ref` 替换为 `signal`
- 调整响应式值的访问方式（`.value` → `()`）
- 其他语法基本保持一致

## 迁移检查清单

- [ ] 更新项目依赖
- [ ] 替换导入语句（`vue` → `@lytjs/*`）
- [ ] 将 `ref` 替换为 `signal`
- [ ] 更新响应式值访问方式
- [ ] 更新状态管理（Pinia → LytJS Store）
- [ ] 更新路由（Vue Router → LytJS Router）
- [ ] 更新 UI 组件库（可选）
- [ ] 运行测试确保一切正常
- [ ] 性能基准测试对比

## 性能提升

迁移到 LytJS 后，特别使用 Vapor 模式，你可以期待：

- 📦 **更小的包体积** - 约减少 40-60%
- ⚡ **更快的渲染速度** - 特别在高频更新场景
- 🎯 **更少的内存占用** - Signal 系统更高效

## 获取帮助

- 📖 [LytJS 文档](../index.md)
- 💬 [社区支持](https://github.com/lytjs/lytjs)
- 🐛 [提交 issue](https://github.com/lytjs/lytjs/issues)

---

**下一步：** 查看 [React 迁移指南](./migration-from-react.md) 或 [快速开始](./quick-start.md)
