# @lytjs/compiler

## [Unreleased]

### 🐛 修复 `compileSFC()` 的两个静默失效（2026-10-10，P1-8 连带发现）

- **`<style scoped>` 的默认路径产出 `[data-v-undefined]`**：
  `scopedId` 此前写死为 `scoped ? id : undefined`，但作用域判定还有第二支
  ——「未显式传 `scoped` 且 style 块自带 `scoped` 属性」。该支下
  `scopeCSS(css, undefined)` 产出 `[data-v-undefined]`，**所有未显式传 `scoped` 的
  组件共用同一个 scope 属性** ⇒ scoped 样式跨组件泄漏，且 `result.scopedId` 永远为
  `undefined`。现按与作用域判定完全相同的条件计算，并让 template 的 `scopeId` 与之同源。
- **`SFCCompileOptions.ssr` 是死开关**：`compile()` 选择 SSR 通路读的是 `ssrMode`，
  `ssr` 只是 transform / codegen 的子开关且在 `compile()` 内被覆盖为 `false`。
  此前 `compileSFC(d, { ssr: true })` 与 `ssr: false` 的产物**逐字节相同**。
  现同时传 `ssrMode`，SSR 通路产出 `renderToString` + HTML 转义。
- 新增 5 个行为级回归用例（`tests/sfc/compile.test.ts`）；此前 scoped 相关测试
  只覆盖了**显式传 `scoped: true`** 的那一支，恰好绕开了缺陷。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## 6.6.0 (2026-05-21)

### 更新内容

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.6.0

## 6.5.0 (2026-05-19)

### 更新内容

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.5.0

## 6.4.0 (2026-05-18)

### 特性

- **Monorepo 包发布**：统一管理所有核心包和生态系统包的发布流程
- **核心修复**：ColorPicker 组件修复、文档完善、构建与发布流程优化
- **依赖更新**：所有 @lytjs/common-* 系列包、@lytjs/shared-types 等依赖均已更新至 6.4.0

### 更新内容

- 优化信号代码生成
- 改进 SFC 解析和转换
- 增强 SSR 编译支持

## 6.1.0

### 小版本更新

- 功能更新和 bug 修复

### 概要

本版本包含对响应式系统、编译器、渲染器、路由、状态管理、SSR、UI 组件和开发工具的改进。

### 核心

- 增强应用配置和生命周期管理
- 改进插件系统
- 更好的错误边界处理

### 编译器

- 优化信号代码生成
- 改进 SFC 解析和转换
- 增强 SSR 编译支持

### 响应式

- 更好的 effect 作用域管理
- 改进异步计算和批量更新
- 增强信号性能

### 渲染器

- 优化 DOM 补丁
- 更好的基于信号的渲染
- 改进 SSR 流式输出

### 生态系统

- 路由：增强导航和匹配
- 状态管理：改进状态管理
- SSR：更好的水合和流式输出
- UI：组件改进
- 开发工具：增强调试工具
