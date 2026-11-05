# @lytjs/store

## [Unreleased]

### 🐞 修复（11 个「界面不更新 / 数据没存住」的语义缺陷）

**响应式**

- **对象 / 数组的原地变更完全无响应**（P0）：状态值被原样塞进 `signal()`（不做深包裹），
  `store.items.push(x)` / `store.user.name = 'b'` **既不触发渲染、也不触发 `$subscribe`**
  （实测 effect 只跑过初值、订阅 0 条）。现在对象/数组先 `reactive()` 再进 signal。
- **getter 不跟随嵌套变更**（P1）：`computedSignal` 只订阅 signal，读 reactive 的部分永远是缓存旧值。
  getter 改为「惰性 effect + signal」，嵌套变更后自动重算（链式 getter 一次变更只重算一次）。
- **setup store 的 `store.n` 拿到的是信号函数**（P0）：`reactive` 只解包对象型 ref
  （`__v_isRef`），而本仓 `signal()` 返回**函数** ⇒ `store.n + 1` 变成字符串拼接；
  `store.n = 1` 还会把信号整个替换掉 ⇒ 之后 action 改原信号，`store.n` 永远不变。
  现在显式建一层「解包视图」：读 `sig()`、写 `sig.set(v)`（写穿透）。
- **setup store 直接赋值不通知订阅者**（P1）：此前只在 action 边界触发。现在用深度 effect 兜住。
- **action 里的 `this` 指向裸 ref 容器**（P1）：`this.n` 是信号函数，`this.n++` 得到 NaN。改为指向 store。

**接口语义**

- **`storeToRefs` 把 action 也转成 ref**（P1）：`Object.keys` 为 `["n","double","inc"]`，
  `const { inc } = storeToRefs(store); inc()` ⇒ `TypeError: inc is not a function`。
  现在只提取 state + getters，并改用 `Object.keys`（此前 `for...in` 会扫到原型链）。
- **setup store 的 `$state` 含 action 函数**（P1）：`Object.keys(store.$state)` 为 `["n","inc"]`，
  持久化时会把函数一起复制。现在只含状态键。
- **`store.$state = {...}` 抛 TypeError**（P1）：`$state` 只有 getter，而类型里写的是可写。
  现在支持整体赋值（只写已存在的键，未知键告警）。
- **setup store 的 `$patch(fn)` 写入静默丢失**（P1）：mutator 拿到裸 ref 容器，
  `s.count = 5` 把 ref 整个换掉。现在传 store（响应式视图）。
- **`$patch` 静默丢弃未知键**（P2）：对象式与函数式都不留提示。现在告警；
  函数式新增的键会被明确丢弃（避免留下没有 signal 的影子属性）。

**事件与生命周期**

- **`$reset()` 按 key 各发一条事件**（P2）：3 个键 ⇒ 订阅者被写 3 次。现在恰好一条。
- **`$dispose()` / `clearStoreCache()` 不停内部 effect**（P2）：废弃 store 仍在响应变更、
  仍持有订阅回调。现在两者都会停掉（`clearStoreCache` 会遍历所有 store 的清理函数）。

### 🐞 修复（跨包：本包的 `warn()` 在产物里全是哑的）

`tsup.config.ts` 把 `@lytjs/common-error` **内联**进产物，而本包同时有
`define: { __DEV__: 'false' }` ⇒ esbuild 把 `getDevMode()` 的第一句
`if (typeof __DEV__ === 'boolean') return __DEV__` 折叠成 `return false`，
后面的 `process.env.NODE_ENV` 分支被当成不可达删除 ⇒ **所有 `warn()` 都不打印**，
而单测跑的是 `src`、全绿。`setDevMode(true)` 也救不回来（它改的是真身模块里的状态）。

现在把 `@lytjs/common-error` 标为 `external`；`check-dev-warnings` 新增第 12 组守卫：
除 `common-error` 自己外，任何产物里都不允许出现 `function getDevMode`。

### 📝 文档

README 新增「状态变更的语义」：响应式范围、`$subscribe` 触发对照表、
`$patch` / `$state` 的键约束、setup store 的解包与 `$state`、`storeToRefs`、已知限制。

### 🔧 独立化核查

- 独立化核查：核心 store 逻辑（`defineStore` / `storeToRefs` / Option、Setup 模式）确认仅依赖 `@lytjs/reactivity` 与 `@lytjs/common-*`，框架耦合仅保留在 `createPinia()`（LytJS 应用插件集成适配层）
- 移除未使用的 `@lytjs/component` 运行时依赖
- README 补充「简介·独立声明」章节

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## 6.6.0

发布日期: 2026-05-21

### 主要更新

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.6.0

## 6.5.0

发布日期: 2026-05-19

### 主要更新

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.5.0

## 6.4.0

发布日期: 2026-05-18

### 主要更新

- Monorepo 包发布
- 核心修复内容：文档完善、构建与发布优化

### 依赖更新

- 更新依赖到 6.4.0 版本：
  - @lytjs/core@6.4.0
  - @lytjs/reactivity@6.4.0
  - @lytjs/component@6.4.0

## 6.1.0

### 主要更新

- chore: 发布 6.1.0，包含改进和错误修复

  ## 摘要

  此版本包含对响应式系统、编译器、渲染器、路由、状态管理、SSR、UI 组件和开发工具的改进。

  ### 核心
  - 增强的应用配置和生命周期管理
  - 改进的插件系统
  - 更好的错误边界处理

  ### 编译器
  - 优化的信号代码生成
  - 改进的单文件组件解析和转换
  - 增强的 SSR 编译支持

  ### 响应式系统
  - 更好的 effect 作用域管理
  - 改进的异步计算和批量更新
  - 增强的信号性能

  ### 渲染器
  - 优化的 DOM 补丁
  - 更好的基于信号的渲染
  - 改进的 SSR 流式传输

  ### 生态系统
  - 路由：增强的导航和匹配
  - 状态管理：改进的状态管理
  - SSR：更好的水合和流式传输
  - UI：组件改进
  - 开发工具：增强的调试工具

### 补丁更新

- 更新依赖
  - @lytjs/reactivity@6.1.0
  - @lytjs/component@6.1.0
