# @lytjs/router

## [Unreleased]

### 🐞 修复（链接语义 2 个 + API 缺口）

- **`<RouterLink :to="{ name: 'x' }">` 的 href 是当前页面**（P0）：`useLink` 自己调
  `resolveLocation(to, route())` 但**没传 `resolveName`** ⇒ 命名路由解析不了，
  退化成「返回当前路径」⇒ 点了等于原地导航。现在统一走 `router.resolve()`。
- **`isActive` 用字符串前缀判断**（P1）：`/user` 的链接在 `/username` 页面上也高亮
  （侧边栏错位），`/` 更是匹配所有路径。现在按 **matched 记录链**判断
  （目标链是当前链的前缀，与 Vue Router 语义一致）。

### ✨ 新增

- `router.resolve(to)`：解析任意路由描述为完整位置（`path` / `fullPath` / `params` /
  `matched` / `meta`）。**与 `navigate()` 共用 `buildLocation`**，链接与导航不会分叉。
- `router.getRoutes()` / `hasRoute(name)` / `addRoute(record, parentName?)` /
  `removeRoute(name)` / `clearRoutes()`：动态路由（`addRoute` 返回移除函数）。
- `alias` 支持：`RouteRecordRaw.alias` 此前**从未被读取**（按别名访问 404）。
  现在字符串 / 数组都支持，相对别名相对父路径解析；别名与主路径**共享同一条记录**。
- 未知路由名的导航会给出告警（此前与「路径未匹配」一样静默中止）。

### 🐞 修复（6 个「页面能打开、只是不对」的缺陷）

- **路由优先级用权重总和排序**（P1）：`/a/b/*`(3+3+0=6) 输给 `/a/:x/:y`(3+2+2=7)
  ⇒ 通配符路由**注册了却永不命中**。改为逐段字典序
  （`static 3 > param 2 > optional 1 > wildcard 0`，「已结束」按 1），
  与 `@lytjs/http-server` / `@lytjs/runtime-edge` 同一套规则 —— 这是该缺陷族的**第三次**出现。
- **`RouteRecordRaw.redirect` 从未被读取**（P0）：类型里声明着、`normalizeRouteRecord` 不拷贝、
  `navigate` 不读 ⇒ 用户写 `redirect` 之后导航停在原路径，无报错无告警。
  现在支持字符串 / location 对象 / 函数三种写法，且**目标的守卫照常执行**、循环有上限（10 层）。
- **默认子路由（`path: ''`）永不命中**（P1）：子路由与父路由的 token 序列相同，
  旧的 `>` 比较让先遍历到的父路由胜出 ⇒ `matched` 深度 1、`name` 为 null。
  现在打平时**更深（子）路由优先**。
- **初始导航绕过守卫链**（P0）：`app.use(router)` 的首次导航只做 `resolveRoute + set`，
  不跑 `beforeEach`、不处理重定向、不判定 404 ⇒ **鉴权守卫在深链 / 刷新 / 直接打开时被绕过**，
  而这正是它最该生效的时刻；`isReady()` 也在守卫之前就 resolve 了。
  现在初始导航走完整 `navigate` 管线，`isReady()` 在其落定后 resolve。
  （无守卫 / 无重定向时保留**同步首帧**，避免每个应用首帧空白。）
- **query 的 `+` 不解成空格**（P1）：`?q=a+b` 得到 `"a+b"`，而浏览器发的正是 `a+b`
  ⇒ 搜索「a b」永远搜不到。另修畸形转义（`%zz`）抛 `URIError` 打断导航。
  （`@lytjs/common-query` 修过同一处，router 自带副本没同步。）
- **未匹配路径完全静默**（P1）：`push('/typo')` 后停在原页面、控制台无输出。
  现在给出可操作告警（说明怎么加 catch-all），返回值仍是 `aborted`。
- **首帧 `currentRoute().name` 恒为 null**（P1）：同步落定那条路没写 `name`
  ⇒ 按名字判断当前页面的代码在首屏失效。

### 🔧 独立化核查

- 独立化核查：核心路由逻辑（matcher / history / 导航守卫 / RouterLink / RouterView）确认仅依赖 `@lytjs/reactivity`，框架零耦合
- 移除未使用的 `@lytjs/common-is` / `@lytjs/common-env` / `@lytjs/component` / `@lytjs/vdom` 运行时依赖
- 修正 `repository.directory` 路径与实际位置一致
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
  - @lytjs/vdom@6.4.0
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
  - @lytjs/vdom@6.1.0
  - @lytjs/component@6.1.0
