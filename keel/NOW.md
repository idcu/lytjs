---
scope: now
status: active
last-verified: 2026-11-05
updated: 2026-11-05
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
《开发计划 2026-11-05》A 阶段止血：P0 验证链（锁文件 / 测试 / lint / type-check /
slow 门禁）已恢复；剩余为 codegen 保真与组件契约诚实化。

## 11-05 完成（A-1 / A-2 半）
- **A01** 刷新锁文件 + `check-lockfile.mjs`（fast）。注入验证（删 store common-error）退出码 1。
- **A02** 全量 405 files / 8720 tests 全绿。15 条红归因：a11y 11 + hmr 3 是根 vitest 为
  node 环境（文件头 `@vitest-environment jsdom`）；hydration-battery 1 条断言过期
  （`createHydrationFunctions` 按设计发弃用提示，改为只断言 mismatch 告警为 0）。
- **A03** ESLint 45 errors 清零（11 文件，`lint:check` 退出码 0）；CI lint job 已存在。
- **A-1 slow 首次全绿 14/14**；附带修 vdom VNode 导入、9 文件 Prettier 基线、
  component 新增源码环（查表下沉 `builtin-registry.ts` 叶子模块；A07 扫描范围仍待做）。
- **A05** merge/setMultiple/deepClone/deepMerge/mergeConfig 统一拒绝
  `__proto__/constructor/prototype`；44/44，负向注入 2 红，deepMerge 加环引用保护。

## 下一步
1. D1 / D2 owner 决策未决，A04 / A14 暂停，不自行绕过。
2. D1 通过后 A04：`optimizeSignal` 默认关 + 5 模板 golden + `check-compiler-parity`。
3. A-3：A06 type-check/dts 全量；A07 循环扫描 76 包 + 递归化。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| D1：signal/vapor 默认回退需 owner 签字 | 先做 A05/A06/A07 |
| D2：Golden 20 名单与降级方式 | 同上 |
| 覆盖率并发清 .tmp / safe-delete 拦 coverage | 单包复核 / reportsDirectory=/tmp |
