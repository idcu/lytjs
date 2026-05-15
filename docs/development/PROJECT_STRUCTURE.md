# LytJS 项目结构说明

## 概述

本文档详细说明了 LytJS v6.0.0 的项目目录结构，与 8 层架构设计一一对应。

---

## 目录结构总览

```
packages/
├── common/                # L0 基础工具层
│   └── packages/          # 29+ 个工具包
├── reactivity/            # L1 核心原语层 - 响应式系统
├── vdom/                 # L1 核心原语层 - 虚拟 DOM
├── compiler/              # L1 核心原语层 - 模板编译器
├── renderer/              # L2 渲染引擎层 - 渲染器核心
├── component/             # L2 渲染引擎层 & L5 组件基础层
├── dom-runtime/           # L2 渲染引擎层 - DOM 运行时
├── core/                  # L3 核心运行时层 - 核心运行时
├── core-signal/           # L3 核心运行时层 - Signal 模式核心
├── core-vnode/            # L3 核心运行时层 - VDOM 模式核心
├── adapter-web/           # L4 插件与适配层 - Web 适配器
├── dom/                   # L4 插件与适配层 - DOM 相关
├── web/                   # L4 插件与适配层 - Web 工具
├── plugins/               # L4 插件与适配层 - 官方插件
│   └── packages/          # 6 个官方插件
├── ecosystem/             # L6 生态系统层
│   └── packages/          # UI、路由、状态管理、SSR 等
├── tools/                 # L7 工程化工具层
│   └── packages/          # CLI、测试工具、DevTools 扩展
├── shared-types/          # L0 基础工具层 - 全局类型定义
└── host-contract/         # L0 基础工具层 - Host Contract 接口
```

---

## 各层目录详解

### L0: 基础工具层

**定位**：提供底层基础设施，无任何外部依赖

**目录**：`packages/common/`、`packages/shared-types/`、`packages/host-contract/`

**职责**：

- 类型判断和验证
- 常量定义
- 字符串处理
- 事件机制
- 调度器
- 算法工具
- DOM 工具
- 性能监控

**工具包列表**（29+ 个）：

- `@lytjs/common-is` - 类型判断
- `@lytjs/common-constants` - 常量定义
- `@lytjs/common-string` - 字符串处理
- `@lytjs/common-object` - 对象工具
- `@lytjs/common-error` - 错误处理
- `@lytjs/common-warn` - 警告系统
- `@lytjs/common-events` - 事件机制
- `@lytjs/common-scheduler` - 调度器
- `@lytjs/common-algorithm` - 算法工具
- `@lytjs/common-dom` - DOM 基础
- `@lytjs/common-dom-helpers` - DOM 辅助函数
- `@lytjs/common-performance` - 性能监控
- `@lytjs/common-a11y` - 无障碍访问
- `@lytjs/common-keyboard` - 键盘事件
- `@lytjs/common-storage` - 存储抽象
- `@lytjs/common-validate` - 数据验证
- `@lytjs/common-http` - HTTP 请求
- `@lytjs/common-raf` - RAF 动画
- `@lytjs/common-render-queue` - 渲染队列
- `@lytjs/common-event-normalizer` - 事件标准化
- `@lytjs/common-node-cache` - 缓存机制
- `@lytjs/common-async-scheduler` - 异步调度
- `@lytjs/common-transition-engine` - 过渡动画
- `@lytjs/common-assertions` - 断言工具
- `@lytjs/common-security` - 安全工具
- `@lytjs/common-path` - 路径处理
- `@lytjs/common-query` - 查询解析
- `@lytjs/common-timing` - 计时工具
- `@lytjs/common-cache` - 缓存工具

---

### L1: 核心原语层

**定位**：提供框架核心能力

**目录**：`packages/reactivity/`、`packages/vdom/`、`packages/compiler/`

| 包                  | 职责                                     |
| ------------------- | ---------------------------------------- |
| `@lytjs/reactivity` | 响应式系统（signal/ref/computed/effect） |
| `@lytjs/vdom`       | 虚拟 DOM（VNode、h、patch、diff）        |
| `@lytjs/compiler`   | 模板编译器（解析、优化、代码生成）       |

---

### L2: 渲染引擎层

**定位**：提供渲染能力

**目录**：`packages/renderer/`、`packages/component/`、`packages/dom-runtime/`

| 包                   | 职责                            |
| -------------------- | ------------------------------- |
| `@lytjs/renderer`    | 渲染器核心（Vapor/VDOM 双模式） |
| `@lytjs/component`   | 组件系统（定义、挂载、更新）    |
| `@lytjs/dom-runtime` | DOM 运行时（DOM 操作封装）      |

---

### L3: 核心运行时层

**定位**：提供应用运行时

**目录**：`packages/core/`、`packages/core-signal/`、`packages/core-vnode/`

| 包                   | 职责                              |
| -------------------- | --------------------------------- |
| `@lytjs/core`        | 核心运行时（应用实例、生命周期）  |
| `@lytjs/core-signal` | Signal 模式核心（Vapor 模式 API） |
| `@lytjs/core-vnode`  | VDOM 模式核心（传统 VDOM API）    |

---

### L4: 插件与适配层

**定位**：提供可插拔功能和跨平台支持

**目录**：`packages/plugins/`、`packages/adapter-web/`、`packages/dom/`、`packages/web/`

#### 官方插件

| 插件                    | 职责                               |
| ----------------------- | ---------------------------------- |
| `@lytjs/plugin-theme`   | 主题管理（深色/浅色、CSS 变量）    |
| `@lytjs/plugin-logger`  | 日志系统（分级、性能追踪）         |
| `@lytjs/plugin-auth`    | 认证授权（角色、权限）             |
| `@lytjs/plugin-storage` | 本地存储（localStorage、过期时间） |
| `@lytjs/plugin-i18n`    | 国际化（多语言、翻译插值）         |
| `@lytjs/plugin-vite`    | Vite 构建集成                      |

#### 适配器

| 包                   | 职责           |
| -------------------- | -------------- |
| `@lytjs/adapter-web` | Web 平台适配器 |
| `@lytjs/dom`         | DOM 工具封装   |
| `@lytjs/web`         | Web 平台工具   |

---

### L5: 组件基础层

**定位**：提供组件开发基础设施

**对应**：`packages/component/` 包的部分功能

**职责**：

- 统一组件 API
- 组件通信机制
- 样式规范定义
- 主题适配接口

---

### L6: 生态系统层

**定位**：提供完整的业务解决方案

**目录**：`packages/ecosystem/packages/`

| 包                        | 职责                       |
| ------------------------- | -------------------------- |
| `@lytjs/ui`               | UI 组件库（60+ 组件）      |
| `@lytjs/router`           | 路由系统                   |
| `@lytjs/store`            | 状态管理（灵感来自 Pinia） |
| `@lytjs/ssr`              | 服务端渲染                 |
| `@lytjs/devtools`         | 开发者工具                 |
| `@lytjs/compat`           | 兼容层                     |
| `@lytjs/platform-adapter` | 平台适配器                 |

**特点**：

- 可以引入第三方依赖
- 功能完整，开箱即用
- 提供完整文档和示例

---

### L7: 工程化工具层

**定位**：开发和构建时工具

**目录**：`packages/tools/packages/`

| 包                          | 职责                |
| --------------------------- | ------------------- |
| `@lytjs/cli`                | 命令行工具          |
| `@lytjs/test-utils`         | 测试工具            |
| `@lytjs/devtools-extension` | DevTools 浏览器扩展 |

**特点**：

- 只在开发/构建时使用
- 不影响运行时
- 可以使用第三方依赖

---

## 开发规范

### 创建新工具包（L0）

1. 在 `packages/common/packages/` 创建目录
2. 参考现有工具包结构
3. 确保零第三方依赖
4. 添加完整的测试覆盖
5. 在 `packages/common/packages/index.ts` 中导出

### 创建新插件（L4）

1. 在 `packages/plugins/packages/` 创建目录
2. 使用 `definePlugin` API
3. 遵循零第三方依赖原则
4. 添加完整的测试和文档
5. 在 `packages/plugins/packages/index.ts` 中导出

### 创建新生态系统包（L6）

1. 在 `packages/ecosystem/packages/` 创建目录
2. 可以依赖第三方库
3. 提供完整的功能实现
4. 添加文档和示例
5. 在 `packages/ecosystem/packages/index.ts` 中导出

### 创建新工程化工具（L7）

1. 在 `packages/tools/packages/` 创建目录
2. 使用 Node.js 原生 API
3. 可以使用第三方依赖（仅开发时）
4. 提供 CLI 或 API 接口

---

## 构建命令

```bash
# 构建所有
pnpm build

# 构建 L0 基础工具层
pnpm build:common

# 构建 L1-L3 核心包
pnpm build:core

# 构建 L6 生态系统
pnpm build:ecosystem

# 构建 L7 工程化工具
pnpm build:tools

# 构建 L4 官方插件
pnpm build:plugins
```

---

## 相关文档

- [架构设计文档](./ARCHITECTURE.md) - 8 层架构详细说明
- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 官方插件开发规范
- [中文文档指南](./CHINESE_DOCS_GUIDE.md) - 文档编写规范

---

**文档版本**: v1.2
**最后更新**: 2026-05-15
**维护者**: LytJS Team
