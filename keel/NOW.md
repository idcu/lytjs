---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S13 完成；S14 slow 跑出 12/14，bundle-size 待 owner 签字（功能增长，不得私改基线）。

## 11-07 完成
- **S13** `check-compiler-parity` **100/100**、`expectedMismatch` 0；baseline
  divergent 23→0。语义抽入 `codegen-signal-shared.ts`，两发射器只留输出形态
  （短别名/形参名/变量名/前缀）；契约与测试未改。
- **S14 slow 12/14**：`format:check` 既有红；`check-bundle-size` 三入口超 +2%
  （first-screen 71.8 vs 70.7 KB，编译器同理 +2.5 KB gzip），均因 S13 对拍所需
  功能增长（分支/嵌套列表/根文本）。按脚本要求待 owner 签字后才可改基线。
- **S01/S02** gate 委托 `gate.mjs`；check-deps 覆盖 **76/76**。
- **S06–S12** ErrorBoundary 下沉 component；core-vnode 权威收敛与 S07 体积回归修复
  （first-screen 90.3→**70.4 KB**、runtime 87.7→**36.6 KB**）；S08 事件修饰符共用；
  S09 public-names（0017）；S10 复用 `isSafeAttribute`；S11 style 数值（0018）；
  S12 hydration/list-diff 收敛（52/52、36/36）。
- ⚠️ 既有红：`format:check` 仅 `playground/ui-a11y.html`（最后改动 73a1b005/B05，S07–S12 未碰）。
- ⚠️ `sideEffects:false` 丢弃 builtin-components 副作用，core 包级 dist 测试 5 红，归批次0。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，待 owner 裁定。

## 11-06 完成
- A15 体积预算；B01 对拍 77/100（`0015` 草稿）；B04 契约红 15→0；B05 各 UI 门禁全绿。

## 下一步
1. **S13 合并**：待 owner 在「参数化单发射器 / 共享 helper 的双发射器 / 允许改优化版输出测试」中裁定。
2. **S14**：对拍基线已 0，补 slow 档复跑并确认 fast + slow 绿。
3. 批次0 余项 S03/S04/S05 + `sideEffects` 构建问题；ssr-island 残留副本。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
