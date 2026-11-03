# @lytjs/ui

## [Unreleased]

### 🐞 修复（Pagination 受控行为 3 个 + v-model）

- **`current` prop 变化被忽略**：内部 `signal(p.current)` 只在创建时取一次值 ⇒
  父组件把页码重置为 1（筛选条件变化）时，分页器**仍停在第 5 页**。
  现在 `watch` props 并同步内部 signal。
- **`pageSize` prop 变化被忽略**：每页条数变了，页码数量不变。同上。
- **`current` 越界时不夹取**：`current=10 / total=30`（只有 3 页）时页码区
  **一个 `--active` 都没有**、「下一页」仍可点。现在渲染时夹到 `[1, totalPages]`。
- **`v-model:current` 静默无效**：组件从不 `emit('update:current')`。
  现在点击页码 / 切换每页条数都会 emit（`update:current` / `update:pageSize`）。

### 🔧 迁出核查

- 依赖清理：移除 `src` / `tests` / `examples` 中完全未引用的 `@lytjs/common-env` / `@lytjs/common-dom` 运行时依赖（同步清理 tsup external / vitest alias / tsconfig paths）
- README 补充「简介·独立声明」「依赖关系」章节，明确 v6.10 迁出为独立仓库 `lytjs-ui` 的规划
- 确认零第三方依赖：仅依赖 LytJS 核心框架（reactivity / component / vdom / core）与通用工具（common-is / common-a11y）

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
