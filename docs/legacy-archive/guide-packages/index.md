# 包总览

LytJS 采用模块化 monorepo 架构，所有包按层级（Layer）组织。本节文档面向**框架开发者和库作者**，详细说明每个包的用途、依赖关系、内部架构和模块功能。

---

## 包层级结构

```
LytJS v6.0.0
│
├── L0: 基础层 (@lytjs/common-*)
│   └── 零外部依赖的工具包（30+ 个子包）
│
├── L1: 核心原语层
│   ├── @lytjs/reactivity  ─── 响应式系统
│   ├── @lytjs/vdom        ─── 虚拟 DOM
│   └── @lytjs/compiler    ─── 模板编译器
│
├── L2: 平台/组件层
│   ├── @lytjs/component   ─── 组件系统
│   ├── @lytjs/dom-runtime ─── Signal 模式 DOM 运行时
│   └── @lytjs/dom         ─── Web Components
│
├── L3: 平台适配层
│   └── @lytjs/adapter-web ─── Web 平台适配器
│
├── L4: 核心应用层
│   ├── @lytjs/core        ─── 完整核心（VNode + Signal）
│   ├── @lytjs/core-vnode  ─── 仅 VNode 模式
│   ├── @lytjs/core-signal ─── 仅 Signal 模式
│   └── @lytjs/renderer    ─── 多模式渲染器
│
├── L5: Web 工具层
│   └── @lytjs/web        ─── CSS 变量、ResizeObserver
│
├── L6: 生态基础层 (规划中)
│   ├── @lytjs/router     ─── 路由
│   ├── @lytjs/store       ─── 状态管理
│   └── @lytjs/compat      ─── 兼容性层
│
└── L7: 工具层 (规划中)
    ├── @lytjs/cli         ─── CLI 脚手架
    ├── @lytjs/devtools    ─── DevTools
    ├── @lytjs/plugin-vite ─── Vite 插件
    └── @lytjs/lytx        ─── 构建工具
```

---

## 依赖方向规则

LytJS 强制执行**单向依赖**规则：

1. **每层只能依赖下层** — L4 不能依赖 L5
2. **同层包之间不能直接依赖** — L1 各包相互独立
3. **基础层 (@lytjs/common-\*) 零外部依赖** — 不依赖任何其他 LytJS 包
4. **自动化检查** — `scripts/check-deps.ts` 在 CI 中验证依赖方向

```
允许的依赖路径：
  L3 → L2 → L1 → L0
  L4 → L3 / L2 / L1 / L0
  L5 → L3 / L2 / L1 / L0

不允许的依赖路径：
  L3 → L4  ❌
  L2 → L3   ❌
  L1 → L2   ❌
  L0 → L1   ❌
```

---

## 包分类索引

### L0: 基础层

| 包名                              | 用途        | 依赖                         |
| --------------------------------- | ----------- | ---------------------------- |
| `@lytjs/common-is`                | 类型判断    | 无                           |
| `@lytjs/common-string`            | 字符串处理  | common-is                    |
| `@lytjs/common-object`            | 对象操作    | common-is                    |
| `@lytjs/common-array`             | 数组操作    | common-is                    |
| `@lytjs/common-function`          | 函数工具    | common-is                    |
| `@lytjs/common-error`             | 错误处理    | common-string                |
| `@lytjs/common-scheduler`         | 任务调度    | common-is                    |
| `@lytjs/common-validate`          | 数据验证    | common-is                    |
| `@lytjs/common-security`          | 安全工具    | common-string                |
| `@lytjs/common-http`              | HTTP 客户端 | common-is                    |
| `@lytjs/common-storage`           | 存储封装    | common-is, common-object     |
| `@lytjs/common-cache`             | 缓存工具    | common-is                    |
| `@lytjs/common-events`            | 事件系统    | common-is                    |
| `@lytjs/common-raf`               | RAF 封装    | common-is                    |
| `@lytjs/common-dom-helpers`       | DOM 辅助    | common-is                    |
| `@lytjs/common-query`             | URL 解析    | common-string, common-object |
| `@lytjs/common-path`              | 路径操作    | 无                           |
| `@lytjs/common-keyboard`          | 键盘事件    | common-is                    |
| `@lytjs/common-a11y`              | 无障碍工具  | common-is                    |
| `@lytjs/common-algorithm`         | 算法实现    | common-is                    |
| `@lytjs/common-timing`            | 时间工具    | 无                           |
| `@lytjs/common-constants`         | 常量定义    | 无                           |
| `@lytjs/common-performance`       | 性能监控    | common-is                    |
| `@lytjs/common-env`               | 环境检测    | 无                           |
| `@lytjs/common-vnode`             | VNode 类型  | common-is                    |
| `@lytjs/common-dom`               | DOM 类型    | 无                           |
| `@lytjs/common-transition-engine` | 过渡引擎    | common-is                    |
| `@lytjs/common-event-normalizer`  | 事件归一化  | common-is                    |
| `@lytjs/common-render-queue`      | 渲染队列    | common-is                    |
| `@lytjs/common-async-scheduler`   | 异步调度    | common-is                    |
| `@lytjs/common-node-cache`        | Node 缓存   | 无                           |
| `@lytjs/common`                   | 聚合包      | 导出全部                     |

详见：[L0 基础层详解](./common)

### L1: 核心原语层

| 包名                | 用途                         | 依赖 |
| ------------------- | ---------------------------- | ---- |
| `@lytjs/reactivity` | 响应式系统（Proxy + Signal） | L0   |
| `@lytjs/vdom`       | 虚拟 DOM + diff              | L0   |
| `@lytjs/compiler`   | 模板编译器                   | L0   |

详见：

- [响应式系统原理](./reactivity-deep)
- [VDOM 实现原理](./vdom-deep)
- [编译器架构](./compiler-deep)

### L2-L5: 应用层

| 包名                 | 用途              | 层级 |
| -------------------- | ----------------- | ---- |
| `@lytjs/component`   | 组件系统          | L2   |
| `@lytjs/dom-runtime` | Signal DOM 运行时 | L2   |
| `@lytjs/dom`         | Web Components    | L2   |
| `@lytjs/adapter-web` | Web 平台适配      | L3   |
| `@lytjs/core`        | 核心应用 API      | L4   |
| `@lytjs/core-vnode`  | VNode 模式核心    | L4   |
| `@lytjs/core-signal` | Signal 模式核心   | L4   |
| `@lytjs/renderer`    | 多模式渲染器      | L4   |
| `@lytjs/web`         | Web 工具          | L5   |

---

## 开发指南

### 如何阅读本节文档

1. **L0 基础层** — 先从 `common-*` 子包开始，了解框架的工具集
2. **L1 核心原语层** — 理解 reactivity、vdom、compiler 的内部原理
3. **L2-L5 应用层** — 了解如何组合使用这些包

### 每个包的文档结构

每个包都包含以下内容：

```
包名/
├── 概述
│   └── 这个包做什么、为什么存在
├── 架构
│   └── 内部模块划分、关键类/函数
├── 依赖关系
│   └── 它依赖什么、被谁依赖
├── 核心模块详解
│   └── 每个子模块的功能说明
├── 扩展点
│   └── 如何基于此包扩展
└── API 参考
    └── 详细 API 文档链接
```

---

## 扩展阅读

- [架构设计](../guide/architecture) — L0-L5 六层架构总览
- [贡献指南](../guide/contributing) — 如何参与框架开发
- [API 参考](../api) — 各包完整 API 文档
