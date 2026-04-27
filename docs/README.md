# Lyt.js 文档中心

欢迎来到 Lyt.js 文档中心！这里包含了完整的文档体系，从入门到精通，从用户到开发者。

---

## 📚 文档分类

### 🎯 用户指南 (`guide/`)

面向框架使用者的文档：

- [快速开始](./guide/quick-start.md) - 从零开始学习 Lyt.js
- [模板语法](./guide/template-syntax.md) - Lyt.js 模板语法详解
- [响应式系统](./guide/reactivity.md) - 响应式数据、计算属性、监听器
- [组件系统](./guide/component.md) - 定义和使用组件
- [选项式 API](./guide/options-api.md) - Options API 使用指南
- [组合式 API](./guide/composition-api.md) - Composition API 使用指南
- [单文件组件](./guide/sfc.md) - `.lyt` 单文件组件
- [路由](./guide/router.md) - 路由系统使用指南
- [状态管理](./guide/store.md) - Pinia 风格状态管理
- [服务端渲染](./guide/ssr.md) - SSR/SSG 使用指南
- [Vapor 模式](./guide/vapor-mode.md) - 无虚拟 DOM 编译模式
- [组件库](./guide/components.md) - 组件库使用指南
- [性能优化](./guide/performance.md) - 性能优化指南
- [部署](./guide/deployment.md) - 应用部署指南
- [常见问题](./guide/faq.md) - 常见问题解答
- [对比其他框架](./guide/comparison.md) - Lyt.js vs Vue 3 vs React
- [从 Vue 3 迁移](./guide/migration-from-vue3.md) - Vue 3 项目迁移指南
- [进阶主题](./guide/advanced-topics.md) - 高级用法和技巧

---

### 🔧 开发者文档 (`developer/`)

面向框架贡献者的文档：

- [架构总览](./developer/01-architecture-overview.md) - 了解整体架构设计
- [快速入门](./developer/02-getting-started.md) - 从零开始了解 Lyt.js
- [代码规范](./developer/03-coding-standards.md) - 了解代码风格和规范
- [代码层面完全掌控](./developer/CODE_MASTERY_GUIDE.md) - 深度理解和完全掌控 Lyt.js

**核心模块深度解析**：
- [响应式系统](./developer/core/01-reactivity.md) - 响应式系统深度解析
- [编译器](./developer/core/02-compiler.md) - 模板编译器工作原理
- [渲染器](./developer/core/03-renderer.md) - 渲染器与虚拟 DOM
- [组件系统](./developer/core/04-component.md) - 组件系统详解
- [核心入口](./developer/core/05-core.md) - 核心入口与应用创建

**功能模块详解**：
- [路由系统](./developer/feature/01-router.md) - 路由系统
- [状态管理](./developer/feature/02-store.md) - 状态管理

**高级主题**：
- [模块组装](./developer/advanced/01-module-assembly.md) - 如何把模块组装在一起

---

### 📖 API 参考 (`api/`)

详细的 API 文档：

- [Core API](./api/core.md) - 核心 API（createApp、h 等）
- [Reactivity API](./api/reactivity.md) - 响应式 API（ref、reactive、computed、watch）
- [Compiler API](./api/compiler.md) - 编译器 API
- [Renderer API](./api/renderer.md) - 渲染器 API
- [Component API](./api/component.md) - 组件系统 API
- [Router API](./api/router.md) - 路由系统 API
- [Store API](./api/store.md) - 状态管理 API
- [CLI API](./api/cli.md) - 命令行工具 API
- [DevTools API](./api/devtools.md) - 开发者工具 API
- [Web Component API](./api/web-component.md) - Web Component 适配器
- [Plugin API](./api/plugin.md) - 插件系统 API

---

### 💡 示例代码 (`examples/`)

完整的示例代码：

- [计数器](./examples/counter.md) - 基础计数器示例
- [主题切换](./examples/theme-switch.md) - 主题切换示例
- [待办事项](./examples/todo-app.md) - 完整的待办事项应用
- [组件展示](./examples/components-showcase.md) - UI 组件库展示

---

### 📋 项目文档 (`project/`)

项目相关文档：

- [项目总结](./project/PROJECT_SUMMARY.md) - 项目整体总结报告
- [夯实计划](./project/WEB_FOUNDTATION_PLAN.md) - 项目开发计划和进度
- [组件清单](./project/COMPONENTS_CHECKLIST.md) - UI 组件库清单
- [进度更新](./project/PROGRESS_UPDATE.md) - 详细进度更新
- [使用指南](./project/USAGE.md) - 项目使用指南
- [打包指南](./project/PACK.md) - 项目打包指南

---

### 🗺️ 其他文档

- [发展规划](./roadmap.md) - 项目发展路线图
- [部署指南](./DEPLOY.md) - GitHub Pages 部署指南
- [文档索引](./DOCUMENTATION_INDEX.md) - 完整的文档索引
- [首页](./index.md) - 文档网站首页

---

## 🚀 快速导航

### 我是框架使用者

👉 开始阅读：[快速开始](./guide/quick-start.md)

### 我是框架开发者/贡献者

👉 开始阅读：[架构总览](./developer/01-architecture-overview.md)

### 我需要 API 参考

👉 查看：[API 文档](./api/core.md)

### 我想了解项目发展计划

👉 查看：[发展规划](./roadmap.md)

---

## 📚 文档体系结构

```
docs/
├── README.md                 # 本文档，总索引
├── DOCUMENTATION_INDEX.md   # 完整文档索引
├── index.md                 # 文档网站首页
├── roadmap.md               # 发展规划
├── DEPLOY.md                # 部署指南
├── guide/                   # 用户指南
│   ├── quick-start.md
│   ├── template-syntax.md
│   ├── reactivity.md
│   ├── component.md
│   ├── options-api.md
│   ├── composition-api.md
│   ├── sfc.md
│   ├── router.md
│   ├── store.md
│   ├── ssr.md
│   ├── vapor-mode.md
│   ├── components.md
│   ├── performance.md
│   ├── deployment.md
│   ├── faq.md
│   ├── comparison.md
│   ├── migration-from-vue3.md
│   └── advanced-topics.md
├── api/                     # API 参考文档
│   ├── core.md
│   ├── reactivity.md
│   ├── compiler.md
│   ├── renderer.md
│   ├── component.md
│   ├── router.md
│   ├── store.md
│   ├── cli.md
│   ├── devtools.md
│   ├── web-component.md
│   └── plugin.md
├── developer/               # 开发者文档
│   ├── README.md
│   ├── 01-architecture-overview.md
│   ├── 02-getting-started.md
│   ├── 03-coding-standards.md
│   ├── CODE_MASTERY_GUIDE.md
│   ├── core/
│   │   ├── 01-reactivity.md
│   │   ├── 02-compiler.md
│   │   ├── 03-renderer.md
│   │   ├── 04-component.md
│   │   └── 05-core.md
│   ├── feature/
│   │   ├── 01-router.md
│   │   └── 02-store.md
│   └── advanced/
│       └── 01-module-assembly.md
├── examples/                # 示例文档
│   ├── counter.md
│   ├── theme-switch.md
│   ├── todo-app.md
│   └── components-showcase.md
└── project/                 # 项目文档
    ├── PROJECT_SUMMARY.md
    ├── WEB_FOUNDTATION_PLAN.md
    ├── PROGRESS_UPDATE.md
    ├── COMPONENTS_CHECKLIST.md
    ├── USAGE.md
    └── PACK.md
```

---

## 🎯 项目信息

Lyt.js 是一个纯原生、零依赖、超轻量的前端框架，与 Vue 3 兼容的 API。

### 当前版本
- **版本**：4.1.0
- **更新日期**：2026-04-27
- **测试覆盖**：2833+ 个测试，核心模块覆盖率 >95%
- **文档验证**：所有 68 个文档文件编码正常，无乱码问题

### 包列表

Lyt.js 包含 24 个精心设计的包：

**核心引擎包 (8)**：
- @lytjs/reactivity - 响应式系统（reactive/ref/computed/watch/Signal）
- @lytjs/compiler - 模板编译器（HTML 解析/AST/代码生成/静态提升）
- @lytjs/vdom - 虚拟 DOM（VNode/Diff/Block Tree/Patch Flag/LIS）
- @lytjs/renderer - 渲染器主入口（DOM/SSR/Vapor/MiniApp/Native）
- @lytjs/component - 组件系统（defineComponent/生命周期/插槽/KeepAlive/Suspense/Teleport）
- @lytjs/core - 核心入口（createApp/h/插件系统/Web Component）
- @lytjs/common - 公共工具库（类型检查/对象操作/事件发射器/订阅管理/缓存/调度器）
- @lytjs/lytjs - 聚合包（一键安装全部核心运行时）

**功能包 (8)**：
- @lytjs/router - 内置路由系统（History/Hash/导航守卫/动态路由/嵌套路由）
- @lytjs/store - 内置状态管理（Pinia 风格 API/模块化/actions/getters/插件）
- @lytjs/components - UI 组件库（38+ 组件/主题系统/亮色/暗色/自定义）
- @lytjs/cli - 命令行工具（create/dev/build/scaffold）
- @lytjs/devtools - 浏览器开发者工具（组件树/状态查看/性能分析/时间旅行）
- @lytjs/lytx - 元框架（SSR/SSG/SPA/API Routes/全栈渲染）
- @lytjs/test-utils - 测试工具库
- lytjs-vscode - VSCode 扩展（语法高亮/代码补全/类型检查）

**插件包 (6)**：
- @lytjs/plugin-i18n - 国际化插件
- @lytjs/plugin-auth - 认证插件
- @lytjs/plugin-logger - 日志插件
- @lytjs/plugin-storage - 存储插件
- @lytjs/plugin-theme - 主题插件
- @lytjs/plugins - 插件聚合包（统一导出所有官方插件）

### 组件列表

Lyt.js 提供 38+ 个精心设计的组件：

**基础组件 (5)**：Button, Icon, Link, Container, Divider

**表单组件 (10)**：Input, Checkbox, Radio, Select, Switch, Form, DatePicker, TimePicker, Calendar, Dropdown

**反馈组件 (7)**：Modal, Toast, Alert, Tooltip, Dialog, Notification, Popover

**导航组件 (6)**：Tabs, Breadcrumb, Pagination, TabNav, Pager, Carousel

**数据展示组件 (8)**：Table, Tag, Badge, Spin, Empty, Avatar, CountBadge, DataTable

**扩展组件 (7)**：Collapse, Toggle, Progress, Slider, Upload, Tree, ThemeProvider

### 快速开始

```bash
# 使用 CLI 创建项目
npx @lytjs/cli create my-app
cd my-app
npm install
npm run dev
```

---

## 📚 贡献指南

欢迎贡献文档！请参考：

- [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献指南
- [开发者文档](./developer/) - 了解框架架构
- [发展规划](./roadmap.md) - 了解下一步计划

---

## 💡 需要帮助？

- 遇到问题？查看 Issue
- 有建议？创建 Feature Request
- 想讨论？参与社区讨论

---

## 📄 许可证

MIT License © Lyt.js Team

---

**文档版本**: 2.1
**最后更新**: 2026-04-27
