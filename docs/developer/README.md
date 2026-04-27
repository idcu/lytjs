# Lyt.js 开发者文档

欢迎来到 Lyt.js 开发者文档！本系列文档旨在帮助小白开发者理解 Lyt.js 的内部架构，参与到框架的开发中来。

## 📚 文档目录

### 入门指南

- [架构总览](./01-architecture-overview.md) - 了解整体架构设计
- [快速入门](./02-getting-started.md) - 从零开始了解 Lyt.js
- [代码规范](./03-coding-standards.md) - 了解代码风格和规范
- [代码层面完全掌控](./CODE_MASTERY_GUIDE.md) - 深度理解和完全掌控 Lyt.js

### 核心模块

- [reactivity](./core/01-reactivity.md) - 响应式系统深度解析
- [compiler](./core/02-compiler.md) - 模板编译器工作原理
- [renderer](./core/03-renderer.md) - 渲染器与虚拟 DOM
- [component](./core/04-component.md) - 组件系统详解
- [core](./core/05-core.md) - 核心入口与应用创建

### 功能模块

- [router](./feature/01-router.md) - 路由系统
- [store](./feature/02-store.md) - 状态管理

### 高级主题

- [模块组装](./advanced/01-module-assembly.md) - 如何把模块组装在一起

### Vapor Mode 稳定化说明

> **更新日期**：2026-04-27
>
> Vapor Mode 已从实验性升级为稳定 API。以下是本次稳定化的主要变更：

**核心 API 冻结：**
- `bindStyle(el, sig)` -- 新增，支持 Signal 驱动的样式绑定（字符串和对象两种形式）
- `bindHTML(el, sig)` -- 新增，支持 Signal 驱动的 innerHTML 绑定
- `bindIf(el, sig, anchor?)` -- 重写，从 display:none 切换改为 DOM 插入/移除方式
- `bindEach(container, sig, keyFn, renderFn)` -- 重写，从全量重建改为 keyed diff 算法
- `renderVaporComponent(comp, container, options?)` -- 新增 `props` 参数支持
- `defineVaporComponent()` -- 添加 `__vapor__` 标记

**模板编译器增强：**
- 支持 Signal 驱动的响应式 `v-if` 和 `v-each`
- 支持响应式文本插值和动态属性绑定

**错误处理和内存管理：**
- `vaporPatch()` 支持绑定迁移和清理
- `vaporMount()` 修复内存泄漏，卸载时清理所有 Signal 绑定
- `renderVaporNode()` 追踪绑定清理函数

**错误码体系：**
- 新增 Vapor 渲染器错误码（LYT_RENDERER_VAPOR_ERROR 等）
- 新增响应式循环依赖错误码（LYT_REACTIVITY_CIRCULAR_DEPENDENCY）
- 统一错误码体系到 `@lytjs/common`

**TypeScript：**
- 所有子包 tsconfig.json 统一启用 `strict: true`
- 新增 `@lytjs/common/vnode-types` 统一 VNode 类型定义

详细 API 文档请参阅：
- [Vapor Mode 指南](../guide/vapor-mode.md) -- 使用指南和最佳实践
- [渲染器 API](../api/renderer.md#vapor-mode-api) -- 完整 API 参考

## 🎯 你将学到什么？

通过阅读这些文档，你将：

1. **理解 Lyt.js 的核心思想** - 了解为何 Lyt.js 如此轻量且强大
2. **深入核心模块** - 每个模块都有独立文档，详细讲解原理
3. **学会模块组装** - 理解模块间如何协作，如何扩展功能
4. **参与社区贡献** - 获得足够的知识来提交 Pull Request

## 🚀 建议学习路径

### 第一步：理解整体架构

1. 阅读 [架构总览](./01-architecture-overview.md)
2. 阅读 [快速入门](./02-getting-started.md)

### 第二步：深入核心模块（按顺序）

1. [reactivity](./core/01-reactivity.md) - 响应式是基础
2. [compiler](./core/02-compiler.md) - 理解模板编译
3. [renderer](./core/03-renderer.md) - 理解虚拟 DOM
4. [component](./core/04-component.md) - 理解组件系统
5. [core](./core/05-core.md) - 理解整合方式

### 第三步：学习功能模块

1. [router](./feature/01-router.md) - 路由系统
2. [store](./feature/02-store.md) - 状态管理

### 第四步：高级主题

- [模块组装](./advanced/01-module-assembly.md) - 理解模块如何配合

## 💡 小白友好提示

- 每个文档都从基础概念讲起，适合初学者
- 配有大量代码示例
- 遇到不懂的地方可以查看对应模块的源代码
- 源代码中有详细注释，可以帮助你理解
- 我们鼓励提问和讨论！

## 📖 相关资源

- [用户文档](../guide/quick-start) - 面向框架使用者的文档
- [API 参考](../api/reactivity) - 详细的 API 文档
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - 贡献指南
- [测试用例](../../packages/) - 查看测试用例了解用法
- [性能基准](../../benchmarks/) - 了解性能优化

## 🔗 项目结构概览

Lyt.js 包含 24 个精心设计的包：

```
lytjs/
├── packages/           # 核心包（重要！）
│   ├── reactivity/    # 响应式系统
│   ├── compiler/      # 模板编译器
│   ├── vdom/          # 虚拟 DOM
│   ├── renderer/      # 渲染器
│   ├── component/     # 组件系统
│   ├── core/          # 核心入口
│   ├── router/        # 路由
│   ├── store/         # 状态管理
│   ├── cli/           # 命令行工具
│   ├── devtools/      # 开发者工具
│   ├── components/    # UI 组件库（38+ 组件）
│   ├── lytx/          # 元框架（SSR/SSG）
│   ├── plugin-i18n/   # 国际化插件
│   ├── plugin-auth/   # 认证插件
│   ├── plugin-logger/ # 日志插件
│   ├── plugin-storage/ # 存储插件
│   ├── plugin-theme/  # 主题插件
│   ├── plugins/       # 插件集合
│   ├── common/        # 通用工具
│   ├── test-utils/    # 测试工具
│   ├── lytjs/         # 聚合包（一键安装全部）
│   └── vscode-extension/ # VSCode 扩展
├── docs/              # 文档（你在这里）
│   ├── guide/         # 用户指南
│   ├── api/           # API 参考
│   ├── examples/      # 示例
│   ├── developer/     # 开发者文档
│   └── project/       # 项目文档
├── benchmarks/        # 性能基准
└── examples/          # 示例项目
```

## 🎉 开始学习

准备好了吗？让我们从 [架构总览](./01-architecture-overview.md) 开始！
