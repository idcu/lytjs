# 架构设计

LytJS 采用 8 层架构设计，从底层到上层分别为 L0-L7。本文档依据 **当前仓库实际代码** 梳理，覆盖全部 89 个已发布包（版本统一为 v6.9.6）。

> 注意：这是高级主题，新手可以先跳过，学习[新手入门](../getting-started/index.md)后再阅读。

## 架构总览

```
┌──────────────────────────────────────────────────────────┐
│ L7: 工程化工具层（3 包）                                   │
│  cli · test-utils · devtools-extension                   │
├──────────────────────────────────────────────────────────┤
│ L6: 生态系统层（25 包，允许第三方依赖）                    │
│  定能力 config/di/plugin/ui · store/devtools/bundler ·    │
│  SSR×6 · Web 框架×9                                       │
├──────────────────────────────────────────────────────────┤
│ L5: 组件基础层（逻辑层，封装于 @lytjs/component）           │
│  统一组件 API · 通信机制 · 样式规范                       │
├──────────────────────────────────────────────────────────┤
│ L4: 插件与适配层（13 包）                                  │
│  plugin-* ×13（animation/auth/chart/data/i18n/form/…）    │
├──────────────────────────────────────────────────────────┤
│ L3: 核心运行时层（3 包）★ 核心聚焦                         │
│  core（双模式）· core-vnode · core-signal                 │
├──────────────────────────────────────────────────────────┤
│ L2: 渲染引擎层（6 包）                                     │
│  component · renderer · dom-runtime · dom · web ·         │
│  adapter-web                                              │
├──────────────────────────────────────────────────────────┤
│ L1: 核心原语层（3 包）                                     │
│  reactivity · vdom · compiler                            │
├──────────────────────────────────────────────────────────┤
│ L0: 基础工具层（36 包，零第三方依赖）                      │
│  shared-types · host-contract · @lytjs/common ·           │
│  common-* ×33                                             │
└──────────────────────────────────────────────────────────┘
      合计：36 + 3 + 6 + 3 + 13 + 25 + 3 = 89 包
      依赖方向：上层依赖下层（L7 → L6 → … → L0）
```

## L0: 基础工具层（36 包）

基础层提供框架运行所需的最底层工具和类型定义。

| 包                     | 描述                                              |
| ---------------------- | ------------------------------------------------- |
| `@lytjs/shared-types`  | 共享类型定义（VNode、组件、渲染器、App 上下文等） |
| `@lytjs/host-contract` | 跨平台渲染接口定义（Host Contract）               |
| `@lytjs/common`        | common-\* 聚合包（转发 28 个子包导出）            |
| `@lytjs/common-*`      | 33 个工具子包                                     |

### common-\* 子包列表（33 个）

| 子包                              | 描述                       |
| --------------------------------- | -------------------------- |
| `@lytjs/common-constants`         | 框架常量                   |
| `@lytjs/common-is`                | 类型判断工具               |
| `@lytjs/common-string`            | 字符串操作工具             |
| `@lytjs/common-object`            | 对象操作工具               |
| `@lytjs/common-error`             | 错误处理工具               |
| `@lytjs/common-events`            | 事件系统工具               |
| `@lytjs/common-dom`               | DOM 相关工具               |
| `@lytjs/common-dom-helpers`       | DOM 辅助函数               |
| `@lytjs/common-cache`             | 缓存工具                   |
| `@lytjs/common-node-cache`        | 节点缓存                   |
| `@lytjs/common-vnode`             | VNode 相关工具             |
| `@lytjs/common-env`               | 环境检测                   |
| `@lytjs/common-path`              | 路径处理                   |
| `@lytjs/common-query`             | DOM 查询工具               |
| `@lytjs/common-a11y`              | 无障碍工具                 |
| `@lytjs/common-algorithm`         | 算法工具                   |
| `@lytjs/common-assertions`        | 断言工具                   |
| `@lytjs/common-async-scheduler`   | 异步调度器                 |
| `@lytjs/common-scheduler`         | 调度器                     |
| `@lytjs/common-render-queue`      | 渲染队列                   |
| `@lytjs/common-performance`       | 性能工具                   |
| `@lytjs/common-timing`            | 计时工具                   |
| `@lytjs/common-raf`               | requestAnimationFrame 封装 |
| `@lytjs/common-keyboard`          | 键盘事件工具               |
| `@lytjs/common-security`          | 安全工具                   |
| `@lytjs/common-storage`           | 存储工具                   |
| `@lytjs/common-validate`          | 验证工具                   |
| `@lytjs/common-http`              | HTTP 工具                  |
| `@lytjs/common-event-normalizer`  | 事件规范化                 |
| `@lytjs/common-transition-engine` | 过渡动画引擎               |
| `@lytjs/common-memory`            | 内存工具                   |
| `@lytjs/common-rate-limit`        | 限流工具                   |
| `@lytjs/common-warn`              | 警告消息工具               |

## L1: 核心原语层（3 包）

| 包                  | 描述                                                    |
| ------------------- | ------------------------------------------------------- |
| `@lytjs/reactivity` | 响应式系统（ref、reactive、computed、watch、signal 等） |
| `@lytjs/vdom`       | 虚拟 DOM 和 diff 算法（VNode、PatchFlags、Block Tree）  |
| `@lytjs/compiler`   | 模板编译器（支持 VNode/Signal/SSR 三种代码生成模式）    |

### 依赖关系

```
reactivity → common-*
vdom → reactivity, common-*
compiler → common-*
```

## L2: 渲染引擎层（6 包）

| 包                   | 描述                                                            |
| -------------------- | --------------------------------------------------------------- |
| `@lytjs/component`   | 组件系统（组件实例管理、Props/Emits/Slots、生命周期、内置组件） |
| `@lytjs/renderer`    | DOM/SSR/Signal 渲染器，Island Architecture 支持                 |
| `@lytjs/dom-runtime` | DOM 运行时工具（Signal 模式下的 DOM 操作 API）                  |
| `@lytjs/dom`         | DOM 平台封装（Web Components 支持）                             |
| `@lytjs/web`         | Web 平台工具（CSS 变量、ResizeObserver 等）                     |
| `@lytjs/adapter-web` | Web 平台适配器（DOM 渲染器、事件包装、属性补丁、水合支持）      |

### 依赖关系

```
component → reactivity, vdom, common-*
renderer → reactivity, vdom, compiler, component, adapter-web, common-*
dom-runtime → reactivity
dom → common-*
web → （无框架依赖）
adapter-web → vdom, reactivity, host-contract, common-*
```

## L3: 核心运行时层（3 包）

| 包                   | 描述                                          |
| -------------------- | --------------------------------------------- |
| `@lytjs/core`        | 核心应用 API（完整版，VNode + Signal 双模式） |
| `@lytjs/core-vnode`  | 核心应用 API（仅 VNode 模式）                 |
| `@lytjs/core-signal` | 核心应用 API（仅 Signal 模式）                |

### 依赖关系

```
core → config, plugin, reactivity, vdom, compiler, component, renderer, common-*
core-vnode → reactivity, vdom, compiler, component, renderer, common-*
core-signal → reactivity, compiler, component, renderer, common-*
```

## L4: 插件与适配层

| 包                   | 描述                                                         |
| -------------------- | ------------------------------------------------------------ |
| `@lytjs/plugin-*`    | 13 个官方插件（见下表）                                      |
| `@lytjs/adapter-web` | Web 平台适配器（在 L2 已列，此处按适配职责归类，不重复计数） |

> 说明：`@lytjs/adapter-web` 依赖层次介于 L1-L2，本清单按目录归类于 L2。

### 官方插件列表（13 个）

| 子包                       | 描述      |
| -------------------------- | --------- |
| `@lytjs/plugin-animation`  | 动画      |
| `@lytjs/plugin-auth`       | 认证授权  |
| `@lytjs/plugin-chart`      | 图表      |
| `@lytjs/plugin-data`       | 数据      |
| `@lytjs/plugin-data-fetch` | 数据获取  |
| `@lytjs/plugin-form`       | 表单      |
| `@lytjs/plugin-i18n`       | 国际化    |
| `@lytjs/plugin-logger`     | 日志      |
| `@lytjs/plugin-storage`    | 本地存储  |
| `@lytjs/plugin-testing`    | 测试      |
| `@lytjs/plugin-theme`      | 主题      |
| `@lytjs/plugin-validation` | 验证      |
| `@lytjs/plugin-vite`       | Vite 集成 |

## L5: 组件基础层

组件基础层提供业务组件开发的基础设施（逻辑主要位于 `@lytjs/component` 内）。

| 功能         | 描述                          |
| ------------ | ----------------------------- |
| 统一组件 API | 标准化的组件定义和使用方式    |
| 组件通信机制 | Props、Events、Provide/Inject |
| 样式规范定义 | 主题系统、CSS 变量            |

## L6: 生态系统层（25 包）

生态系统层提供完整的业务解决方案（允许引入第三方依赖）。可细分四组：

### 基础能力（4 包）

| 包              | 描述                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| `@lytjs/config` | 通用配置系统（ConfigManager/Schema/Validator/Transformer，零框架依赖） |
| `@lytjs/di`     | 依赖注入系统                                                           |
| `@lytjs/plugin` | 通用插件系统核心（PluginRegistry/生命周期事件/版本管理，零框架依赖）   |
| `@lytjs/ui`     | UI 组件库（60+ 组件）                                                  |

### 业务状态与工具（6 包）

| 包                        | 描述                     |
| ------------------------- | ------------------------ |
| `@lytjs/store`            | 状态管理                 |
| `@lytjs/devtools`         | 开发者工具               |
| `@lytjs/bundler`          | 构建工具集成             |
| `@lytjs/runtime-edge`     | 边缘运行时支持           |
| `@lytjs/compat`           | 兼容性层（占位，计划中） |
| `@lytjs/platform-adapter` | 平台适配器               |

### SSR 套件（6 包，`ecosystem/packages/ssr-kit/packages/`）

| 包                     | 描述         |
| ---------------------- | ------------ |
| `@lytjs/ssr`           | 服务端渲染   |
| `@lytjs/ssg`           | 静态站点生成 |
| `@lytjs/html-renderer` | HTML 渲染器  |
| `@lytjs/hmr`           | 热模块替换   |
| `@lytjs/cache`         | 缓存         |
| `@lytjs/cache-isr`     | ISR 增量缓存 |

### Web 框架体系（9 包，`ecosystem/packages/web-framework/packages/`）

| 包                             | 描述                   |
| ------------------------------ | ---------------------- |
| `@lytjs/router`                | 路由系统               |
| `@lytjs/router-fs`             | 文件系统路由引擎       |
| `@lytjs/middleware`            | 中间件核心（洋葱模型） |
| `@lytjs/middleware-auth`       | 认证中间件             |
| `@lytjs/middleware-cors`       | CORS 中间件            |
| `@lytjs/middleware-rate-limit` | 限流中间件             |
| `@lytjs/api`                   | API 路由引擎           |
| `@lytjs/http-server`           | HTTP 服务器            |
| `@lytjs/metadata`              | 元数据                 |

## L7: 工程化工具层（3 包）

| 包                          | 描述                |
| --------------------------- | ------------------- |
| `@lytjs/cli`                | 命令行工具          |
| `@lytjs/test-utils`         | 测试工具            |
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

### 核心依赖流向

下图展示核心链路的实际 `@lytjs/*` 依赖（箭头指向被依赖方，即"被依赖方在上、依赖方引用之"）。线条分组对应三层调用：

```
共同底座（零依赖）
┌────────┐   ┌────────┐   ┌────────┐
│ common │   │shared- │   │ host-  │
│  -×33  │   │ types  │   │contract│
└────────┘   └────────┘   └────────┘
    │            │            │
    ▼            ▼            ▼
核心原语
┌────────┐   ┌────────┐   ┌────────┐
│react- │   │  vdom  │   │compiler│
│ivity │◀───┼────────┼──▶│        │
└────────┘   └────────┘   └────────┘
    │            │            │
    ▼            ▼            ▼
渲染引擎
┌────────┐   ┌────────┐   ┌────────┐
│component│←─│renderer│──▶│adapter │
│        │   │        │   │ -web   │
└────────┘   └────────┘   └────────┘
    │            │            │
    ▼            ▼            ▼
核心运行时（依赖上游全部）
┌────────┐   ┌────────┐   ┌────────┐
│  core  │◀──│core-   │──▶│core-   │
│        │   │vnode   │   │sign al │
└────────┘   └────────┘   └────────┘
    │            │            │
    ▼            ▼            ▼
消费端（依赖 core）
┌────────┐   ┌────────┐   ┌────────┐
│plugin- │   │ ui ·   │   │ ssr ·  │
│  *×13  │   │ store  │   │ router │
└────────┘   └────────┘   └────────┘
```

> 说明：
>
> - `renderer` 同时依赖 `vdom`、`compiler`、`component`、`adapter-web`；`adapter-web` 依赖 `vdom`/`reactivity`/`host-contract`。
> - `core` / `core-vnode` / `core-signal` 属同一层，三者共同依赖上游原语与渲染引擎，具体依赖集见 L3 依赖关系小节。
> - 所有核心包均构建于 `common-*`、`shared-types`、`host-contract` 构成的零依赖底座之上。

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

## 生态迁出状态

根据[开发路线图](../contribute/roadmap/current.md)，部分生态包已规划迁出至独立仓库（`lytjs-plugins` 已建库并推送 Gitee）。当前动量：

- ✅ `@lytjs/ui`、`@lytjs/store`、`@lytjs/router` 等计划迁出，monorepo 内仍保留向后兼容副本
- ✅ 13 个 `@lytjs/plugin-*` 已复制到独立仓库 `lytjs-plugins`，monorepo 版本保持不变；`@lytjs/plugin` 核心仍留在 monorepo（见 L6 抽离计划）
- 🔄 `@lytjs/config` / `@lytjs/di` / `@lytjs/plugin` 规划在 v7.0-alpha 抽离为通用库
