---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S25b, 断言行为化, S30, 缺陷修复]
---

# NOW · main

## 当前焦点
- S30 V5/V6 完成（[审计](checks/ui-contracts-na-audit.md)）：34 格取证 → 真 N/A 33 / 漏测 1（Container a11y，已补 e2e）；门禁 pass=107 n/a=33；changeset dry-run exit 0。
- S25b 残留缺陷已清（一次一提交）：
  - v-show 三元缺括号 `c7a768e5`
  - 优化版 v-if 吞 v-for `68bf132b`
  - 动态参数 key `f9268d1e`（vnode/SSR 三路计算键）
  - transformOn 死路径：设计如此，见 [residuals](pitfalls/core/residuals.md)
- 门禁：compiler 54 文件 / 1685 用例；check:fast 57/57；快照 115×2；对拍 115/115。
- bundle：三修复使首屏闭包 first-screen +426 / minimal-app +395 / runtime-app +391 B，冗余清理 −15/−22/−16；仅 first-screen 超预算（75448 > 75038），签字上调至 75448，见 [ADR 0027](decisions/0027-bundle-first-screen-s30-fixes.md)。

## S25b 净减 −3 核对（1686→1683，加 2 条回归→1685）
| 删（形态断言） | 并入 | 覆盖 |
| --- | --- | --- |
| if-chain：Fragment children 为数组 | `<template v-if>` 渲染 Fragment | `children===['A']`（执行后，更强） |
| inline-handler：helper 在 preamble | resolveDynamicComponent 用例 | 执行断言；负控去 `helper()` 即红 |
| slot-transform：注册 renderSlot | 全部插槽执行用例 | 负控去 `helper('RENDER_SLOT')`：2 文件 10 条红 |

结论：三条均为可被更强断言完全覆盖的形态断言，无唯一覆盖面丢失。

## 下一步
- 依 [ADR 0028](decisions/0028-owner-authorized-strategy-decisions.md) 全量推进；台账见 [NOW-history/11-10](NOW-history/2026-11-10-owner-decisions-batch0-1.md)。
- 批次 0（N01–N06）与**批次 1（N07–N13）均已收官**，改动已分批提交并 push；待办转批次 2（N14–N21）→ 批次 3（N22–N26）。
- 6 个空样式组件补设计；8.0.0 删 createVaporRenderer / VaporRenderer 与 optimizeSignal。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
