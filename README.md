<p align="center">
  <img src="https://img.shields.io/npm/v/@lytjs/core?style=flat-square&color=42b883" alt="npm version" />
  <img src="https://img.shields.io/npm/l/@lytjs/core?style=flat-square" alt="license" />
  <img src="https://img.shields.io/node/v/@lytjs/cli?style=flat-square&color=339933" alt="node version" />
  <img src="https://img.shields.io/badge/size-34.56KB%20gzip-42b883?style=flat-square" alt="bundle size" />
  <img src="https://img.shields.io/badge/tests-1353%2B-blue?style=flat-square" alt="tests" />
  <img src="https://img.shields.io/badge/packages-18-orange?style=flat-square" alt="packages" />
</p>

<h1 align="center">Lyt.js</h1>

<p align="center">
  <strong>轻写轻跑，所见即代码</strong>
</p>

<p align="center">
  纯原生 · 零运行时依赖 · 超轻量 · Vue 3 兼容 API
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#特性">特性</a> ·
  <a href="#模板语法">模板语法</a> ·
  <a href="#包结构">包结构</a> ·
  <a href="https://gitee.com/lytjs/lytjs">Gitee</a>
</p>

---

## 特性

- **纯原生** — 零运行时第三方依赖，所有能力用原生 JS 实现
- **极致轻量** — 核心 8 包 ESM gzip 总计仅 **34.56KB**（reactivity 仅 2.86KB）
- **所见即代码** — 增强版 HTML 模板，去掉 v- 前缀（`if` / `each` / `model` / `on:click`）
- **双 API 模式** — 同时支持 Options API 和 Composition API，与 Vue 3 一致
- **渐进扩展** — 架构为 SSR / 移动端 / 小程序预留 Renderer 接口
- **开箱即用** — 内置路由、状态管理、CLI 工具、浏览器 DevTools、28+ 组件

## 快速开始

### 在线体验

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/lytjs/lytjs/tree/main/examples/stackblitz-starter)

### 使用 CLI 创建项目

```bash
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

### CDN 直接使用

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

### 组合式 API

```javascript
import { defineComponent, ref, computed, watch } from '@lytjs/component'

const Counter = defineComponent({
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)

    watch(count, (val) => console.log('变化:', val))

    return { count, double }
  },
  template: `
    <div>
      <p>{{ count }} x 2 = {{ double }}</p>
      <button @click="count++">+1</button>
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

## 模板语法

Lyt.js 使用增强版 HTML 模板，去掉了 Vue 的 `v-` 前缀，更接近原生 HTML：

| 功能 | Vue 3 | Lyt.js |
|------|-------|--------|
| 插值 | `{{ msg }}` | `{{ msg }}` |
| 属性绑定 | `:class="cls"` | `:class="cls"` |
| 事件绑定 | `@click="fn"` | `@click="fn"` |
| 条件渲染 | `v-if="show"` | `if="show"` |
| 列表渲染 | `v-for="item in list"` | `each="item in list"` |
| 双向绑定 | `v-model="val"` | `model="val"` |
| 插槽 | `<slot name="x">` | `<template slot="x">` |

## 包结构

| 包名 | 说明 | ESM gzip |
|------|------|----------|
| `@lytjs/reactivity` | 响应式系统（reactive/ref/computed/watch） | 2.86 KB |
| `@lytjs/compiler` | 模板编译器（HTML 解析/AST/代码生成） | 4.97 KB |
| `@lytjs/vdom` | 虚拟 DOM（VNode/Diff/Block Tree/PatchFlag） | 3.57 KB |
| `@lytjs/renderer` | 渲染器主入口（DOM） | 5.00 KB |
| `@lytjs/renderer/ssr` | SSR 渲染器 | - |
| `@lytjs/renderer/native` | 原生渲染器 | - |
| `@lytjs/renderer/miniapp` | 小程序渲染器 | - |
| `@lytjs/renderer/vapor` | Vapor 模式渲染器 | - |
| `@lytjs/component` | 组件系统（defineComponent/生命周期/插槽） | 3.55 KB |
| `@lytjs/component/builtins` | 内置组件（Transition/KeepAlive/Suspense） | - |
| `@lytjs/core` | 核心入口（createApp/h） | 2.13 KB |
| `@lytjs/core/plugin` | 插件系统 | - |
| `@lytjs/core/error` | 错误处理 | - |
| `@lytjs/core/web-component` | Web Component 支持 | - |
| `@lytjs/router` | 内置路由（History/Hash/守卫/动态路由） | 2.62 KB |
| `@lytjs/store` | 内置状态管理（Pinia 风格） | 1.27 KB |
| `@lytjs/cli` | 命令行工具（create/dev/build） | 开发工具 |
| `@lytjs/devtools` | 浏览器调试面板 | 开发工具 |
| `@lytjs/components` | UI 组件库（28+ 组件/主题系统） | - |
| `@lytjs/lytx` | 元框架（SSR/SSG/SPA/API Routes） | - |
| `@lytjs/lytjs` | 聚合包（一键安装全部运行时） | 28.67 KB |

## 架构

```
应用层 (App Layer)
    |-- createApp, 插件系统, 全局 API
    |
核心引擎层 (Engine Layer)
    |-- @lytjs/reactivity  (Proxy 响应式系统)
    |-- @lytjs/compiler    (模板编译: parse -> transform -> optimize -> generate)
    |-- @lytjs/vdom        (虚拟 DOM: Block Tree + PatchFlag + LIS diff)
    |-- @lytjs/component   (组件系统: defineComponent, Composition API)
    |
平台适配层 (Platform Adapter)
    |-- DOM Renderer     (浏览器)
    |-- SSR Renderer     (服务端)
    |-- Native Renderer  (原生移动端 - 规划中)
    |-- MiniApp Renderer (小程序 - 规划中)
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test
```

## 从 Vue 3 迁移

Lyt.js 的 API 高度兼容 Vue 3，迁移成本低：

- `defineComponent` / `ref` / `reactive` / `computed` / `watch` — 完全兼容
- 模板语法仅需去掉 `v-` 前缀（`v-if` → `if`，`v-for` → `each`）
- `createRouter` / `createStore` — API 一致，配置格式兼容
- 详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的迁移指南

## 路线图

- [x] 核心 8 包 ESM gzip < 35KB
- [x] Composition API + Options API 双模式
- [x] SSR / SSG / Islands Architecture
- [x] Vapor Mode（无 VDOM 编译优化）
- [x] Signal 响应式模式
- [x] 28+ UI 组件 + 主题系统
- [x] 内置路由 + 状态管理
- [x] CLI 工具 + DevTools
- [ ] 小程序 Renderer（微信/支付宝/字节）
- [ ] 原生移动端 Renderer
- [ ] 核心运行时 < 15KB gzip
- [ ] 插件市场

## 贡献

欢迎贡献！请阅读 [贡献指南](./CONTRIBUTING.md) 了解详情。

## 许可证

[MIT](./LICENSE) © idcu
