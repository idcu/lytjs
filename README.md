# Lyt.js

> 轻量级、高性能的响应式前端框架

## 特性

- **高性能响应式系统** - 基于 Proxy 的细粒度依赖追踪
- **精确的 VDOM diff 算法** - PatchFlags 和 Block Tree 编译时优化
- **双核心模式** - VNode 模式与 Signal 模式可选
- **8层模块化架构** - 分层设计，按需引入
- **TypeScript 全类型支持** - 完整的类型推导
- **安全优先** - 内置 XSS 防护、CSP 支持、输入验证
- **跨平台渲染** - 统一的 Host Contract 接口
- **运行时零第三方依赖** - 完全自研实现，极致轻量
- **可插拔官方插件** - 主题、日志、国际化等官方插件

## 快速开始

```bash
npm install @lytjs/core
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

| 包名 | 描述 |
| --- | --- |
| `@lytjs/core` | 完整核心，支持 VNode 和 Signal 双模式 |
| `@lytjs/core-vnode` | 仅 VNode 渲染模式，适合传统模板场景 |
| `@lytjs/core-signal` | 仅 Signal 渲染模式，适合细粒度响应场景 |

## 官方插件

基于 8 层架构的可插拔插件体系，所有插件均为运行时零依赖：

| 插件名 | 描述 |
| --- | --- |
| `@lytjs/plugin-theme` | 主题切换、主题定制、CSS变量管理 |
| `@lytjs/plugin-logger` | 日志分级、性能追踪、持久化存储 |
| `@lytjs/plugin-auth` | 权限路由、权限验证、角色管理 |
| `@lytjs/plugin-storage` | 本地存储、状态持久化、过期时间 |
| `@lytjs/plugin-i18n` | 国际化支持、语言切换、翻译管理 |
| `@lytjs/plugin-vite` | Vite 集成、热更新、构建优化 |

## UI 组件库

Lyt.js 提供完整的零依赖 UI 组件库，包括：

| 组件类别 | 组件名称 |
| --- | --- |
| 高优先级 | Table, Tree, Cascader, TreeSelect, Transfer, Menu, Tabs, Descriptions |
| 中优先级 | Modal, Drawer, Upload, DatePicker, Notification |
| 低优先级 | Calendar, Image, Rate, ColorPicker |
| 基础组件 | Button, Input, Icon, Badge, Tag, Spin, Empty, Link, Container, Divider |
| 反馈组件 | Dialog, Toast, Alert, Tooltip |
| 表单组件 | Form, Select, Checkbox, Radio, Switch, InputNumber |
| 其他组件 | Transition, TransitionGroup |

## 8层架构

Lyt.js 采用精心设计的 8 层架构，从底层到上层：

```
┌─────────────────────────────────────────────────────────────┐
│  L7: 工程化工具层                                            │
│  构建、打包、测试、lint、零依赖规范校验                       │
├─────────────────────────────────────────────────────────────┤
│  L6: 业务组件层                                              │
│  UI 组件库（基础组件、高级组件）                              │
├─────────────────────────────────────────────────────────────┤
│  L5: 组件基础层                                              │
│  组件通用逻辑、通信机制、样式规范统一                        │
├─────────────────────────────────────────────────────────────┤
│  L4: 官方插件层                                              │
│  主题、国际化、日志、权限、存储等内置插件                    │
├─────────────────────────────────────────────────────────────┤
│  L3: 插件核心层                                              │
│  插件规范定义、插件生命周期管理、插件依赖解析                │
├─────────────────────────────────────────────────────────────┤
│  L2: 核心运行时层                                            │
│  应用实例创建、生命周期、插件注册/卸载、依赖注入            │
├─────────────────────────────────────────────────────────────┤
│  L1: 渲染引擎层                                              │
│  Vapor无虚拟DOM渲染、指令解析与执行、虚拟DOM diff            │
├─────────────────────────────────────────────────────────────┤
│  L0: 基础工具层                                              │
│  原生JS工具封装、常量定义、类型判断                          │
└─────────────────────────────────────────────────────────────┘
```

### 架构约束

- **基础工具层开放**：L0 基础工具层（common-*）可被所有上层直接依赖
- **分层合理依赖**：核心层（L1-L4）遵循分层原则，尽量减少跨层依赖，但允许必要的跨层访问
- **单向依赖**：只允许从上层依赖下层，禁止反向依赖
- **零第三方依赖**：L0-L6 层运行时无第三方依赖
- **可插拔设计**：插件层采用可插拔架构，按需引入

## 包架构

基于 8 层架构的包组织：

### L0: 基础工具层

| 包 | 描述 |
| --- | --- |
| `@lytjs/shared-types` | 共享类型定义 |
| `@lytjs/host-contract` | 跨平台渲染接口定义 |
| `@lytjs/common-*` | 30 个工具子包（constants, is, string, error 等） |

### L1: 渲染引擎层

| 包 | 描述 |
| --- | --- |
| `@lytjs/reactivity` | 响应式系统（ref, reactive, computed, watch） |
| `@lytjs/vdom` | 虚拟 DOM 和 diff 算法 |
| `@lytjs/compiler` | 模板编译器 |
| `@lytjs/renderer` | DOM/SSR 渲染器 |

### L2: 核心运行时层

| 包 | 描述 |
| --- | --- |
| `@lytjs/core` | 核心应用 API（完整版） |
| `@lytjs/core-vnode` | 核心应用 API（仅 VNode 模式） |
| `@lytjs/core-signal` | 核心应用 API（仅 Signal 模式） |

### L3: 插件核心层

| 包 | 描述 |
| --- | --- |
| `@lytjs/plugin-sdk` | 插件开发 SDK |

### L4: 官方插件层

| 包 | 描述 |
| --- | --- |
| `@lytjs/plugin-theme` | 主题插件 |
| `@lytjs/plugin-logger` | 日志插件 |
| `@lytjs/plugin-auth` | 权限插件 |
| `@lytjs/plugin-storage` | 存储插件 |
| `@lytjs/plugin-i18n` | 国际化插件 |
| `@lytjs/plugin-vite` | Vite 集成插件 |

### L5: 组件基础层

| 包 | 描述 |
| --- | --- |
| `@lytjs/component` | 组件系统 |
| `@lytjs/dom` | DOM 平台封装 |
| `@lytjs/dom-runtime` | DOM 运行时工具 |
| `@lytjs/web` | Web 平台工具 |

### L6: 业务组件层

| 包 | 描述 |
| --- | --- |
| `@lytjs/ui` | UI 组件库 |
| `@lytjs/router` | 路由 |
| `@lytjs/store` | 状态管理 |
| `@lytjs/devtools` | 开发者工具 |
| `@lytjs/ssr` | SSR |
| `@lytjs/platform-adapter` | 平台适配器 |

### L7: 工程化工具层

| 包 | 描述 |
| --- | --- |
| `@lytjs/tools` | 工程化工具集 |
| `@lytjs/cli` | CLI 工具 |

## 安全特性

Lyt.js 内置多层安全防护：

- **XSS 防护** - v-html 自动转义，SSR 模式安全输出
- **CSP 支持** - 严格模式检测与优雅降级
- **输入验证** - 动态属性名、事件名、组件名验证
- **递归限制** - 组件递归深度限制（最大 100 层）
- **错误边界** - 完善的错误捕获与恢复机制

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 构建所有包
pnpm build

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
```

### 项目结构

```
lytjs/
├── packages/
│   ├── _templates/          # 新包模板
│   ├── common/              # L0 基础工具层
│   │   └── packages/        # 30+ 个工具子包
│   ├── shared-types/        # L0 基础工具层 - 共享类型定义
│   ├── host-contract/       # L0 基础工具层 - 跨平台渲染接口
│   ├── reactivity/          # L1 渲染引擎层 - 响应式系统
│   ├── vdom/                # L1 渲染引擎层 - 虚拟 DOM
│   ├── compiler/            # L1 渲染引擎层 - 模板编译器
│   ├── renderer/            # L1 渲染引擎层 - 渲染器
│   ├── core/                # L2 核心运行时层 - 完整版
│   ├── core-signal/         # L2 核心运行时层 - 仅 Signal 模式
│   ├── core-vnode/          # L2 核心运行时层 - 仅 VNode 模式
│   ├── component/           # L5 组件基础层 - 组件系统
│   ├── dom/                 # L5 组件基础层 - DOM 平台封装
│   ├── dom-runtime/         # L5 组件基础层 - DOM 运行时工具
│   ├── adapter-web/         # L5 组件基础层 - Web 适配器
│   ├── plugins/             # L3/L4 插件层
│   │   └── packages/
│   │       ├── plugin-theme/
│   │       ├── plugin-logger/
│   │       ├── plugin-auth/
│   │       ├── plugin-storage/
│   │       ├── plugin-i18n/
│   │       └── plugin-vite/
│   ├── ecosystem/           # L6 业务组件层
│   │   └── packages/
│   │       ├── ui/          # UI 组件库
│   │       ├── router/      # 路由
│   │       ├── store/       # 状态管理
│   │       ├── devtools/    # 开发者工具
│   │       ├── ssr/         # SSR
│   │       ├── platform-adapter/  # 平台适配器
│   │       └── compat/      # 兼容性层
│   └── tools/               # L7 工程化工具层
│       └── packages/
│           ├── cli/         # CLI 工具
│           └── devtools/    # 开发者工具扩展
├── examples/                # 示例项目
├── playground/              # 开发调试
├── docs/                    # 文档
└── scripts/                 # 工程化脚本
```

### 开发文档

- [AGENTS.md](./AGENTS.md) - AI 开发助手规则与最佳实践
- [AI_IDE_RULES.md](./docs/development/AI_IDE_RULES.md) - AI IDE 开发规则
- [CHINESE_DOCS_GUIDE.md](./docs/development/CHINESE_DOCS_GUIDE.md) - 中文文档指南
- [ROADMAP_NEXT_STEPS.md](./docs/development/ROADMAP_NEXT_STEPS.md) - 开发路线图
- [PROJECT_STRUCTURE.md](./docs/development/PROJECT_STRUCTURE.md) - 项目结构说明
- [PLUGIN_DEVELOPMENT.md](./docs/development/PLUGIN_DEVELOPMENT.md) - 插件开发指南

## 版本迭代里程碑

### ✅ 已完成

- **M1 里程碑** - 完成 8 层架构各层核心能力完善与联调
- **M2 里程碑** - 完成高优先级 8 个组件开发与测试
- **M3 里程碑** - 完成中优先级 5 个组件开发与测试
- **M4 里程碑** - 完成低优先级 4 个组件开发，完善工程化工具链

### 🚀 进行中

- **M5 里程碑** - 长期维护与生态建设

## 许可证

MIT
