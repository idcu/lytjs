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
      text: 5 分钟快速上手
      link: /tutorial/quick-start
    - theme: alt
      text: 查看示例
      link: /examples/
    - theme: alt
      text: 在 Gitee 查看
      link: https://gitee.com/lytjs/lytjs

features:
  - icon: ⚡
    title: 极致性能
    details: 基于 Signal 的细粒度响应式系统，只更新真正需要更新的部分，带来毫秒级更新体验
  - icon: 🧩
    title: 渐进式架构
    details: 8 层清晰架构，按需引入，从简单组件到复杂应用，逐步增强
  - icon: 🔧
    title: 完整生态
    details: Router、Store、UI 组件库、DevTools、SSR 一应俱全，开箱即用
  - icon: 📦
    title: TypeScript 优先
    details: 完整的类型定义，零运行时第三方依赖，提供卓越的类型安全开发体验
  - icon: 🚀
    title: 双渲染模式
    details: 支持 VNode 虚拟 DOM 模式和 Signal 细粒度渲染模式，自由选择最佳方案
  - icon: 🛡️
    title: 零依赖
    details: 所有核心包零第三方依赖，可预测、易维护、安全性高
---

## 两条学习路径

### 🎯 我是新手 / 想快速上手
简单三步骤，马上开始！

```bash
# 1. 创建项目
npx @lytjs/cli create my-app

# 2. 安装依赖
cd my-app
pnpm install

# 3. 启动开发服务器
pnpm dev
```

然后按照 [学习路径](#学习路径) 循序渐进！

---

### 👨‍💻 我是有经验的开发者 / 想快速了解框架
直接查看核心文档！

| 技术维度 | 快速入口 |
|---------|---------|
| **响应式系统** | [API 参考 - Reactivity](./api/reactivity.md) |
| **核心架构** | [架构设计](./development/ARCHITECTURE.md) |
| **8 层架构** | [Guide - Architecture](./guide/architecture.md) |
| **性能优化** | [渲染模式](./guide/rendering-modes.md) |
| **生态系统** | [Ecosystem 总览](./ecosystem/index.md) |
| **插件开发** | [插件开发指南](./development/PLUGIN_DEVELOPMENT.md) |
| **项目结构** | [项目结构说明](./development/PROJECT_STRUCTURE.md) |

**开发者快速阅读清单：**
1. ✅ 了解 [Signal 响应式系统](api/reactivity.md#signal-api) - 了解核心性能优势
2. ✅ 查看 [架构设计](development/ARCHITECTURE.md) - 理解 8 层架构
3. ✅ 探索 [渲染模式](guide/rendering-modes.md) - Vapor vs VNode
4. ✅ 浏览 [API 总览](api/index.md) - 快速查找需要的 API

---

## 学习路径

### 新手友好路径

按顺序学习，循序渐进：

```
新手入门
  ↓
[tutorial/quick-start] → [tutorial/basics] → [tutorial/reactivity] → [tutorial/components]
  ↓
深入学习
  ↓
[guide/] → [api/] → 实战项目
```

### 开发者深入路径

```
已了解概念
  ↓
[api/reactivity] → [guide/rendering-modes] → [development/ARCHITECTURE]
  ↓
深入应用开发
  ↓
[ecosystem/router] → [ecosystem/store] → [guide/ssr]
```

---

## 项目状态

- **版本**: v6.0.0
- **状态**: 稳定版
- **许可证**: MIT

## 技术亮点

### 🔬 Signal 细粒度响应式
- 独立的信号订阅通知机制
- 桥接 Effect 系统，完全兼容
- 最小化更新成本，极致性能

### 🌊 Vapor 渲染模式
- 基于 Signal 的细粒度 DOM 更新
- 无需虚拟 DOM 对比开销
- 支持 Island Architecture 水合策略

### 📦 完整 8 层架构
```
L0: 基础工具层
L1: 核心原语层
L2: 渲染引擎层
L3: 核心运行时层
L4: 插件与适配层
L5: 组件基础层
L6: 生态系统层
L7: 工程化工具层
```

---

**开始你的 LytJS 之旅吧！** 🚀
