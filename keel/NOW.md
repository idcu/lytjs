---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
signal 正确性 5/5 清零（vnode 基准，两 profile 同步）；B01d 合并暂停待评估。

## 11-08 完成
- **signal 正确性 5/5**（独立语料 + 负控红→绿 + vnode 对比）：①`v-if→v-else` 清理旧节点；②分支内嵌 `v-if/v-else`（含 `tf03`）；③`v-for` 元素内嵌 `v-if` 局部变量；④`template v-for` 内嵌 `v-if`；⑤`v-for`+`v-if` 同元素 WeakMap 崩溃。parity 115、快照 115×2。
- **alias**：包级守卫 54/216（负控红→绿），修 4 层级错；devtools 6/157 绿。
- **test 覆盖** 74/77 含 src（2 包无测试不造）；**S20** 零引用 29→0。
- **两档门禁**（串行，未并行）：fast 56/56、slow 17/17；`check-public-names` 的 replica 行号随 import 漂移已校正到实现行。
- **B01c/B01d-2** 100 模板×2 逐字；9 个 vnode 族共享（200 份逐字）；**template** 哨兵→`Fragment`（104/104）。
- **S22** `as unknown as` 326/123 棘轮+负控；API 快照 39/1961；ADR 0024/0025。

## 11-07 完成
- **S19** 16 个 common 死包保留+deprecated（ADR 0023，8.0.0 删）。
- **S05** `gate --inject` 负控框架；**S21** 76 包升 7.0.0、`check-release-parity` 绿。
- **S04/S03** gate 统一、`check-package-deps`；**S18** `hidden`、UI 664/664。
- **S13/S14** 对拍 100/100；**S01/S02/S06–S12** gate 委托等；**B2** ADR 0022。
- **待决 C3**：`@lytjs/ui` 与 ARCHITECTURE:26 冲突，见 0021。

## 下一步
1. 负控：72 verified / 0 unverified / 1 uninjectable（`--slow` 聚合）。
2. S23+：按台账确认后启动。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
