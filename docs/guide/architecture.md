# 架构设计

LytJS 采用 8 层架构设计，从底层到上层分别为 L0-L7，每层职责明确，包之间通过清晰的依赖关系组织。

> 注意：这是高级主题，新手可以先跳过，学习[基础概念](../tutorial/basics)后再阅读。

## 架构总览

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

## L0: 基础工具层

基础层提供框架运行所需的最底层工具和类型定义，不依赖任何其他 LytJS 包。

| 包 | 描述 |
| --- | --- |
| `@lytjs/shared-types` | 共享类型定义（VNode、组件、渲染器、App 上下文等） |
| `@lytjs/host-contract` | 跨平台渲染接口定义（Host Contract） |
| `@lytjs/common-*` | 30 个工具子包 |

### common-* 子包列表

| 子包 | 描述 |
| --- | --- |
| `@lytjs/common-common` | 通用工具函数 |
| `@lytjs/common-constants` | 框架常量 |
| `@lytjs/common-is` | 类型判断工具 |
| `@lytjs/common-string` | 字符串操作工具 |
| `@lytjs/common-object` | 对象操作工具 |
| `@lytjs/common-error` | 错误处理工具 |
| `@lytjs/common-events` | 事件系统工具 |
| `@lytjs/common-dom` | DOM 相关工具 |
| `@lytjs/common-dom-helpers` | DOM 辅助函数 |
| `@lytjs/common-cache` | 缓存工具 |
| `@lytjs/common-node-cache` | 节点缓存 |
| `@lytjs/common-vnode` | VNode 相关工具 |
| `@lytjs/common-env` | 环境检测 |
| `@lytjs/common-path` | 路径处理 |
| `@lytjs/common-query` | DOM 查询工具 |
| `@lytjs/common-a11y` | 无障碍工具 |
| `@lytjs/common-algorithm` | 算法工具 |
| `@lytjs/common-async-scheduler` | 异步调度器 |
| `@lytjs/common-scheduler` | 调度器 |
| `@lytjs/common-render-queue` | 渲染队列 |
| `@lytjs/common-performance` | 性能工具 |
| `@lytjs/common-timing` | 计时工具 |
| `@lytjs/common-raf` | requestAnimationFrame 封装 |
| `@lytjs/common-keyboard` | 键盘事件工具 |
| `@lytjs/common-security` | 安全工具 |
| `@lytjs/common-storage` | 存储工具 |
| `@lytjs/common-validate` | 验证工具 |
| `@lytjs/common-http` | HTTP 工具 |
| `@lytjs/common-event-normalizer` | 事件规范化 |
| `@lytjs/common-transition-engine` | 过渡动画引擎 |

## L1: 核心原语层

核心原语层提供框架的三大核心能力：响应式系统、虚拟 DOM 和模板编译器。

| 包 | 描述 |
| --- | --- |
| `@lytjs/reactivity` | 响应式系统（ref、reactive、computed、watch、signal 等） |
| `@lytjs/vdom` | 虚拟 DOM 和 diff 算法（VNode、PatchFlags、Block Tree） |
| `@lytjs/compiler` | 模板编译器（支持 VNode/Signal/SSR 三种代码生成模式） |

### 依赖关系

```
reactivity → common-*
vdom → common-*
compiler → common-*
```

## L2: 渲染引擎层

渲染引擎层提供组件系统和渲染能力。

| 包 | 描述 |
| --- | --- |
| `@lytjs/component` | 组件系统（组件实例管理、Props/Emits/Slots、生命周期、内置组件） |
| `@lytjs/dom-runtime` | DOM 运行时工具（Signal 模式下的 DOM 操作 API） |
| `@lytjs/dom` | DOM 平台封装（Web Components 支持） |
| `@lytjs/renderer` | DOM/SSR/Signal 渲染器，Island Architecture 支持 |

### 依赖关系

```
component → reactivity, vdom, common-*
dom-runtime → common-*
dom → common-*
renderer → vdom, component, adapter-web, common-*
```

## L3: 核心运行时层

核心运行时层提供面向开发者的应用 API。

| 包 | 描述 |
| --- | --- |
| `@lytjs/core` | 核心应用 API（完整版，VNode + Signal 双模式） |
| `@lytjs/core-vnode` | 核心应用 API（仅 VNode 模式） |
| `@lytjs/core-signal` | 核心应用 API（仅 Signal 模式） |

### 依赖关系

```
core → reactivity, vdom, compiler, component, renderer, common-*
core-vnode → reactivity, vdom, compiler, component, renderer, common-*
core-signal → reactivity, compiler, component, renderer, common-*
```

## L4: 插件与适配层

插件与适配层提供官方插件和跨平台支持。

| 包 | 描述 |
| --- | --- |
| `@lytjs/adapter-web` | Web 平台适配器（DOM 渲染器、事件包装、属性补丁、水合支持） |
| `@lytjs/web` | Web 平台工具（CSS 变量、ResizeObserver、Web Components） |
| `@lytjs/plugin-*` | 官方插件（theme、logger、auth、storage、i18n、vite） |

### 依赖关系

```
adapter-web → host-contract, dom-runtime, common-*
web → common-*
plugins → core, common-*
```

## L5: 组件基础层

组件基础层提供业务组件开发的基础设施。

| 功能 | 描述 |
| --- | --- |
| 统一组件 API | 标准化的组件定义和使用方式 |
| 组件通信机制 | Props、Events、Provide/Inject |
| 样式规范定义 | 主题系统、CSS 变量 |

## L6: 生态系统层

生态系统层提供完整的业务解决方案（允许引入第三方依赖）。

| 包 | 描述 |
| --- | --- |
| `@lytjs/ui` | UI 组件库（30+ 组件） |
| `@lytjs/router` | 路由系统 |
| `@lytjs/store` | 状态管理 |
| `@lytjs/ssr` | 服务端渲染 |
| `@lytjs/devtools` | 开发者工具 |

## L7: 工程化工具层

工程化工具层提供开发和构建时的工具（允许引入第三方依赖）。

| 包 | 描述 |
| --- | --- |
| `@lytjs/cli` | 命令行工具 |
| `@lytjs/test-utils` | 测试工具 |
| `@lytjs/devtools-extension` | DevTools 浏览器扩展 |

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
2. **核心层合理依赖**：L1-L4 尽量减少跨层，但允许必要的跨层
3. **零依赖边界**：L0-L6 运行时代码禁止第三方依赖
4. **L7 例外**：L7 工程化工具可以引入第三方依赖

## 设计原则

1. **单向依赖** - 上层依赖下层，同层包之间尽量减少直接依赖
2. **按需引入** - 每个包独立可发布，开发者只需安装所需的包
3. **Tree-shaking 友好** - 所有包使用 ES Module，支持构建工具的 tree shaking
4. **类型安全** - 共享类型定义集中在 `@lytjs/shared-types`，确保跨包类型一致
5. **平台无关** - 通过 Host Contract 接口实现跨平台渲染，核心层不直接依赖 DOM API
