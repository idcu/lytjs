# LytJS 架构设计与项目结构

> 详细说明了 LytJS v6.0.0 的 8 层架构设计和项目目录结构

---

## 目录

- [架构总览](#架构总览)
- [各层详细说明](#各层详细说明)
- [项目结构映射](#项目结构映射)
- [依赖规则](#依赖规则)
- [开发规范](#开发规范)
- [构建命令](#构建命令)

---

## 架构总览

LytJS 采用 8 层架构设计，从底层到上层分别为：

| 层级 | 层名         | 核心能力                            |
| ---- | ------------ | ----------------------------------- |
| L0   | 基础工具层   | 原生 JS 工具封装、常量定义          |
| L1   | 核心原语层   | 响应式系统、虚拟 DOM、编译器        |
| L2   | 渲染引擎层   | Vapor 渲染器、VDOM 渲染器、组件系统 |
| L3   | 核心运行时层 | 应用实例、生命周期、插件机制        |
| L4   | 插件与适配层 | 官方插件、跨平台适配器、Web 适配    |
| L5   | 组件基础层   | 组件通用逻辑、通信机制              |
| L6   | 生态系统层   | UI 组件库、路由、状态管理、SSR      |
| L7   | 工程化工具层 | 构建工具、CLI、DevTools、测试工具   |

```
┌─────────────────────────────────────────────────────────┐
│ L7: 工程化工具层                                         │
│  构建工具、CLI、DevTools、测试工具                        │
├─────────────────────────────────────────────────────────┤
│ L6: 生态系统层（允许第三方依赖）                         │
│  UI 组件库、路由、状态管理、SSR、DevTools                │
├─────────────────────────────────────────────────────────┤
│ L5: 组件基础层                                           │
│  组件通用逻辑、通信机制、样式规范                        │
├─────────────────────────────────────────────────────────┤
│ L4: 插件与适配层                                         │
│  官方插件、跨平台适配器、Web 适配                        │
├─────────────────────────────────────────────────────────┤
│ L3: 核心运行时层                                         │
│  应用实例、生命周期、插件注册、依赖注入                  │
├─────────────────────────────────────────────────────────┤
│ L2: 渲染引擎层                                           │
│  Vapor 渲染器、VDOM 渲染器、组件系统                     │
├─────────────────────────────────────────────────────────┤
│ L1: 核心原语层                                           │
│  响应式系统、虚拟 DOM、编译器                            │
├─────────────────────────────────────────────────────────┤
│ L0: 基础工具层（零第三方依赖）                           │
│  工具函数、常量定义、类型系统                            │
└─────────────────────────────────────────────────────────┘
```

---

## 各层详细说明

### L0: 基础工具层

**定位**：提供底层基础设施，无任何外部依赖

**职责**：

- 类型判断和验证
- 常量定义
- 字符串处理
- 事件机制
- 调度器
- 算法工具
- DOM 工具
- 性能监控

**对应包**：

```
packages/common/packages/*    # 29+ 个工具包
packages/shared-types         # 全局类型定义
packages/host-contract        # Host Contract 接口
```

**工具包列表**：

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

**开发规范**：

- 只提供纯函数，无副作用
- 禁止依赖任何其他层
- 必须有完整的单元测试覆盖
- 文档必须详细

---

### L1: 核心原语层

**定位**：提供框架核心能力

**职责**：

- 响应式系统（signal/ref/computed）
- 虚拟 DOM（VNode）
- 模板编译器

**对应包**：

```
packages/reactivity    # 响应式系统
packages/vdom          # 虚拟 DOM
packages/compiler      # 模板编译器
```

**开发规范**：

- 零第三方依赖
- 性能优先
- 完整的测试覆盖

---

### L2: 渲染引擎层

**定位**：提供渲染能力

**职责**：

- Vapor 无虚拟 DOM 渲染
- VDOM 渲染
- 组件系统
- 服务端渲染

**对应包**：

```
packages/renderer       # 渲染器核心
packages/component      # 组件系统
packages/dom-runtime    # DOM 运行时
```

---

### L3: 核心运行时层

**定位**：提供应用运行时

**职责**：

- 应用实例创建
- 插件注册与卸载
- 生命周期管理
- 依赖注入
- 组件定义 API

**对应包**：

```
packages/core           # 核心运行时
packages/core-signal    # Signal 模式核心
packages/core-vnode     # VDOM 模式核心
```

---

### L4: 插件与适配层

**定位**：提供可插拔功能和跨平台支持

**职责**：

- 官方插件
- 跨平台适配器
- Web 平台适配

**对应包**：

```
packages/plugins/packages/*    # 6 个官方插件
packages/adapter-web           # Web 平台适配器
packages/dom                   # DOM 相关
packages/web                   # Web 工具
```

**官方插件列表**：

- `plugin-theme` - 主题管理
- `plugin-logger` - 日志系统
- `plugin-auth` - 认证授权
- `plugin-storage` - 本地存储
- `plugin-i18n` - 国际化
- `plugin-vite` - Vite 集成

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

**职责**：

- UI 组件库
- 路由系统
- 状态管理
- 服务端渲染
- 开发者工具

**对应包**：

```
packages/ecosystem/packages/*
├── ui                 # UI 组件库（60+ 组件）
├── router             # 路由系统
├── store              # 状态管理
├── ssr                # 服务端渲染
├── devtools           # 开发者工具
├── compat             # 兼容层
└── platform-adapter   # 平台适配器
```

**特点**：

- 可以引入第三方依赖
- 功能完整，开箱即用
- 提供完整文档和示例

---

### L7: 工程化工具层

**定位**：开发和构建时工具

**职责**：

- CLI 工具
- DevTools 扩展
- 测试工具

**对应包**：

```
packages/tools/packages/*
├── cli                # 命令行工具
├── test-utils         # 测试工具
└── devtools-extension # DevTools 扩展
```

**特点**：

- 只在开发/构建时使用
- 不影响运行时
- 可以使用第三方依赖

---

## 项目结构映射

### 目录结构总览

```
packages/
├── common/              # L0 基础工具层
│   └── packages/       # 29+ 个工具包
├── reactivity/          # L1 核心原语层 - 响应式系统
├── vdom/                # L1 核心原语层 - 虚拟 DOM
├── compiler/            # L1 核心原语层 - 模板编译器
├── renderer/            # L2 渲染引擎层 - 渲染器核心
├── component/           # L2 渲染引擎层 & L5 组件基础层
├── dom-runtime/         # L2 渲染引擎层 - DOM 运行时
├── core/                # L3 核心运行时层 - 核心运行时
├── core-signal/         # L3 核心运行时层 - Signal 模式核心
├── core-vnode/          # L3 核心运行时层 - VDOM 模式核心
├── adapter-web/         # L4 插件与适配层 - Web 适配器
├── dom/                 # L4 插件与适配层 - DOM 相关
├── web/                 # L4 插件与适配层 - Web 工具
├── plugins/             # L4 插件与适配层 - 官方插件
│   └── packages/        # 6 个官方插件
├── ecosystem/           # L6 生态系统层
│   └── packages/        # UI、路由、状态管理、SSR 等
├── tools/               # L7 工程化工具层
│   └── packages/        # CLI、测试工具、DevTools 扩展
├── shared-types/        # L0 基础工具层 - 全局类型定义
└── host-contract/       # L0 基础工具层 - Host Contract 接口
```

---

## 依赖规则

### 单向依赖原则

```
L7 可以依赖 L0-L6
L6 可以依赖 L0-L5
L5 可以依赖 L0-L4
L4 可以依赖 L0-L3
L3 可以依赖 L0-L2
L2 可以依赖 L0-L1
L1 可以依赖 L0
L0 不依赖任何层
```

### 特殊规则

1. **L0 开放原则**：L0 层可被所有上层直接依赖
2. **分层合理依赖**：L1-L4 尽量减少跨层，但允许必要的跨层访问
3. **零依赖边界**：L0-L6 运行时代码禁止第三方依赖
4. **L7 例外**：L7 工程化工具可以引入第三方依赖

```typescript
// ✅ 正确：任意层都可以直接依赖 L0 基础工具层
import { isArray } from '@lytjs/common-is';
import { EMPTY_OBJ } from '@lytjs/common-constants';

// ✅ 正确：上层依赖紧邻的下层
import { render } from '@lytjs/renderer';

// ✅ 允许：必要时可跨层依赖核心层
import { ref, computed } from '@lytjs/reactivity';
```

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

- [插件开发指南](./PLUGIN_DEVELOPMENT.md) - 官方插件开发规范
- [零依赖开发规范](./ZERO_DEPENDENCY_GUIDE.md) - 零依赖开发指南

---

**文档版本**: v3.0
**最后更新**: 2026-05-16
**维护者**: LytJS Team
