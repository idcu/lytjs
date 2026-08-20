# LytJS 文档导航

> 按目标群体查找需要的文档

---

## 🏠 新手入门

- [新手入门](./getting-started/index.md)
- [AI 助手开发指南](./contribute/ai/assistant-guide.md) - 🌟 专门为 AI 助手准备
- [快速参考](./getting-started/quick-reference.md)
- [快速开始](./getting-started/quick-start.md)
- [安装指南](./getting-started/installation.md)
- [实战教程](./getting-started/tutorials/index.md)
  - [Todo 应用](./getting-started/tutorials/todo-app.md)
  - [用户管理系统](./getting-started/tutorials/user-management.md)
  - [购物车](./getting-started/tutorials/shopping-cart.md)
  - [表单验证](./getting-started/tutorials/form-validation.md)
  - [博客系统](./getting-started/tutorials/blog-system.md)

## 📚 核心指南

- [核心指南](./guide/index.md)
- [架构概览](./guide/architecture.md)
- [快速开始](./guide/getting-started.md)
- [组合式 API](./guide/composition-api.md)
- [生命周期](./guide/lifecycle.md)
- [项目配置](./guide/project-config.md)
- [渲染函数](./guide/render-function.md)
- [响应式系统](./guide/reactivity.md)
- [组件系统](./guide/component.md)
- [模板语法](./guide/template-syntax.md)
- [事件处理](./guide/events.md)
- [内置组件](./guide/built-in-components.md)
- [自定义指令](./guide/custom-directives.md)
- [渲染模式](./guide/rendering-modes.md)
- [服务端渲染](./guide/ssr.md)
- [错误边界](./guide/error-boundary.md)
- [TypeScript](./guide/typescript.md)
- [构建优化](./guide/build-optimization.md)
- [本地使用](./guide/local-usage.md)
- [插件开发](./guide/plugins.md)

## 📦 包文档

- [包文档](./packages/index.md)
- [Core](./packages/core/index.md)
  - [Core VNode](./packages/core/core-vnode.md)
  - [Core Signal](./packages/core/core-signal.md)
- [Common](./packages/common/index.md)
  - [Common 概览](./packages/common/overview.md)
- [Reactivity](./packages/reactivity/index.md)
- [Component](./packages/component/index.md)
- [Vdom](./packages/vdom/index.md)
  - [Renderer](./packages/vdom/renderer.md)
  - [Compiler](./packages/vdom/compiler.md)
- [其他包](./packages/other/index.md)
  - [Adapter Web](./packages/other/adapter-web.md)
  - [Dom](./packages/other/dom.md)
  - [Dom Runtime](./packages/other/dom-runtime.md)
  - [Host Contract](./packages/other/host-contract.md)
  - [Shared Types](./packages/other/shared-types.md)
  - [Web](./packages/other/web.md)

## 🔌 插件生态

- [插件生态](./plugins/index.md)
- [官方插件](./plugins/official/index.md)
  - [Data 插件](./plugins/official/data.md)
- [插件开发](./plugins/development/index.md)

## 🌐 生态系统

- [生态系统](./ecosystem/index.md)
- [Router](./ecosystem/router/index.md)
- [Store](./ecosystem/store/index.md)
- [UI 组件](./ecosystem/ui/index.md)
  - [Components](./ecosystem/ui/components.md)
  - [Vapor 指南](./ecosystem/ui/vapor-guide.md)
- [SSR](./ecosystem/ssr/index.md)
- [DevTools](./ecosystem/devtools/index.md)
- [CLI](./ecosystem/cli/index.md)
- [其他包](./ecosystem/other/index.md)
  - [API](./ecosystem/other/api.md)
  - [Bundler](./ecosystem/other/bundler.md)
  - [Compat](./ecosystem/other/compat.md)
  - [HMR](./ecosystem/other/hmr.md)
  - [Runtime Edge](./ecosystem/other/runtime-edge.md)
  - [HTTP Server](./ecosystem/other/http-server.md)
  - [Middleware](./ecosystem/other/middleware.md)
  - [Middleware CORS](./ecosystem/other/middleware-cors.md)
  - [Middleware Auth](./ecosystem/other/middleware-auth.md)
  - [Middleware Rate Limit](./ecosystem/other/middleware-rate-limit.md)
  - [Metadata](./ecosystem/other/metadata.md)
  - [SSG](./ecosystem/other/ssg.md)
  - [Cache ISR](./ecosystem/other/cache-isr.md)
  - [HTML Renderer](./ecosystem/other/html-renderer.md)
- 插件
  - [Animation](./ecosystem/plugins/animation.md)
  - [Form](./ecosystem/plugins/form.md)

## 🔍 API 参考

- [API 概览](./api/index.md)
- [Core](./api/core.md)
- [Core Variants](./api/core-variants.md)
- [Reactivity](./api/reactivity.md)
- [Component](./api/component.md)
- [Compiler](./api/compiler.md)
- [Renderer](./api/renderer.md)
- [Vdom](./api/vdom.md)
- [Common](./api/common.md)
- [Router](./api/router.md)
- [Store](./api/store.md)
- [DevTools](./api/devtools.md)
- [Plugin Vite](./api/plugin-vite.md)
- [Host Contract](./api/host-contract.md)
- [Shared Types](./api/shared-types.md)
- [CLI](./api/cli.md)
- [Test Utils](./api/test-utils.md)

### 生成态扩展（自动生成，见下方 `./api/generated/` 下的文件列表）

- **官方插件**：[plugin-animation](./api/generated/plugin-animation.md) / [plugin-auth](./api/generated/plugin-auth.md) / [plugin-chart](./api/generated/plugin-chart.md) / [plugin-data](./api/generated/plugin-data.md) / [plugin-data-fetch](./api/generated/plugin-data-fetch.md) / [plugin-form](./api/generated/plugin-form.md) / [plugin-i18n](./api/generated/plugin-i18n.md) / [plugin-logger](./api/generated/plugin-logger.md) / [plugin-storage](./api/generated/plugin-storage.md) / [plugin-testing](./api/generated/plugin-testing.md) / [plugin-theme](./api/generated/plugin-theme.md) / [plugin-validation](./api/generated/plugin-validation.md)
- **SSR 渲染栈**：[ssr](./api/generated/ssr.md) / [ssg](./api/generated/ssg.md) / [hmr](./api/generated/hmr.md) / [cache](./api/generated/cache.md) / [cache-isr](./api/generated/cache-isr.md) / [html-renderer](./api/generated/html-renderer.md)
- **Web 框架**：[api](./api/generated/api.md) / [http-server](./api/generated/http-server.md) / [metadata](./api/generated/metadata.md) / [middleware](./api/generated/middleware.md) / [middleware-auth](./api/generated/middleware-auth.md) / [middleware-cors](./api/generated/middleware-cors.md) / [middleware-rate-limit](./api/generated/middleware-rate-limit.md) / [router-fs](./api/generated/router-fs.md)
- **平台与生态**：[ui](./api/generated/ui.md) / [adapter-web](./api/generated/adapter-web.md) / [devtools](./api/generated/devtools.md) / [runtime-edge](./api/generated/runtime-edge.md) / [bundler](./api/generated/bundler.md)

## 💻 示例代码

- [示例概览](./examples/index.md)
- [Counter](./examples/counter.md)
- [TodoMVC](./examples/todomvc.md)
- [交互式计数器](./examples/interactive-counter.md)
- [用户列表](./examples/user-list.md)

## 🔗 参考资料

- [参考资料](./reference/index.md)

## 🤝 贡献指南

- [贡献首页](./contribute/index.md)
- [开始贡献](./contribute/getting-started.md)
- [架构设计](./contribute/architecture/index.md)
  - [8 层架构](./contribute/architecture/8-layer-architecture.md)
  - [生态迁出与融合](./contribute/architecture/ecosystem-migration.md)
- [开发指南](./contribute/development/index.md)
  - [工作流程](./contribute/development/workflow.md)
  - [版本开发流程](./contribute/development/version-workflow.md)
  - [开发规范](./contribute/development/guidelines.md)
  - [测试指南](./contribute/development/testing.md)
  - [TypeScript](./contribute/development/typescript.md)
  - [Benchmark PR](./contribute/development/benchmark-pr.md)
- [知识库](./contribute/knowledge-base/index.md)
  - [开发技巧](./contribute/knowledge-base/development-skills.md)
- [原则](./contribute/principles/index.md)
  - [中文文档](./contribute/principles/chinese-docs.md)
  - [Common 模块](./contribute/principles/common-modules.md)
  - [零依赖](./contribute/principles/zero-dependency.md)
- [性能](./contribute/performance/index.md)
  - [基准与计划](./contribute/performance/baseline-and-plans.md)
  - [优化报告 v6.4](./contribute/performance/optimization-report-v64.md)
- [插件](./contribute/plugins/index.md)
  - [插件开发](./contribute/plugins/plugin-development.md)
- [路线图](./contribute/roadmap/index.md)
  - [当前](./contribute/roadmap/current.md)
- [AI 助手](./contribute/ai/index.md)
  - [助手开发指南](./contribute/ai/assistant-guide.md)
  - [IDE 规则](./contribute/ai/ide-rules.md)
  - [Agents 优化](./contribute/ai/agents-optimization.md)
- [其他](./contribute/other/index.md)
  - [代码分析报告](./contribute/other/code-analysis-report.md)
  - [社区行为准则](./contribute/other/code-of-conduct.md)
  - [社区激励计划](./contribute/other/incentive-program.md)
  - [待办任务](./contribute/other/pending-tasks.md)
  - [第三方生态](./contribute/other/third-party-ecosystem.md)
  - [故障排除](./contribute/other/troubleshooting.md)
  - [v6.4 到 v6.5 过渡](./contribute/other/v64-v65-transition.md)

## 👥 社区

- [社区首页](./community/index.md)
- [v6.9.5 发布](./community/RELEASE_v6.9.5.md)
- [v6.9.0 发布](./community/RELEASE_v6.9.0.md)
- [v6.8.0 发布](./community/RELEASE_v6.8.0.md)
- [v6.7.0 发布](./community/RELEASE_v6.7.0.md)
- [v6.6.0 发布](./community/RELEASE_v6.6.0.md)
- [v6.5.0 发布](./community/RELEASE_v6.5.0.md)
- [v6.4.0 发布](./community/RELEASE_v6.4.0.md)
