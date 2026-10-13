---
scope: now
status: active
last-verified: 2026-10-13
updated: 2026-10-13
keywords: [评估, P1, P2, 门禁, 安全收敛, 硬约束9, AOT, 砍包决策, keel监管, type-check, a11y]
---

# NOW · main

## 当前焦点
全维度评估整改全量推进：P0/P1/P2 + §8.2 已闭合；keel 监管/自我演进已加固；权威基线（含 build）全绿。

## 本轮完成（2026-10-13 · a11y 框架修复 + UI 覆盖率电池）
`common-dom/patchAttr` 把 `false` 与 `null` 同等对待 ⇒ **所有 `aria-*` 的 false 被移除**
（实测 `Select` 关闭态 `aria-expanded` = null，违反 WAI-ARIA「组合框必须存在且为 true/false」）。
修：`aria-*` 的 false ⇒ `"false"`，仅 null/undefined 移除；3 条守卫（注入旧行为 ⇒ 2 条变红）。
新坑 `aria-false`。补 `Select` 行为电池 22 用例（原覆盖 13.8%）。全量 6204 用例绿。

## 本轮完成（2026-10-13 · 权威基线复验 + 类型检查闭环）
首跑全量 `type-check`（此前只跑 vitest）暴露 2 个潜伏类型错误（`staticAnalysis.test.ts` 导入不存在的
`StaticAnalysisResult`；`html-renderer` 用 ES2021 `replaceAll` 而基座 `lib=ES2020`）⇒ 新坑 `typecheck-gap`。
阈值棘轮 → **60.3/69.8/85.4/60.3**（只上调）。

## 本轮完成（2026-10-13 · 死代码清理）
可达性分析（BFS from 90 入口）+ Grep 全仓核查，删 6 个死文件 **787 行** + 清 hygiene 白名单 2 条。
教训：0% 覆盖 ≠ 死代码 → 新坑 `coverage-zero-is-not-dead`。

## 本轮完成（2026-10-12 · 砍包决策 + 覆盖率棘轮 + 死代码第一批）
ADR 0007：**不全量合并 common 子包** ⇒ §8.2 四步闭合；覆盖率棘轮；删 2 个死文件 530 行。

## 更早（2026-10-10 ~ 10-11）
P0/P1/P2 整改、安全收敛、残留 XSS 修复、§8.2 第三/四步（事件收敛 / AOT / benchmark）、keel 监管加固
（test-lint 入 CI + check-keel-wiring）—— 详见 `NOW-history/`。

## 下一步
（无待办：§8.2 + keel + 权威基线 + a11y 修复均已闭合。）

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
