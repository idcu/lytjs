# 生态系统

LytJS 提供完整的官方包生态系统，覆盖从基础工具到高级功能的各个方面。

## 官方包

### @lytjs/ui

完整的零依赖 UI 组件库，包含 60+ 常用组件，所有组件均支持 Vapor 和 VNode 双模式。

[查看 UI 组件库 →](./ui.md)

### @lytjs/router

强大的路由系统，支持多种历史模式和导航守卫。

[查看 Router →](./router.md)

### @lytjs/store

灵感来自 Pinia 的状态管理方案，提供直观的响应式状态管理 API。

[查看 Store →](./store.md)

### @lytjs/ssr

服务端渲染支持，提供 hydration、SSG、ISR 等功能。

[查看 SSR →](./ssr.md)

### @lytjs/router-fs

文件系统路由引擎，自动扫描目录生成路由。

### @lytjs/api

API 路由引擎，基于文件系统的 API 路由系统。

### @lytjs/bundler

构建工具集成，支持 Vite 和 Webpack 插件。

### @lytjs/hmr

热模块替换支持。

### @lytjs/runtime-edge

边缘运行时支持。

### @lytjs/devtools

开发者工具集成，支持组件树检查、性能监控等调试功能。

[查看 DevTools →](./devtools.md)

## 插件

除了生态系统包，LytJS 还提供多个官方插件：

| 插件              | 描述                  |
| ----------------- | --------------------- |
| plugin-theme      | 主题管理              |
| plugin-logger     | 日志系统              |
| plugin-auth       | 权限控制              |
| plugin-storage    | 本地存储              |
| plugin-i18n       | 国际化                |
| plugin-vite       | Vite 集成             |
| plugin-chart      | 图表渲染              |
| plugin-validation | 表单验证插件          |
| plugin-data       | 增强版数据获取插件    |
| plugin-data-fetch | 基础数据获取插件      |

## 特点

- **零依赖** - 所有官方包均遵循零第三方依赖原则
- **双模式支持** - 组件同时支持 Vapor 和 VNode 渲染模式
- **TypeScript 优先** - 完整的类型定义和类型提示
- **按需引入** - 支持 Tree Shaking，只打包使用到的代码
