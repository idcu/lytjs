# @lytjs/compiler

## [Unreleased]

### 🔐 `v-html` 的 signal 产物标注消毒责任（A09，2026-11-05）

- `codegen-signal` 的 `innerHTML` / `html` 分支仍生成 `setHTML(el, x)`；消毒由
  `@lytjs/dom-runtime.setHTML` 统一负责，与 vnode 模式的 `sanitizeHTML(x)` 共用同一实现。
  代码内已补注释，避免后续重构误以为此处无需消毒。
- 双模式一致性由 `scripts/check-security-html.mjs`（fast）逐字比对；**产物无变化**。

### ⚠️ 行为变更：`optimizeSignal` 默认关闭（A04 / D1，2026-11-05）

- **默认值由 true 改为 false**。`rendererMode: 'signal' | 'vapor'` 在不传
  `optimizeSignal` 时走**基础实现**（`generateSignal`），只有显式
  `compile(tpl, { rendererMode: 'signal', optimizeSignal: true })` 才启用优化器。
  - 原因：优化版 `codegen-signal-optimized` 与基础实现存在语义分叉，会**静默丢内容**
    （根级 `{{msg}}`、`v-if` 分支的动态属性、kebab 组件 `_ctx.my-comp` 语法错误、
    `v-for` 列表项内的嵌套元素）。生产用例不应默认落在这条路径上。
  - 开启方式：`compile(template, { rendererMode: 'signal', optimizeSignal: true })`。
  - 回退路径：如需恢复旧默认，把上述显式开关作为默认值下发即可（无需改产物逻辑）；
    但必须同时保留 `scripts/check-compiler-parity.mjs` 的分叉基线，否则门禁会红。
  - 决策记录：[keel/decisions/0012-signal-optimizer-default-off.md](../../keel/decisions/0012-signal-optimizer-default-off.md)。
  - 两版合一（parity）安排在计划 B01，完成后再评估默认值。

### 🐛 修复基础 signal codegen 的四类静默丢内容（A04，2026-11-05）

- **根级纯文本 / 插值**（`{{msg}}`、`Hello {{name}}`）：此前整段丢弃（`elementVars`
  为空时没有任何 DOM 创建），现按文本段逐段创建文本节点并建立 `setText` effect。
- **`v-if` 分支的动态属性**（`<span v-if="ok" :id="i">` 曾产出 `id="i"`）：
  静态序列化改用「字面量」判据，动态项在分支创建/更新时各执行一次 `setAttribute`。
- **kebab 组件**（`<my-comp/>` 曾产出 `_ctx.my-comp`，被解析成减法 → ReferenceError）：
  统一走 `_ctx['my-comp']` 形式。
- **`v-for` 列表项内的嵌套元素**（`<li v-for="x in xs"><span>{{x}}</span></li>` 曾生成空 `li`）：
  按 DOM 结构逐层生成 create/update。
- **`v-for` 的 `:key` 从未生效**（props key 内容为 `"key"` 带引号，比较用 `key`）：
  去引号后比较；此前所有列表都静默回退到 `item.id`。

新增门禁 `scripts/check-compiler-parity.mjs`（fast tier）：5 个最小模板真实执行 +
DOM 与响应式更新断言；断言「默认产物 == `optimizeSignal:false`」；显式开启优化器的
已知分叉记录在 `scripts/compiler-parity-baseline.json`（只减不增）。
注入验证：把默认切回优化器 ⇒ 6 项红。

## [6.9.6] - 2026-06-06

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
