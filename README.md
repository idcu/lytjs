# Lyt.js

> 轻写轻跑，所见即代码

Lyt.js 是一个纯原生、零运行时依赖的前端框架。API 极简，运行时极致轻量，模板就是增强版 HTML，无需 JSX。

## 特性

- **纯原生** — 零运行时第三方依赖，所有能力用原生 JS 实现
- **轻写轻跑** — API 极简，核心 8 包 ESM gzip 总计 34.56KB（reactivity 仅 2.86KB）
- **所见即代码** — 增强版 HTML 模板，去掉 v- 前缀（if/each/bind/on）
- **渐进扩展** — 架构为 SSR / 移动端 / 小程序预留 Renderer 接口
- **开箱即用** — 内置路由、状态管理、CLI 工具、浏览器 DevTools

## 快速开始

### 安装

```bash
# 使用 CLI 创建项目
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

### 手动使用

在 HTML 中直接使用：

```html
<div id="app"></div>
<script type="module">
import { createApp } from '@lytjs/core'

const app = createApp({
  template: `
    <div>
      <h1>{{ title }}</h1>
      <p>计数: {{ count }}</p>
      <button @click="count++">+1</button>
      <button @click="count--">-1</button>
    </div>
  `,
  state: {
    title: 'Hello Lyt.js!',
    count: 0
  }
})

app.mount('#app')
</script>
```

### 选项式组件

```javascript
import { defineComponent } from '@lytjs/component'

const Counter = defineComponent({
  props: {
    initial: { type: Number, default: 0 }
  },
  state: {
    count: 0
  },
  init() {
    this.count = this.initial
  },
  methods: {
    add() { this.count++ }
  },
  template: `
    <div class="counter">
      <span>{{ count }}</span>
      <button @click="add">+1</button>
    </div>
  `
})
```

### 响应式 API

```javascript
import { reactive, ref, computed, watch } from '@lytjs/reactivity'

const state = reactive({ count: 0 })
const double = computed(() => state.count * 2)

watch(() => state.count, (val) => console.log('变化:', val))
```

### 内置路由

```javascript
import { createRouter } from '@lytjs/router'

const router = createRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
})

app.use(router)
```

### 内置状态管理

```javascript
import { createStore } from '@lytjs/store'

const counter = createStore('counter', {
  state: { count: 0 },
  getters: {
    double: (s) => s.count * 2
  },
  actions: {
    increment(s) { s.count++ }
  }
})
```

## 包结构

| 包名 | 说明 | 大小目标 |
|------|------|---------|
| `@lytjs/reactivity` | 响应式系统（reactive/ref/computed/watch） | ~2.5 KB |
| `@lytjs/compiler` | 模板编译器（HTML 解析/AST/代码生成） | ~3 KB |
| `@lytjs/vdom` | 虚拟 DOM（VNode/Diff/Block Tree） | ~2.5 KB |
| `@lytjs/renderer` | 渲染器（DOM/SSR 抽象层） | ~1.5 KB |
| `@lytjs/component` | 组件系统（defineComponent/生命周期/插槽） | ~1.5 KB |
| `@lytjs/router` | 内置路由（History/Hash/守卫） | ~1.5 KB |
| `@lytjs/store` | 内置状态管理（createStore） | ~1 KB |
| `@lytjs/core` | 核心入口（createApp/h/插件系统） | 聚合 |
| `@lytjs/cli` | 命令行工具（create/dev/build） | 开发工具 |
| `@lytjs/devtools` | 浏览器调试面板（组件树/状态/事件/时间旅行） | 开发工具 |

## 模板语法

| 功能 | Vue 3 | Lyt.js |
|------|-------|--------|
| 插值 | `{{ msg }}` | `{{ msg }}` |
| 属性绑定 | `:class="cls"` | `:class="cls"` |
| 事件绑定 | `@click="fn"` | `@click="fn"` |
| 条件渲染 | `v-if="show"` | `if="show"` |
| 列表渲染 | `v-for="item in list"` | `each="item in list"` |
| 双向绑定 | `v-model="val"` | `bind="val"` |
| 插槽 | `<slot name="x">` | `<template slot="x">` |

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test

# 性能基准测试
pnpm benchmark
```

## 架构

Lyt.js 采用三层架构：应用层（组件/路由/Store）→ 核心引擎层（响应式/编译器/VDOM）→ 平台适配层（Renderer 抽象）。所有平台差异封装在 Renderer 接口中，初期实现 DOM Renderer，后续通过实现新 Renderer 扩展到 SSR/移动端/小程序。

## License

MIT © idcu
