# Core 核心入口

Core 模块是整个框架的统一入口，整合了所有核心功能。

## 🎯 Core 的作用

Core 模块负责：

1. **提供统一入口** - 整合 reactivity、compiler、renderer、component
2. **创建应用实例** - `createApp()` 函数
3. **插件系统** - `app.use()` 安装插件
4. **全局组件/指令** - 注册全局组件和指令

**源代码位置**：`packages/core/src/`

## 📦 核心文件

### create-app.ts

**位置**：`packages/core/src/create-app.ts`

`createApp()` 函数创建应用实例，是框架的入口。

### h.ts

**位置**：`packages/core/src/h.ts`

`h()` 函数创建虚拟 DOM 节点。

### plugin.ts

**位置**：`packages/core/src/plugin.ts`

插件系统。

### error-handling.ts

**位置**：`packages/core/src/error-handling.ts`

错误处理。

## 💡 推荐阅读顺序

1. **create-app.ts** - 理解应用创建
2. **h.ts** - 理解 VNode 创建
3. **plugin.ts** - 理解插件系统

## 📚 相关文档

- [架构总览](../01-architecture-overview.md)
- [模块组装](../advanced/01-module-assembly.md)
