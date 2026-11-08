---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S30, ui-contracts, N/A, changeset, ui-styles, circular, 体积判据]
---

# NOW · main

## 当前焦点
- **S30 V5/V6 遗留验证完成**（清单：[checks/ui-contracts-na-audit.md](checks/ui-contracts-na-audit.md)）：
  - V5：34 格 N/A 逐格取证 → 真 N/A 33 / 漏测 1 / 误标 0。漏测为
    Container/a11y（types 已声明 id/ariaLabel/ariaDescribedBy，运行时未透传）；
    已补实现 + `tests/e2e-container.test.ts`（红→绿，负控复红），登记 n/a→pass。
    门禁 140 格 pass=107 / red=0 / n/a=33。
  - V6：`pnpm exec changeset status` 本地 dry-run **exit 0**（非 BLOCKED）：
    patch 2 / minor 0 / major 76，合计 78 个待 bump 包。
- S27 已完成（f85a327a → b13b4fd8）：ui-styles 159→78（余 6 个空样式组件）、
  circular 8→3、ssrThrows 5→0、体积判据单源；覆盖率快照纳入 parser-shared（686e088f）。
- B01d 仍延后。

## 下一步
1. 6 个空样式组件补设计（DatePicker/TimePicker/ColorPicker/Cascader/Upload/Calendar）。
2. 8.0.0 窗口删 createVaporRenderer / VaporRenderer；compiler 余量断言行为化。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
