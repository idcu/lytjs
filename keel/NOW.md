---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S25b, 产物断言, 行为化, S30, ui-contracts, changeset]
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

## S25b 产物断言行为化（完成）
- compiler tests 起点 668 处 `toContain` / 40 文件；改写 **420 处**（24 文件），
  8 批提交 `44666194`→`a2d79189`（基建 / VNode / 指令 / transforms / SSR / signal×3）。
- 保留 **248 处** / 23 文件：生成代码·CSS·d.ts 文本 180、raw 块保真 8、sourcemap 2、
  已登记缺陷 8、负向守卫 1、AST/数组断言 49（理由见
  [pitfalls/verify/test-impl-coupling.md](pitfalls/verify/test-impl-coupling.md)）。
- 门禁：compiler 54 文件 / 1683 用例；check:fast 57/57；快照 115×2、对拍 115/115。
- 用例净增量 −3（1686→1683），断言覆盖面逐条不降。

## 下一步
1. 6 个空样式组件补设计（DatePicker/TimePicker/ColorPicker/Cascader/Upload/Calendar）。
2. 8.0.0 窗口删 createVaporRenderer / VaporRenderer。
3. 修 S25b 登记缺陷：v-show 三元括号、优化版 v-if 内 v-for 丢失、动态参数 key。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
