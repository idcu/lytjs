# Lyt.js

> 下一代轻量级前端框架 · 运行时零第三方依赖 · 双渲染模式

## 特性

- **高性能响应式系统** - 基于 Proxy 的细粒度依赖追踪
- **精确的 VDOM diff 算法** - PatchFlags 和 Block Tree 编译时优化
- **双核心模式** - Vapor 模式与 VNode 模式可选
- **8层模块化架构** - 分层设计，按需引入
- **TypeScript 全类型支持** - 完整的类型推导
- **安全优先** - 内置 XSS 防护、CSP 支持、输入验证
- **跨平台渲染** - 统一的 Host Contract 接口
- **运行时零第三方依赖** - 完全自研实现，极致轻量
- **可插拔官方插件** - 主题、日志、国际化等官方插件

## 快速开始

```bash
pnpm add @lytjs/core
```

```typescript
import { createApp, ref, computed } from '@lytjs/core';

const app = createApp({
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    return { count, doubled };
  },
  template: '<div>{{ count }} x 2 = {{ doubled }}</div>',
});

app.mount('#app');
```

## 双核心模式

Lyt.js 提供两种渲染模式，可根据场景选择：

| 包名                 | 描述                                         |
| -------------------- | -------------------------------------------- |
| `@lytjs/core`        | 完整核心，支持 Vapor 和 VNode 双模式         |
| `@lytjs/core-vnode`  | 仅 VNode 渲染模式，适合传统模板场景          |
| `@lytjs/core-signal` | 仅 Vapor/Signal 渲染模式，适合细粒度响应场景 |

## 官方插件

基于 8 层架构的可插拔插件体系，所有插件均为运行时零依赖：

| 插件名                  | 描述                             |
| ----------------------- | -------------------------------- |
| `@lytjs/plugin-theme`   | 主题切换、主题定制、CSS 变量管理 |
| `@lytjs/plugin-logger`  | 日志分级、性能追踪、持久化存储   |
| `@lytjs/plugin-auth`    | 权限路由、权限验证、角色管理     |
| `@lytjs/plugin-storage` | 本地存储、状态持久化、过期时间   |
| `@lytjs/plugin-i18n`    | 国际化支持、语言切换、翻译管理   |
| `@lytjs/plugin-vite`    | Vite 集成、热更新、构建优化      |
| `@lytjs/plugin-chart`   | 图表渲染、ECharts 集成           |

## UI 组件库

Lyt.js 提供完整的零依赖 UI 组件库（60+ 组件），所有组件均支持 Vapor 和 VNode 双模式：

| 类别     | 组件                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| 基础组件 | Button, Input, InputNumber, Icon, Badge, Tag, Spin, Empty, Link, Container, Divider            |
| 表单组件 | Form, Select, Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider, Cascader, TreeSelect |
| 反馈组件 | Dialog, Modal, Drawer, Alert, Tooltip, Popconfirm, Message, Notification, Toast, Progress      |
| 布局组件 | Table, Menu, Tabs, Breadcrumb, Steps, Pagination, Descriptions                                 |
| 数据展示 | Tree, Calendar, DatePicker, TimePicker, Image, Avatar, Rate, ColorPicker                       |
| 业务组件 | Upload, Transfer, RichTextEditor, Carousel                                                     |
| 动画组件 | Transition, TransitionGroup                                                                    |
| 其他组件 | Timeline, TimelineItem                                                                         |

## 8层架构

Lyt.js 采用精心设计的 8 层架构，从底层到上层：

```
┌─────────────────────────────────────────────────────────────┐
│ L7: 工程化工具层                                            │
│  构建工具、CLI、DevTools、测试工具                          │
├─────────────────────────────────────────────────────────────┤
│ L6: 生态系统层                                              │
│  UI 组件库、路由、状态管理、SSR、DevTools                   │
├─────────────────────────────────────────────────────────────┤
│ L5: 组件基础层                                              │
│  组件通用逻辑、通信机制、样式规范统一                        │
├─────────────────────────────────────────────────────────────┤
│ L4: 插件与适配层                                            │
│  官方插件、跨平台适配器、Web 适配                            │
├─────────────────────────────────────────────────────────────┤
│ L3: 核心运行时层                                            │
│  应用实例创建、生命周期、插件注册/卸载、依赖注入              │
├─────────────────────────────────────────────────────────────┤
│ L2: 渲染引擎层                                              │
│  Vapor 渲染器、VDOM 渲染器、组件系统                        │
├─────────────────────────────────────────────────────────────┤
│ L1: 核心原语层                                              │
│  响应式系统、虚拟 DOM、编译器                                │
├─────────────────────────────────────────────────────────────┤
│ L0: 基础工具层                                              │
│  原生 JS 工具封装、常量定义、类型判断                        │
└─────────────────────────────────────────────────────────────┘
```

### 架构约束

- **基础工具层开放**：L0 基础工具层（common-\*）可被所有上层直接依赖
- **分层合理依赖**：核心层（L1-L4）遵循分层原则，尽量减少跨层依赖，但允许必要的跨层访问
- **单向依赖**：只允许从上层依赖下层，禁止反向依赖
- **零第三方依赖**：L0-L6 层运行时无第三方依赖
- **可插拔设计**：插件层采用可插拔架构，按需引入

## 包架构

基于 8 层架构的包组织：

### L0: 基础工具层（29+ 个工具包）

| 包                     | 描述               |
| ---------------------- | ------------------ |
| `@lytjs/shared-types`  | 共享类型定义       |
| `@lytjs/host-contract` | 跨平台渲染接口定义 |
| `@lytjs/common-*`      | 29+ 个工具子包     |

**工具包列表**：common-is, common-constants, common-string, common-object, common-error, common-warn, common-events, common-scheduler, common-algorithm, common-dom, common-dom-helpers, common-performance, common-a11y, common-keyboard, common-storage, common-validate, common-http, common-raf, common-render-queue, common-event-normalizer, common-node-cache, common-async-scheduler, common-transition-engine, common-assertions, common-security, common-path, common-query, common-timing, common-cache

### L1: 核心原语层

| 包                  | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| `@lytjs/reactivity` | 响应式系统（signal, ref, reactive, computed, watch, effect） |
| `@lytjs/vdom`       | 虚拟 DOM 和 diff 算法                                        |
| `@lytjs/compiler`   | 模板编译器（SFC 编译、指令转换）                             |

### L2: 渲染引擎层

| 包                   | 描述                                |
| -------------------- | ----------------------------------- |
| `@lytjs/renderer`    | DOM/SSR 渲染器（Vapor/VDOM 双模式） |
| `@lytjs/component`   | 组件系统                            |
| `@lytjs/dom-runtime` | DOM 运行时工具                      |

### L3: 核心运行时层

| 包                   | 描述                                 |
| -------------------- | ------------------------------------ |
| `@lytjs/core`        | 核心应用 API（完整版）               |
| `@lytjs/core-vnode`  | 核心应用 API（仅 VNode 模式）        |
| `@lytjs/core-signal` | 核心应用 API（仅 Vapor/Signal 模式） |

### L4: 插件与适配层

| 包                      | 描述           |
| ----------------------- | -------------- |
| `@lytjs/plugin-theme`   | 主题插件       |
| `@lytjs/plugin-logger`  | 日志插件       |
| `@lytjs/plugin-auth`    | 权限插件       |
| `@lytjs/plugin-storage` | 存储插件       |
| `@lytjs/plugin-i18n`    | 国际化插件     |
| `@lytjs/plugin-vite`    | Vite 集成插件  |
| `@lytjs/plugin-chart`   | 图表插件       |
| `@lytjs/adapter-web`    | Web 平台适配器 |
| `@lytjs/dom`            | DOM 平台封装   |
| `@lytjs/web`            | Web 平台工具   |

### L5: 组件基础层

（已包含在 L2 渲染引擎层和 L4 插件与适配层中）

### L6: 生态系统层

| 包                        | 描述                       |
| ------------------------- | -------------------------- |
| `@lytjs/ui`               | UI 组件库（60+ 组件）      |
| `@lytjs/router`           | 路由系统                   |
| `@lytjs/store`            | 状态管理（灵感来自 Pinia） |
| `@lytjs/devtools`         | 开发者工具                 |
| `@lytjs/ssr`              | 服务端渲染                 |
| `@lytjs/platform-adapter` | 平台适配器                 |
| `@lytjs/compat`           | 兼容性层                   |

### L7: 工程化工具层

| 包                  | 描述       |
| ------------------- | ---------- |
| `@lytjs/cli`        | CLI 工具   |
| `@lytjs/test-utils` | 测试工具包 |

## 安全特性

Lyt.js 内置多层安全防护：

- **XSS 防护** - v-html 自动转义，SSR 模式安全输出
- **CSP 支持** - 严格模式检测与优雅降级
- **输入验证** - 动态属性名、事件名、组件名验证
- **递归限制** - 组件递归深度限制（最大 100 层）
- **错误边界** - 完善的错误捕获与恢复机制

## 开发

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 构建所有包
pnpm build

# 构建核心包
pnpm build:core

# 构建生态系统包
pnpm build:ecosystem

# 构建插件
pnpm build:plugins

# 构建工具包
pnpm build:tools

# 运行所有测试
pnpm test

# 类型检查
pnpm type-check

# 代码质量检查
pnpm lint:check

# 零依赖规范校验
pnpm run check-zero-deps

# 循环依赖检查
pnpm run check-circular

# 包体积检查
pnpm run size-check

# 基准测试
pnpm bench
```

### 项目结构

```
lytjs/
├── packages/
│   ├── _templates/          # 新包模板
│   ├── common/              # L0 基础工具层
│   │   └── packages/        # 29+ 个工具子包
│   ├── shared-types/        # L0 基础工具层 - 共享类型定义
│   ├── host-contract/       # L0 基础工具层 - 跨平台渲染接口
│   ├── reactivity/          # L1 核心原语层 - 响应式系统
│   ├── vdom/                # L1 核心原语层 - 虚拟 DOM
│   ├── compiler/            # L1 核心原语层 - 模板编译器
│   ├── renderer/            # L2 渲染引擎层 - 渲染器
│   ├── component/           # L2 渲染引擎层 - 组件系统
│   ├── dom-runtime/         # L2 渲染引擎层 - DOM 运行时工具
│   ├── core/                # L3 核心运行时层 - 完整版
│   ├── core-signal/         # L3 核心运行时层 - 仅 Vapor 模式
│   ├── core-vnode/          # L3 核心运行时层 - 仅 VNode 模式
│   ├── plugins/             # L4 插件与适配层
│   │   └── packages/
│   │       ├── plugin-theme/
│   │       ├── plugin-logger/
│   │       ├── plugin-auth/
│   │       ├── plugin-storage/
│   │       ├── plugin-i18n/
│   │       ├── plugin-vite/
│   │       └── plugin-chart/
│   ├── adapter-web/         # L4 插件与适配层 - Web 适配器
│   ├── dom/                 # L4 插件与适配层 - DOM 平台封装
│   ├── web/                 # L4 插件与适配层 - Web 平台工具
│   ├── ecosystem/           # L6 生态系统层
│   │   └── packages/
│   │       ├── ui/          # UI 组件库（60+ 组件）
│   │       ├── router/      # 路由
│   │       ├── store/       # 状态管理
│   │       ├── devtools/    # 开发者工具
│   │       ├── ssr/         # 服务端渲染
│   │       ├── platform-adapter/  # 平台适配器
│   │       └── compat/       # 兼容性层
│   └── tools/               # L7 工程化工具层
│       └── packages/
│           ├── cli/         # CLI 工具
│           └── test-utils/  # 测试工具
├── playground/              # 开发调试
├── benchmarks/              # 基准测试
├── docs/                    # 文档
├── examples/                # 示例项目
└── scripts/                 # 工程化脚本
```

### 开发文档

- [AGENTS.md](./AGENTS.md) - AI 开发助手规则与最佳实践
- [AI IDE 开发规则](./docs/development/AI_IDE_RULES.md) - AI IDE 开发规则
- [中文文档指南](./docs/development/CHINESE_DOCS_GUIDE.md) - 中文文档指南
- [开发路线图](./docs/development/ROADMAP_NEXT_STEPS.md) - 开发路线图
- [项目结构说明](./docs/development/PROJECT_STRUCTURE.md) - 项目结构说明
- [插件开发指南](./docs/development/PLUGIN_DEVELOPMENT.md) - 插件开发指南
- [架构设计文档](./docs/development/ARCHITECTURE.md) - 架构设计文档

## 版本历史

### v6.5.0（最新版本）

- 📦 **新增核心增强包**
  - @lytjs/plugin-data - 增强版数据获取插件
  - @lytjs/plugin-validation - 验证插件
  - @lytjs/router-fs - 文件系统路由引擎
  - @lytjs/api - API 路由引擎
- 🛠️ **新增构建与静态化包**
  - @lytjs/bundler - 构建工具集成
  - @lytjs/hmr - 热模块替换
  - 完整的 SSG/ISR 支持（已包含在 @lytjs/ssr）
- 🌍 **生态系统完善**
  - @lytjs/runtime-edge - 边缘运行时支持
  - 所有现有插件版本升级至 v6.5.0
- ⚡ **性能优化**
  - Tree-shaking 优化
  - 统一 tsup 构建配置
- 📝 **文档完善**
  - 完整的发布说明
  - 所有新包的 README

### v6.4.0

- 全新 8 层模块化架构
- 双渲染模式（Vapor + VDOM）
- 60+ UI 组件
- 29+ 基础工具包
- 7 个官方插件
- 完整的 TypeScript 类型支持
- 内置安全防护

## 许可证

MIT
