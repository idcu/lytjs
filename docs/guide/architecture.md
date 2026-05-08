# 架构设计

LytJS 采用 L0-L5 六层架构设计，每层职责明确，包之间通过清晰的依赖关系组织。

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│  L5: Web 工具层                                              │
│  web (CSS 变量、ResizeObserver、Web Components)             │
├─────────────────────────────────────────────────────────────┤
│  L4: 核心应用层                                              │
│  core, core-vnode, core-signal, renderer                    │
├─────────────────────────────────────────────────────────────┤
│  L3: 平台适配层                                              │
│  adapter-web                                                 │
├─────────────────────────────────────────────────────────────┤
│  L2: 平台/组件层                                             │
│  component, dom, dom-runtime                                 │
├─────────────────────────────────────────────────────────────┤
│  L1: 核心原语层                                              │
│  reactivity, vdom, compiler                                 │
├─────────────────────────────────────────────────────────────┤
│  L0: 基础层                                                  │
│  common-* (30个子包), shared-types, host-contract           │
└─────────────────────────────────────────────────────────────┘
```

## L0: 基础层

基础层提供框架运行所需的最底层工具和类型定义，不依赖任何其他 LytJS 包。

| 包 | 描述 |
| --- | --- |
| `@lytjs/shared-types` | 共享类型定义（VNode、组件、渲染器、App 上下文等） |
| `@lytjs/host-contract` | 跨平台渲染接口定义（Host Contract） |
| `@lytjs/common-*` | 30 个工具子包（见下方列表） |

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

## L2: 平台/组件层

平台/组件层提供组件系统和平台相关的运行时支持。

| 包 | 描述 |
| --- | --- |
| `@lytjs/component` | 组件系统（组件实例管理、Props/Emits/Slots、生命周期、内置组件） |
| `@lytjs/dom-runtime` | DOM 运行时工具（Signal 模式下的 DOM 操作 API） |
| `@lytjs/dom` | DOM 平台封装（Web Components 支持） |

### 依赖关系

```
component → reactivity, vdom, common-*
dom-runtime → common-*
dom → common-*
```

## L3: 平台适配层

平台适配层提供特定平台的适配器实现，将核心层与平台层解耦。

| 包 | 描述 |
| --- | --- |
| `@lytjs/adapter-web` | Web 平台适配器（DOM 渲染器、事件包装、属性补丁、水合支持） |

### 依赖关系

```
adapter-web → host-contract, dom-runtime, common-*
```

## L4: 核心应用层

核心应用层提供面向开发者的应用 API，包括三种核心入口包和渲染器。

| 包 | 描述 |
| --- | --- |
| `@lytjs/core` | 核心应用 API（完整版，VNode + Signal 双模式） |
| `@lytjs/core-vnode` | 核心应用 API（仅 VNode 模式） |
| `@lytjs/core-signal` | 核心应用 API（仅 Signal 模式） |
| `@lytjs/renderer` | DOM/SSR/Signal 渲染器，Island Architecture 支持 |

### 依赖关系

```
core → reactivity, vdom, compiler, component, renderer, common-*
core-vnode → reactivity, vdom, compiler, component, renderer, common-*
core-signal → reactivity, compiler, component, renderer, common-*
renderer → vdom, component, adapter-web, common-*
```

## L5: Web 工具层

Web 工具层提供浏览器平台的高级工具。

| 包 | 描述 |
| --- | --- |
| `@lytjs/web` | Web 平台工具（CSS 变量、ResizeObserver、Web Components） |

### 依赖关系

```
web → common-*
```

## 包依赖关系图

```
                    ┌──────────┐
                    │   web    │  L5
                    └────┬─────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───┴────┐    ┌──────────┴──────────┐    ┌────┴─────┐
│  core  │    │ core-vnode / signal │    │ renderer │  L4
└───┬────┘    └──────────┬──────────┘    └────┬─────┘
    │                    │                    │
    │              ┌─────┴─────┐              │
    │              │ component │              │  L2
    │              └─────┬─────┘              │
    │                    │                    │
    │              ┌─────┴─────┐       ┌──────┴──────┐
    │              │ dom-runtime│       │ adapter-web │  L3
    │              └───────────┘       └─────────────┘
    │                                        │
    │         ┌──────────────────────────────┘
    │         │
    │  ┌──────┴──────┐
    │  │host-contract │
    │  └─────────────┘
    │
    ├── reactivity ──────┐
    ├── vdom ────────────┤  L1
    ├── compiler ────────┤
    └── dom ─────────────┘
              │
    ┌─────────┴─────────┐
    │   common-* (30)   │  L0
    │   shared-types    │
    └───────────────────┘
```

## 设计原则

1. **单向依赖** - 上层依赖下层，同层包之间尽量减少直接依赖
2. **按需引入** - 每个包独立可发布，开发者只需安装所需的包
3. **Tree-shaking 友好** - 所有包使用 ES Module，支持构建工具的 tree shaking
4. **类型安全** - 共享类型定义集中在 `@lytjs/shared-types`，确保跨包类型一致
5. **平台无关** - 通过 Host Contract 接口实现跨平台渲染，核心层不直接依赖 DOM API
