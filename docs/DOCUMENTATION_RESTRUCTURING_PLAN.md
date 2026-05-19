# LytJS 文档站重构计划

> **目标**: 让不同目标群体快速、准确地获取需要的资料  
> **版本**: v6.5.0  
> **日期**: 2026-05-19

---

## 🎯 目标用户分析

### 1. 👶 新手用户
- **特征**: 前端开发初学者，对框架了解较少
- **需求**: 简单易懂的教程，循序渐进，有完整案例
- **痛点**: 术语过多，缺乏示例，不知道从哪里开始
- **入口**: 快速上手、实战教程、示例代码

### 2. 👨‍💻 有经验的开发者
- **特征**: 熟悉 Vue/React，想快速了解 LytJS
- **需求**: 核心概念、API 参考、性能优化、最佳实践
- **痛点**: 不想看新手教程，想快速找到高级特性
- **入口**: 核心概念、API 参考、高级特性、架构设计

### 3. 🤝 项目贡献者
- **特征**: 想为 LytJS 贡献代码的开发者
- **需求**: 架构设计、开发规范、贡献指南、测试指南
- **痛点**: 找不到架构文档，不了解代码结构
- **入口**: 架构设计、开发规范、贡献指南

### 4. 🤖 AI 助手
- **特征**: 需要快速检索文档的 AI 工具
- **需求**: 清晰的文档结构，准确的 API 索引，完整的类型定义
- **痛点**: 文档分散，结构混乱，难以快速定位
- **入口**: API 参考、架构图、索引文档

---

## 🏗️ 新文档架构设计

### 总体结构

```
docs/
├── index.md                    # 首页 - 按用户角色分流
├── new-summary.md              # 新的侧边栏菜单
│
├── getting-started/            # 🏠 新手专区
│   ├── index.md                # 新手专区首页
│   ├── quick-start.md          # 5 分钟快速上手
│   ├── installation.md         # 安装指南
│   ├── first-app.md            # 创建第一个应用
│   └── resources.md            # 学习资源汇总
│
├── guide/                      # 📚 核心指南（参考文档）
│   ├── index.md                # 指南首页
│   ├── reactivity/             # 响应式系统
│   │   ├── index.md
│   │   ├── signal.md           # Signal 模式
│   │   ├── computed.md
│   │   └── effect.md
│   ├── components/             # 组件系统
│   │   ├── index.md
│   │   ├── basics.md
│   │   ├── lifecycle.md
│   │   ├── props.md
│   │   └── events.md
│   ├── rendering/              # 渲染模式
│   │   ├── index.md
│   │   ├── vnode-mode.md       # VNode 模式
│   │   └── signal-mode.md      # Signal/Vapor 模式
│   ├── templates/              # 模板语法
│   ├── built-in/               # 内置组件
│   ├── advanced/               # 高级特性
│   │   ├── typescript.md
│   │   ├── custom-renderer.md
│   │   ├── error-boundary.md
│   │   └── build-optimization.md
│   ├── ssr/                    # SSR 指南
│   │   ├── index.md
│   │   ├── basics.md
│   │   └── hydration.md
│   └── plugins/                # 插件系统
│       ├── index.md
│       └── development.md
│
├── tutorials/                  # 🎓 实战教程
│   ├── index.md                # 教程首页
│   ├── beginner/               # 初级教程
│   │   ├── todo-app.md         # Todo 应用
│   │   ├── counter.md
│   │   └── user-list.md
│   ├── intermediate/           # 中级教程
│   │   ├── user-management.md
│   │   ├── shopping-cart.md
│   │   ├── form-validation.md
│   │   └── blog-system.md
│   ├── advanced/               # 高级教程
│   │   ├── enterprise-practices.md
│   │   ├── performance-tuning.md
│   │   └── custom-plugins.md
│   └── migration/              # 迁移指南
│       ├── from-vue.md
│       └── from-react.md
│
├── packages/                   # 📦 包文档（独立大菜单）
│   ├── index.md                # 所有包总览
│   ├── core/                   # 核心包
│   │   ├── index.md
│   │   ├── core.md
│   │   ├── core-vnode.md
│   │   └── core-signal.md
│   ├── reactivity/             # 响应式包
│   │   ├── index.md
│   │   └── reactivity.md
│   ├── common/                 # Common 包（重点突出）
│   │   ├── index.md
│   │   ├── overview.md
│   │   ├── utils.md
│   │   ├── collections.md
│   │   └── memory.md
│   ├── component/              # 组件包
│   │   ├── index.md
│   │   └── component.md
│   ├── compiler/               # 编译器包
│   │   ├── index.md
│   │   └── compiler.md
│   ├── vdom/                   # 虚拟 DOM 包
│   │   ├── index.md
│   │   └── vdom.md
│   ├── renderer/               # 渲染器包
│   │   ├── index.md
│   │   └── renderer.md
│   ├── dom/                    # DOM 平台包
│   │   ├── index.md
│   │   └── dom.md
│   ├── web/                    # Web 平台包
│   │   ├── index.md
│   │   └── web.md
│   └── other/                  # 其他包
│       ├── adapter-web.md
│       ├── dom-runtime.md
│       ├── host-contract.md
│       ├── shared-types.md
│       └── ...
│
├── plugins/                    # 🔌 插件生态（独立大菜单）
│   ├── index.md                # 插件总览
│   ├── official/               # 官方插件
│   │   ├── index.md
│   │   ├── validation.md
│   │   ├── data.md
│   │   ├── data-fetch.md
│   │   ├── animation.md
│   │   ├── form.md
│   │   ├── testing.md
│   │   ├── i18n.md
│   │   ├── auth.md
│   │   └── ...
│   └── development/            # 插件开发指南
│       ├── index.md
│       ├── getting-started.md
│       ├── api.md
│       └── examples.md
│
├── ecosystem/                  # 🌐 生态系统（独立大菜单）
│   ├── index.md                # 生态总览
│   ├── router/                 # 路由
│   │   ├── index.md
│   │   ├── router.md
│   │   └── router-fs.md
│   ├── store/                  # 状态管理
│   │   ├── index.md
│   │   └── store.md
│   ├── ui/                     # UI 组件库
│   │   ├── index.md
│   │   ├── components.md
│   │   └── vapor-guide.md
│   ├── ssr/                    # SSR
│   │   ├── index.md
│   │   └── ssr.md
│   ├── devtools/               # 开发工具
│   │   ├── index.md
│   │   └── devtools.md
│   ├── cli/                    # CLI 工具
│   │   ├── index.md
│   │   └── cli.md
│   └── other/                  # 其他生态
│       ├── api.md
│       ├── bundler.md
│       ├── hmr.md
│       └── runtime-edge.md
│
├── api/                        # 🔍 API 参考（独立大菜单）
│   ├── index.md                # API 索引
│   ├── core.md
│   ├── reactivity.md
│   ├── component.md
│   ├── compiler.md
│   ├── vdom.md
│   ├── renderer.md
│   ├── common.md
│   ├── router.md
│   ├── store.md
│   ├── cli.md
│   ├── plugin-vite.md
│   └── ...
│
├── examples/                   # 📝 示例代码
│   ├── index.md
│   ├── counter.md
│   ├── todomvc.md
│   ├── interactive-counter.md
│   └── user-list.md
│
├── contribute/                 # 🤝 贡献指南（面向贡献者）
│   ├── index.md
│   ├── getting-started.md      # 开始贡献
│   ├── architecture/           # 架构设计
│   │   ├── index.md
│   │   ├── 8-layer-architecture.md
│   │   └── module-relationships.md
│   ├── development/            # 开发指南
│   │   ├── workflow.md
│   │   ├── guidelines.md
│   │   ├── testing.md
│   │   └── typescript.md
│   ├── plugins/                # 插件开发
│   │   ├── index.md
│   │   └── plugin-development.md
│   ├── roadmap/                # 路线图
│   │   ├── index.md
│   │   └── current.md
│   └── other/                  # 其他
│       ├── changelog.md
│       ├── troubleshooting.md
│       └── code-of-conduct.md
│
├── reference/                  # 📖 参考资料
│   ├── index.md
│   ├── faq.md
│   ├── troubleshooting.md
│   ├── glossary.md
│   └── ...
│
├── community/                  # 👥 社区
│   ├── index.md
│   ├── releases/               # 版本发布
│   │   ├── v6.5.0.md
│   │   ├── v6.4.0.md
│   │   └── v6.3.0.md
│   ├── incentive-program.md
│   └── ...
│
└── legacy/                     # 📦 旧文档（暂时保留）
    ├── development/
    └── tutorial/
```

---

## 📑 首页设计

### 按用户角色分流

```markdown
---
layout: home

hero:
  name: LytJS
  text: 轻量级渐进式框架
  tagline: 高性能、易扩展、现代化 JavaScript 应用框架
  image:
    src: /logo.svg
    alt: LytJS

actions:
  - theme: brand
    text: 🏠 我是新手 - 开始学习
    link: /getting-started/
  - theme: alt
    text: 👨‍💻 我是开发者 - 查看文档
    link: /guide/
  - theme: alt
    text: 🤝 我想贡献 - 贡献指南
    link: /contribute/
  - theme: alt
    text: 📦 查看所有包
    link: /packages/
  - theme: alt
    text: 🔌 查看插件
    link: /plugins/
  - theme: alt
    text: 🌐 生态系统
    link: /ecosystem/

features:
  - icon: 🏠
    title: 新手入门
    details: 5 分钟快速上手，循序渐进的教程，完整的实战案例
    link: /getting-started/
  - icon: 📚
    title: 核心指南
    details: 完整的参考文档，从响应式系统到高级特性
    link: /guide/
  - icon: 🎓
    title: 实战教程
    details: Todo、用户管理、购物车、博客系统等完整案例
    link: /tutorials/
  - icon: 📦
    title: 包文档
    details: 所有官方包的详细文档，包括 Common、Core、Reactivity 等
    link: /packages/
  - icon: 🔌
    title: 插件生态
    details: Validation、Data、Form、Animation 等官方插件
    link: /plugins/
  - icon: 🌐
    title: 生态系统
    details: Router、Store、UI、DevTools、SSR、CLI 一应俱全
    link: /ecosystem/
---
```

---

## 🔧 侧边栏菜单设计

### 新的 SUMMARY.md 结构

```markdown
# 🌐 LytJS 文档

## 🏠 新手专区

- [新手专区首页](/getting-started/)
- [5 分钟快速上手](/getting-started/quick-start.md)
- [安装指南](/getting-started/installation.md)
- [创建第一个应用](/getting-started/first-app.md)
- [学习资源](/getting-started/resources.md)

## 📚 核心指南

- [指南首页](/guide/)
- 响应式系统
  - [概述](/guide/reactivity/)
  - [Signal 模式](/guide/reactivity/signal.md)
  - [Computed](/guide/reactivity/computed.md)
  - [Effect](/guide/reactivity/effect.md)
- 组件系统
  - [概述](/guide/components/)
  - [组件基础](/guide/components/basics.md)
  - [生命周期](/guide/components/lifecycle.md)
  - [Props](/guide/components/props.md)
  - [事件](/guide/components/events.md)
- 渲染模式
  - [概述](/guide/rendering/)
  - [VNode 模式](/guide/rendering/vnode-mode.md)
  - [Signal/Vapor 模式](/guide/rendering/signal-mode.md)
- 模板语法
  - [概述](/guide/templates/)
- 内置组件
  - [概述](/guide/built-in/)
- 高级特性
  - [TypeScript](/guide/advanced/typescript.md)
  - [自定义渲染器](/guide/advanced/custom-renderer.md)
  - [Error Boundary](/guide/advanced/error-boundary.md)
  - [构建优化](/guide/advanced/build-optimization.md)
- SSR 指南
  - [概述](/guide/ssr/)
  - [基础使用](/guide/ssr/basics.md)
  - [水合策略](/guide/ssr/hydration.md)
- 插件系统
  - [概述](/guide/plugins/)
  - [插件开发](/guide/plugins/development.md)

## 🎓 实战教程

- [教程首页](/tutorials/)
- 初级教程
  - [Todo 应用](/tutorials/beginner/todo-app.md)
  - [计数器](/tutorials/beginner/counter.md)
  - [用户列表](/tutorials/beginner/user-list.md)
- 中级教程
  - [用户管理系统](/tutorials/intermediate/user-management.md)
  - [购物车](/tutorials/intermediate/shopping-cart.md)
  - [表单验证](/tutorials/intermediate/form-validation.md)
  - [博客系统](/tutorials/intermediate/blog-system.md)
- 高级教程
  - [企业级最佳实践](/tutorials/advanced/enterprise-practices.md)
  - [性能调优](/tutorials/advanced/performance-tuning.md)
  - [自定义插件](/tutorials/advanced/custom-plugins.md)
- 迁移指南
  - [从 Vue 迁移](/tutorials/migration/from-vue.md)
  - [从 React 迁移](/tutorials/migration/from-react.md)

## 📦 包文档

- [所有包总览](/packages/)
- 核心包
  - [Core](/packages/core/core.md)
  - [Core VNode](/packages/core/core-vnode.md)
  - [Core Signal](/packages/core/core-signal.md)
- 响应式包
  - [Reactivity](/packages/reactivity/reactivity.md)
- Common 包（重点突出）
  - [Common 概述](/packages/common/)
  - [工具函数](/packages/common/utils.md)
  - [集合](/packages/common/collections.md)
  - [内存管理](/packages/common/memory.md)
- 组件包
  - [Component](/packages/component/component.md)
- 编译器包
  - [Compiler](/packages/compiler/compiler.md)
- 虚拟 DOM 包
  - [VDOM](/packages/vdom/vdom.md)
- 渲染器包
  - [Renderer](/packages/renderer/renderer.md)
- DOM 平台包
  - [DOM](/packages/dom/dom.md)
- Web 平台包
  - [Web](/packages/web/web.md)
- 其他包
  - [Adapter Web](/packages/other/adapter-web.md)
  - [DOM Runtime](/packages/other/dom-runtime.md)
  - [Host Contract](/packages/other/host-contract.md)
  - [Shared Types](/packages/other/shared-types.md)

## 🔌 插件生态

- [插件总览](/plugins/)
- 官方插件
  - [Validation](/plugins/official/validation.md)
  - [Data](/plugins/official/data.md)
  - [Data Fetch](/plugins/official/data-fetch.md)
  - [Animation](/plugins/official/animation.md)
  - [Form](/plugins/official/form.md)
  - [Testing](/plugins/official/testing.md)
  - [i18n](/plugins/official/i18n.md)
  - [Auth](/plugins/official/auth.md)
  - [Storage](/plugins/official/storage.md)
  - [其他插件...](/plugins/official/)
- 插件开发
  - [插件开发概述](/plugins/development/)
  - [入门指南](/plugins/development/getting-started.md)
  - [插件 API](/plugins/development/api.md)
  - [插件示例](/plugins/development/examples.md)

## 🌐 生态系统

- [生态总览](/ecosystem/)
- Router
  - [Router](/ecosystem/router/router.md)
  - [Router FS](/ecosystem/router/router-fs.md)
- Store
  - [Store](/ecosystem/store/store.md)
- UI 组件库
  - [UI 组件库](/ecosystem/ui/)
  - [组件列表](/ecosystem/ui/components.md)
  - [Vapor 模式指南](/ecosystem/ui/vapor-guide.md)
- SSR
  - [SSR](/ecosystem/ssr/ssr.md)
- DevTools
  - [DevTools](/ecosystem/devtools/devtools.md)
- CLI 工具
  - [CLI](/ecosystem/cli/cli.md)
- 其他生态
  - [API](/ecosystem/other/api.md)
  - [Bundler](/ecosystem/other/bundler.md)
  - [HMR](/ecosystem/other/hmr.md)
  - [Runtime Edge](/ecosystem/other/runtime-edge.md)

## 🔍 API 参考

- [API 索引](/api/)
- [Core](/api/core.md)
- [Reactivity](/api/reactivity.md)
- [Component](/api/component.md)
- [Compiler](/api/compiler.md)
- [VDOM](/api/vdom.md)
- [Renderer](/api/renderer.md)
- [Common](/api/common.md)
- [Router](/api/router.md)
- [Store](/api/store.md)
- [CLI](/api/cli.md)
- [Plugin Vite](/api/plugin-vite.md)

## 📝 示例代码

- [示例首页](/examples/)
- [Counter](/examples/counter.md)
- [TodoMVC](/examples/todomvc.md)
- [交互式计数器](/examples/interactive-counter.md)
- [用户列表](/examples/user-list.md)

## 🤝 贡献指南

- [贡献首页](/contribute/)
- [开始贡献](/contribute/getting-started.md)
- 架构设计
  - [架构概览](/contribute/architecture/)
  - [8 层架构](/contribute/architecture/8-layer-architecture.md)
  - [模块关系](/contribute/architecture/module-relationships.md)
- 开发指南
  - [工作流程](/contribute/development/workflow.md)
  - [开发规范](/contribute/development/guidelines.md)
  - [测试指南](/contribute/development/testing.md)
  - [TypeScript 指南](/contribute/development/typescript.md)
- 插件开发
  - [插件开发](/contribute/plugins/)
- 路线图
  - [路线图](/contribute/roadmap/)
  - [当前计划](/contribute/roadmap/current.md)
- 其他
  - [变更日志](/contribute/other/changelog.md)
  - [故障排除](/contribute/other/troubleshooting.md)
  - [行为准则](/contribute/other/code-of-conduct.md)

## 📖 参考资料

- [参考资料首页](/reference/)
- [FAQ](/reference/faq.md)
- [故障排除](/reference/troubleshooting.md)
- [术语表](/reference/glossary.md)

## 👥 社区

- [社区首页](/community/)
- 版本发布
  - [v6.5.0](/community/releases/v6.5.0.md)
  - [v6.4.0](/community/releases/v6.4.0.md)
  - [v6.3.0](/community/releases/v6.3.0.md)
- [激励计划](/community/incentive-program.md)
```

---

## 🚀 实施计划

### 阶段一：准备阶段
- [x] 分析目标用户需求
- [x] 设计新文档架构
- [x] 创建重构计划文档
- [ ] 备份现有文档

### 阶段二：目录结构调整
- [ ] 创建新目录结构
- [ ] 移动现有文档到新位置
- [ ] 创建必要的索引文件

### 阶段三：内容重组
- [ ] 重组 guide 文档
- [ ] 重组 tutorial 文档
- [ ] 创建 packages 目录文档
- [ ] 创建 plugins 目录文档
- [ ] 创建 ecosystem 目录文档
- [ ] 创建 contribute 目录文档

### 阶段四：首页和菜单更新
- [ ] 更新首页 index.md
- [ ] 创建新的 SUMMARY.md
- [ ] 测试侧边栏导航

### 阶段五：检查和修复
- [ ] 检查所有链接
- [ ] 修复断链
- [ ] 检查重复内容
- [ ] 更新所有引用

### 阶段六：清理
- [ ] 归档旧文档
- [ ] 删除临时文件
- [ ] 提交变更

---

## 📊 迁移策略

### 旧文档迁移

```
现有文档 → 新位置

docs/tutorial/ →
  - quick-start.md → getting-started/quick-start.md
  - basics.md → tutorials/beginner/
  - components.md → guide/components/basics.md
  - reactivity.md → guide/reactivity/
  - typescript-guide.md → guide/advanced/typescript.md
  - todo-app-example.md → tutorials/beginner/todo-app.md
  - 待办应用案例.md → tutorials/beginner/todo-app.md
  - 用户管理案例.md → tutorials/intermediate/user-management.md
  - 购物车案例.md → tutorials/intermediate/shopping-cart.md
  - 博客系统案例.md → tutorials/intermediate/blog-system.md
  - 表单验证实战案例.md → tutorials/intermediate/form-validation.md
  - 实战案例教程.md → tutorials/index.md
  - 官方插件使用指南.md → plugins/official/
  - custom-plugins.md → tutorials/advanced/custom-plugins.md
  - migration-from-vue.md → tutorials/migration/from-vue.md
  - migration-from-react.md → tutorials/migration/from-react.md
  - ssr-guide.md → guide/ssr/
  - testing.md → guide/advanced/
  - best-practices.md → tutorials/advanced/
  - enterprise-best-practices.md → tutorials/advanced/
  - error-boundary-best-practices.md → guide/advanced/
  - performance.md → tutorials/advanced/
  - cli-guide.md → ecosystem/cli/
  - api-integration.md → ecosystem/other/
  - deployment.md → guide/advanced/
  - faq.md → reference/faq.md
  - troubleshooting.md → reference/troubleshooting.md
  - skill-performance-roadmap.md → contribute/roadmap/

docs/guide/ → guide/
  - getting-started.md → getting-started/
  - installation.md → getting-started/installation.md
  - architecture.md → contribute/architecture/
  - reactivity.md → guide/reactivity/
  - component.md → guide/components/basics.md
  - built-in-components.md → guide/built-in/
  - typescript.md → guide/advanced/typescript.md
  - ssr.md → guide/ssr/
  - plugins.md → guide/plugins/
  - rendering-modes.md → guide/rendering/
  - error-boundary.md → guide/advanced/
  - build-optimization.md → guide/advanced/
  - custom-renderer.md → guide/advanced/
  - packages/ → packages/
    - common.md → packages/common/
    - reactivity-deep.md → guide/reactivity/
    - vdom-deep.md → guide/rendering/
    - compiler-deep.md → packages/compiler/
    - custom-renderer.md → guide/advanced/

docs/development/ → contribute/
  - CONTRIBUTING.md → contribute/index.md
  - ARCHITECTURE.md → contribute/architecture/8-layer-architecture.md
  - WORKFLOW.md → contribute/development/workflow.md
  - DEVELOPMENT_GUIDELINES.md → contribute/development/guidelines.md
  - TESTING_GUIDE.md → contribute/development/testing.md
  - TYPESCRIPT_ENHANCEMENT_GUIDE.md → contribute/development/typescript.md
  - PLUGIN_DEVELOPMENT.md → contribute/plugins/
  - SSR_GUIDE.md → guide/ssr/
  - ROADMAP_NEXT_STEPS.md → contribute/roadmap/current.md
  - CHANGELOG.md → contribute/other/changelog.md
  - TROUBLESHOOTING.md → contribute/other/troubleshooting.md
  - 其他文档 → contribute/other/

docs/community/ → community/
  - RELEASE_v6.5.0.md → community/releases/v6.5.0.md
  - RELEASE_v6.4.0.md → community/releases/v6.4.0.md
  - RELEASE_v6.3.0.md → community/releases/v6.3.0.md
  - CODE_OF_CONDUCT.md → contribute/other/code-of-conduct.md
  - INCENTIVE_PROGRAM.md → community/incentive-program.md

docs/ecosystem/ → ecosystem/
  - 保持现有结构，但重组到新位置

docs/api/ → api/
  - 保持现有结构

docs/examples/ → examples/
  - 保持现有结构
```

---

## ✅ 完成清单

- [ ] 新的文档目录结构创建完成
- [ ] 所有文档迁移完成
- [ ] 新的 SUMMARY.md 创建完成
- [ ] 首页 index.md 更新完成
- [ ] 所有链接检查和修复完成
- [ ] Packages 目录文档创建完成
- [ ] Plugins 目录文档创建完成
- [ ] Ecosystem 目录文档重组完成
- [ ] Contribute 目录文档重组完成
- [ ] 测试完整的文档导航
- [ ] 清理旧文档
- [ ] 提交重构变更

---

## 📝 备注

- 此重构计划可以分阶段执行
- 第一阶段可以先创建目录结构和索引文件
- 确保用户体验不中断的前提下逐步迁移
- 考虑创建重定向文件保留旧链接

---

**文档重构计划创建完成！** 🚀
