---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S13/S14 完成，fast + slow 全绿；下一步批次 4。

## 11-07 完成
- **S13** `check-compiler-parity` **100/100**、`expectedMismatch` 0；baseline
  divergent 23→0。语义抽入 `codegen-signal-shared.ts`，两发射器只留输出形态
  （短别名/形参名/变量名/前缀）；契约与测试未改。
- **S14 完成**：`format:check` 已用 prettier 修好（ui-a11y 仅 `font-family`
  换行，语义未变）；bundle 三入口按 owner 签字更新基线（`0020`：93,957 /
  91,808 / 73,567 B，编译器 dist +2,907 B 归因，A15 上限内）。复查项：日后
  压体积从编译器输出形态入手，不再抬基线。复跑实测：fast **53/53**
  （134.4s）· slow **14/14**（446.2s）· bundle **18/18** · format 绿。
- **S01/S02** gate 委托 `gate.mjs`；check-deps 覆盖 **76/76**。
- **S06–S12** ErrorBoundary 下沉 component；core-vnode 权威收敛与 S07 体积回归修复
  （first-screen 90.3→**70.4 KB**、runtime 87.7→**36.6 KB**）；S08 事件修饰符共用；
  S09 public-names（0017）；S10 复用 `isSafeAttribute`；S11 style 数值（0018）；
  S12 hydration/list-diff 收敛（52/52、36/36）。
- ⚠️ `sideEffects:false` 丢弃 builtin-components 副作用，core 包级 dist 测试 5 红，归批次0。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，待 owner 裁定。

## 11-06 完成
- A15 体积预算；B01 对拍 77/100（`0015` 草稿）；B04 契约红 15→0；B05 各 UI 门禁全绿。

## 下一步
1. **批次 4 / S15**：UI composables 基础层（`useControlledState/useSlotContent/useOverlay/useFormField/useLocale` + 3 个试点）。
2. 批次0 余项 S03/S04/S05 + `sideEffects` 构建问题；ssr-island 残留副本。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
