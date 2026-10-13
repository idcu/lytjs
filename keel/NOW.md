---
scope: now
status: active
last-verified: 2026-10-13
updated: 2026-10-13
keywords: [评估, P1, P2, 门禁, 安全收敛, 硬约束9, AOT, 砍包决策, keel监管, type-check]
---

# NOW · main

## 当前焦点
全维度评估整改全量推进：P0/P1/P2 + §8.2 已全部闭合（含砍包决策）；keel 监管/自我演进已加固；权威基线复验全绿。

## 本轮完成（2026-10-13 · 权威基线复验 + 类型检查闭环）
首次跑全量 `type-check`（此前各轮只跑 vitest），暴露并修 2 个潜伏类型错误：`staticAnalysis.test.ts`
导入不存在的 `StaticAnalysisResult`、`html-renderer` 用 ES2021 `replaceAll` 而基座 `lib=ES2020`。
⇒ 新坑 `typecheck-gap`（vitest 只转译不类型检查，本地「全绿」口径必须含 `type-check`）。
权威基线复验：快档 5 + type-check + lint + format + test(6179) + 覆盖率 60.34/69.85/85.49 全绿；
阈值棘轮 → **60.3/69.8/85.4/60.3**（只上调）。

## 本轮完成（2026-10-13 · 死代码清理）
可达性分析（BFS from 90 入口）+ Grep 全仓 test/bench/docs 核查，删 6 个死文件共 **787 行**
+ 清 hygiene 白名单 2 条；修 AOT 测试全量套件超时。教训：0% 覆盖 ≠ 死代码 → 新坑 `coverage-zero-is-not-dead`。

## 本轮完成（2026-10-12 · 砍包决策 + 覆盖率棘轮 + 死代码第一批）
ADR 0007：**不全量合并 common 子包**（各包不同关注点，按簇合并造 grab-bag）⇒ §8.2 四步闭合；
覆盖率棘轮 59.8/69.7/85.4/59.8；删 2 个死文件 530 行。

## 更早（2026-10-10 ~ 10-11）
P0/P1/P2 整改、安全收敛（common-security 单一源）、残留 XSS 修复、§8.2 第三/四步（事件收敛 / AOT /
benchmark）、keel 监管加固（test-lint 入 CI + check-keel-wiring）—— 详见 `NOW-history/`。

## 下一步
（无待办：§8.2 四步 + keel 监管/自我演进 + 权威基线复验均已闭合；工作区 156 项改动已按主题分组落地。）

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
