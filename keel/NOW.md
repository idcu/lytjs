---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》A 阶段止血：验证链与配置安全已恢复；signal 编译保真已止血，
接下来是组件契约诚实化（A14 Golden 20）与 A06/A07。

## 11-05 完成（A-1 / A-2 / A04）
- **A01** 刷新锁文件 + `check-lockfile.mjs`（fast）。注入验证（删 store common-error）退出码 1。
- **A02** 全量 405 files / 8720 tests 全绿。15 条红归因：a11y 11 + hmr 3 是根 vitest 为
  node 环境（文件头 `@vitest-environment jsdom`）；hydration-battery 1 条断言过期
  （`createHydrationFunctions` 按设计发弃用提示，改为只断言 mismatch 告警为 0）。
- **A03** ESLint 45 errors 清零（11 文件，`lint:check` 退出码 0）；CI lint job 已存在。
- **A-1 slow 首次全绿 14/14**；附带修 vdom VNode 导入、9 文件 Prettier 基线、
  component 新增源码环（查表下沉 `builtin-registry.ts` 叶子模块；A07 扫描范围仍待做）。
- **A05** merge/setMultiple/deepClone/deepMerge/mergeConfig 统一拒绝
  `__proto__/constructor/prototype`；44/44，负向注入 2 红，deepMerge 加环引用保护。
- **A04 / D1** `optimizeSignal` 默认关（显式 true 才启用）；基础 codegen 修四类静默丢内容
  （根级文本 / v-if 动态属性 / kebab 组件 / v-for 嵌套元素）+ `:key` 从未生效。
  新增 `check-compiler-parity`（fast，~2s）：5 模板真实 DOM + 更新断言，默认==false 棘轮，
  优化器分叉基线 `scripts/compiler-parity-baseline.json`（只减不增）。
  注入验证：默认切回优化器 ⇒ 6 项红。compiler 单测 1669/1669；fast 门禁 40/40。
  决策记录 `keel/decisions/0012-signal-optimizer-default-off.md`；CHANGELOG 已记录默认行为与开启方式。

## 下一步
1. **A14 / D2**：冻结 Golden 20（附审计/行为证据），`component-status` 诚实化，
   `check-component-status` 断言 `mislabeled_stable = 0`（负向注入必红）。
2. **A06**：CLI 脚手架「生成即可跑」（6 模板 + tsc + SSR curl）。
3. **A07**：循环扫描覆盖 76 包 + 递归化，批末复跑 fast。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
