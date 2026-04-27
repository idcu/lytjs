<p align="center">
  <img src="https://img.shields.io/npm/v/@lytjs/core?style=flat-square&color=42b883" alt="npm version">
  <img src="https://img.shields.io/npm/l/@lytjs/core?style=flat-square" alt="license">
  <img src="https://img.shields.io/node/v/@lytjs/cli?style=flat-square&color=339933" alt="node version">
  <img src="https://img.shields.io/badge/size-34.56KB%20gzip-42b883?style=flat-square" alt="bundle size">
  <img src="https://img.shields.io/badge/tests-2833%2B-blue?style=flat-square" alt="tests">
  <img src="https://img.shields.io/badge/packages-24-orange?style=flat-square" alt="packages">
  <img src="https://img.shields.io/badge/benchmark-66M%20ops%2Fsec-42b883?style=flat-square" alt="benchmark">
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
  <a href="https://gitee.com/lytjs/lytjs/issues">Issues</a> ·
  <a href="./CONTRIBUTING.md">贡献指南</a>
</p>

---

## 特性

- **纯原生** — 零运行时第三方依赖，所有能力用原生 JS 实现
- **极致轻量** — 核心 8 包 ESM gzip 总计仅 **34.56KB**（reactivity 仅 2.86KB）
- **所见即代码** — 增强版 HTML 模板，去掉 v- 前缀（`if` / `each` / `model` / `on:click`）
- **双 API 模式** — 同时支持 Options API 和 Composition API，与 Vue 3 一致
- **渐进扩展** — 架构为 SSR / 移动端 / 小程序预留 Renderer 接口
- **开箱即用** — 内置路由、状态管理、CLI 工具、浏览器 DevTools、38+ 组件

## 功能完成度

| 功能模块 | 状态 | 描述 |
|---------|------|------|
| 响应式系统 (Reactivity) | ✅ **完成** | Proxy + Signal 双模式，完整的 ref/reactive/computed/watch API |
| 模板编译器 (Compiler) | ✅ **完成** | HTML 解析 → AST 转换 → 优化 → 代码生成，支持静态提升 |
| 虚拟 DOM (Vdom) | ✅ **完成** | Block Tree + Patch Flag 优化，LIS 最长递增子序列算法 |
| 渲染器 (Renderer) | ✅ **完成** | DOM/SSR/Vapor 三种渲染模式，支持服务端渲染和注水 |
| 组件系统 (Component) | ✅ **完成** | defineComponent/生命周期/插槽/KeepAlive/Suspense/Teleport |
| 路由 (Router) | ✅ **完成** | History/Hash 双模式，导航守卫，动态路由，嵌套路由 |
| 状态管理 (Store) | ✅ **完成** | Pinia 风格 API，支持模块化、actions、getters |
| UI 组件库 (Components) | ✅ **完成** | 38+ 组件：表单/数据展示/导航/反馈/布局/扩展 |
| CLI 工具 | ✅ **完成** | create/dev/build 命令，支持项目脚手架 |
| DevTools | ✅ **完成** | 性能采集/组件树/状态查看/渲染追踪/时间旅行调试 |
| Web Component | ✅ **完成** | defineCustomElement，Shadow DOM 支持 |
| 插件系统 | ✅ **完成** | app.use/unuse，插件生命周期钩子 |
| Vapor 模式 | ✅ **完成** | 无虚拟 DOM 编译优化，接近原生 JS 性能 |
| SSR/SSG | ✅ **完成** | 服务端渲染、静态站点生成、Islands 架构 |
| 元框架 (LytX) | ✅ **完成** | 支持 SSR/SSG/SPA 全栈渲染 |
| 小程序渲染器 | ⏳ **规划中** | 微信/支付宝/字节小程序适配 |
| 移动端渲染器 | ⏳ **规划中** | 原生移动端适配 |

## 社区

欢迎加入 Lyt.js 社区！

- 💬 **讨论问题**：使用 [Gitee Issues](https://gitee.com/lytjs/lytjs/issues)
- 📝 **贡献代码**：查看 [贡献指南](./CONTRIBUTING.md)
- ⚖️ **行为准则**：遵守 [社区准则](./CODE_OF_CONDUCT.md)
- 🌟 **Star 支持**：如果你觉得项目有用，欢迎 Star

## 测试覆盖

- ✅ **2833+** 个测试用例
- ✅ 核心模块测试覆盖率 >95%
- ✅ 包含边界条件和错误处理测试
- ✅ CI/CD 自动测试集成

## 性能基准测试

Lyt.js 提供完整的性能基准测试，包括：

- **响应式系统基准测试**: reactive/ref/signal 的创建和更新性能
- **VDOM 基准测试**: VNode 创建和 diff 性能
- **Vapor Mode 基准测试**: 无虚拟 DOM 模式性能
- **js-framework-benchmark 集成**: 与主流框架的性能对比

### 运行基准测试

```bash
# 一键运行所有基准测试
npm run benchmark:all

# 响应式系统基准测试
npm run benchmark

# VDOM 性能基准测试
npm run benchmark:vdom

# Vapor Mode 性能基准测试
npm run benchmark:vapor

# js-framework-benchmark
cd benchmarks/js-framework-benchmark
npm run build
```

### 基准测试结果（2026-04-27）

#### 响应式系统
| 测试项 | 性能 |
|--------|------|
| `reactive()` 创建 | 6,626,716 ops/sec |
| `ref()` 创建 | 3,933,293 ops/sec |
| `signal()` 创建 | 821,707 ops/sec |
| `reactive` 读取 | 13,764,966 ops/sec |
| `reactive` 写入 | 2,391,557 ops/sec |
| `computed()` 创建 | 1,250,033 ops/sec |
| `computed` 求值 | 662,024 ops/sec |
| `watch` 触发 | 378,965 ops/sec |
| 大型 reactive 对象 (100 属性) | 57,784 ops/sec |
| 深层 reactive (5 层) | 1,457,040 ops/sec |

#### VDOM 性能
| 测试项 | 平均耗时 |
|--------|---------|
| VNode 创建 (1000 个节点) | 0.0830 ms |
| VNode 创建 (10000 个节点) | 0.9695 ms |
| h() 函数调用 (1000 次) | 0.0986 ms |
| Diff 全量对比 (1000 节点, 无变化) | 0.1473 ms |
| Diff 全量对比 (1000 节点, 全部变化) | 0.1254 ms |
| 列表 Diff (1000 项, 头部插入 1 项) | 0.0497 ms |
| 列表 Diff (1000 项, 尾部插入 1 项) | 0.0455 ms |
| 列表 Diff (1000 项, 中间删除 1 项) | 0.0667 ms |
| 列表 Diff (1000 项, 反转顺序) | 0.0919 ms |
| 列表 Diff (1000 项, 乱序洗牌) | 0.1768 ms |
| PatchFlag TEXT 精确更新 | 0.0005 ms |
| PatchFlag CLASS 精确更新 | 0.0007 ms |

#### Vapor Mode
| 测试项 | 性能 |
|--------|------|
| 简单 DOM 元素创建 | 25,996,700 ops/sec |
| Signal 更新操作 | 14,620,824 ops/sec |
| 创建 100 项简单列表 | 640,609 ops/sec |
| 更新 100 项列表 | 232,852 ops/sec |
| Vapor 模式 - 直接属性更新 | 52,747,693 ops/sec |
| VDOM 模式 - 虚拟节点 + patch | 43,316,221 ops/sec |
| 创建 1000 项复杂列表 | 32,257 ops/sec |

#### 其他
| 项目 | 结果 |
|------|------|
| js-framework-benchmark IIFE bundle | 8.9 KB |

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

Lyt.js 包含 24 个精心设计的包：

### 核心引擎包 (8)

| 包名 | 说明 | ESM gzip |
|------|------|----------|
| `@lytjs/reactivity` | 响应式系统（reactive/ref/computed/watch/Signal） | 2.86KB |
| `@lytjs/compiler` | 模板编译器（HTML 解析/AST/代码生成/静态提升） | 4.97KB |
| `@lytjs/vdom` | 虚拟 DOM（VNode/Diff/Block Tree/Patch Flag/LIS） | 3.57KB |
| `@lytjs/renderer` | 渲染器主入口（DOM/SSR/Vapor/MiniApp/Native） | 5.00KB |
| `@lytjs/component` | 组件系统（defineComponent/生命周期/插槽/KeepAlive/Suspense/Teleport） | 3.55KB |
| `@lytjs/core` | 核心入口（createApp/h/插件系统/Web Component） | 2.13KB |
| `@lytjs/common` | 公共工具库（类型检查/对象操作/事件发射器/订阅管理/缓存/调度器） | - |
| `@lytjs/lytjs` | 聚合包（一键安装全部核心运行时） | - |

### 功能包 (8)

| 包名 | 说明 |
|------|------|
| `@lytjs/router` | 内置路由（History/Hash/导航守卫/动态路由/嵌套路由） |
| `@lytjs/store` | 内置状态管理（Pinia 风格 API/模块化/actions/getters/插件） |
| `@lytjs/components` | UI 组件库（38+ 组件/主题系统/亮色/暗色/自定义） |
| `@lytjs/cli` | 命令行工具（create/dev/build/scaffold） |
| `@lytjs/devtools` | 浏览器开发者工具（组件树/状态查看/性能分析/时间旅行） |
| `@lytjs/lytx` | 元框架（SSR/SSG/SPA/API Routes/全栈渲染） |
| `@lytjs/test-utils` | 测试工具库 |
| `lytjs-vscode` | VSCode 扩展（语法高亮/代码补全/类型检查） |

### 插件包 (6)

| 包名 | 说明 |
|------|------|
| `@lytjs/plugin-i18n` | 国际化插件 |
| `@lytjs/plugin-auth` | 认证插件 |
| `@lytjs/plugin-logger` | 日志插件 |
| `@lytjs/plugin-storage` | 存储插件 |
| `@lytjs/plugin-theme` | 主题插件 |
| `@lytjs/plugins` | 插件聚合包（统一导出所有官方插件） |

### 组件库 (38+ 组件)

**基础组件 (5):** Button, Icon, Link, Container, Divider

**表单组件 (10):** Input, Checkbox, Radio, Select, Switch, Form, DatePicker, TimePicker, Calendar, Dropdown

**反馈组件 (6):** Modal, Toast, Alert, Tooltip, Dialog, Notification, Popover

**导航组件 (6):** Tabs, Breadcrumb, Pagination, TabNav, Pager, Carousel

**数据展示组件 (8):** Table, Tag, Badge, Spin, Empty, Avatar, CountBadge, DataTable

**扩展组件 (7):** Collapse, Toggle, Progress, Slider, Upload, Tree, ThemeProvider

## 架构

```
应用层 (App Layer)
├── @lytjs/core - createApp, 插件系统, 全局 API
├── @lytjs/router - 内置路由
├── @lytjs/store - 状态管理
├── @lytjs/components - UI 组件库
├── @lytjs/lytx - 元框架
└── @lytjs/plugins - 官方插件

核心引擎层 (Engine Layer)
├── @lytjs/reactivity - Proxy 响应式系统 + Signal
├── @lytjs/compiler - 模板编译 (parse → transform → optimize → generate)
├── @lytjs/vdom - 虚拟 DOM (Block Tree + Patch Flag + LIS diff)
├── @lytjs/component - 组件系统 (defineComponent, Composition API)
└── @lytjs/common - 公共工具库

平台适配层 (Platform Adapter)
├── DOM Renderer (浏览器)
├── SSR Renderer (服务端)
├── Vapor Renderer (无虚拟 DOM 编译)
├── Native Renderer (原生移动端 - 规划中)
└── MiniApp Renderer (小程序 - 规划中)
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码修复
pnpm lint:fix
```

## 从 Vue 3 迁移

Lyt.js 的 API 高度兼容 Vue 3，迁移成本低：

- `defineComponent` / `ref` / `reactive` / `computed` / `watch` — 完全兼容
- 模板语法仅需去掉 `v-` 前缀（`v-if` → `if`，`v-for` → `each`）
- `createRouter` / `createStore` — API 一致，配置格式兼容
- 详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的迁移指南

## 路线图

- [x] 核心 23 个包，完整的 monorepo 架构
- [x] 核心 8 包 ESM gzip < 35KB
- [x] Composition API + Options API 双模式
- [x] SSR / SSG / Islands Architecture
- [x] Vapor Mode（无 VDOM 编译优化）
- [x] Signal 响应式模式
- [x] 38+ UI 组件 + 主题系统
- [x] 内置路由 + 状态管理
- [x] CLI 工具 + DevTools
- [x] 官方插件（i18n/auth/logger/storage/theme）
- [ ] 小程序 Renderer（微信/支付宝/字节）
- [ ] 原生移动端 Renderer
- [ ] 核心运行时 < 15KB gzip
- [ ] 插件市场

## 贡献

欢迎贡献！请阅读 [贡献指南](./CONTRIBUTING.md) 了解详情。

## 许可证

[MIT](./LICENSE) © idcu
