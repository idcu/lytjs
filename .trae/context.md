# Lyt.js 项目上下文

## 项目概述

Lyt.js 是一个纯原生、零运行时依赖、超轻量的前端框架，提供与 Vue 3 兼容的 API。

## 技术栈

- **语言**: TypeScript
- **模块系统**: ESM (ECMAScript Modules)
- **无第三方运行时依赖**: 全部功能原生实现

## 包结构

### 核心包

```
packages/
├── reactivity/     # 响应式系统
├── compiler/       # 模板编译器
├── vdom/          # 虚拟 DOM
├── renderer/      # 渲染器
├── component/     # 组件系统
├── core/         # 核心入口
├── common/       # 公共工具
└── lytjs/        # 聚合包
```

### 功能包

```
packages/
├── router/       # 内置路由
├── store/        # 状态管理
├── components/   # UI 组件库
├── cli/          # 命令行工具
├── devtools/     # 浏览器开发者工具
├── lytx/         # 元框架 (SSR/SSG)
├── ai/           # AI 辅助开发工具
└── ...
```

## 模板语法（关键）

与 Vue 3 相比，Lyt.js 去掉了所有 `v-` 前缀：

```html
<!-- Vue 3 语法 -->
<div v-if="condition">...</div>
<ul v-for="item in items">...</ul>
<input v-model="value">

<!-- Lyt.js 语法 -->
<div if="condition">...</div>
<ul each="item in items">...</ul>
<input model="value">
```

## 主要 API

### 创建应用

```javascript
import { createApp } from '@lytjs/core';

const app = createApp({
  template: '<div>{{ message }}</div>',
  state: { message: 'Hello' }
});

app.mount('#app');
```

### 响应式系统

```javascript
import { ref, reactive, computed, watch } from '@lytjs/reactivity';

const count = ref(0);
const state = reactive({ name: 'Lyt' });
const double = computed(() => count.value * 2);
watch(count, (val) => console.log(val));
```

### 组件定义

```javascript
import { defineComponent } from '@lytjs/component';

const MyComponent = defineComponent({
  props: { title: String },
  emits: ['click'],
  setup(props, { emit }) {
    return {};
  },
  template: '<div>{{ title }}</div>'
});
```

### 路由

```javascript
import { createRouter } from '@lytjs/router';

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});

app.use(router);
```

### 状态管理

```javascript
import { createStore } from '@lytjs/store';

const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: state => state.count * 2
  },
  actions: {
    increment(state) {
      state.count++;
    }
  }
});
```

## AI 集成

### 配置文件

`.lytrc.json`:
```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

### CLI 使用

```bash
# 初始化配置
lyt-ai init

# 生成组件
lytx generate component MyComponent --ai

# 生成 Store
lytx generate store counter --ai
```

## 项目开发

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

## 约定

- 组件文件扩展名: `.lyt`
- 使用 Composition API 优先
- 模板使用无前缀语法
- 响应式数据使用 `ref` 和 `reactive`
