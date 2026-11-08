---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
B01d-2 块 4 完成（9/9）；C3 待审。

## 11-08 完成
- **alias**：包级配置守卫（54/216，负控红→绿），修 4 层级错；devtools 6/157 绿。
- **test 覆盖**：74/77 含 src；`host-contract`/`shared-types` 无测试（不造）。
- **S20**：零引用 29→0（27+2+1）；入口收敛 `build`；`check-script-refs` 棘轮。
- **B01c**：100 模板 × 2 逐字快照（slow）+双侧负控。
- **B01d-2**：`EmitProfile` + 9 个 vnode 族函数共享；200 份快照逐字、parity 100。
- **template**：signal 双 profile 哨兵→`Fragment`；4 语料 parity 104/104、原 200 份逐字；嵌套空（登记）。
- **计时**：computed/memory/devtools 定时器补 `unref()`；fast 88.3s。
- **S22**：`as unknown as` 基线 326/123 + 棘轮+负控；API 快照 39/1961（slow）+负控；计时 ADR 0024；host-contract ADR 0025 不接（前置=第二宿主）。

## 11-07 完成
- **S19** 16 个 common 死包 16/16「已发布/有导出面」⇒ 保留+deprecated，ADR 0023，8.0.0 删；文档同步。
- **S05** 负控框架 `gate --inject`；未验证项按批次清零。
- **S21（A 轨）** access→public、baseBranch/trigger→`v7.0.0-dev`；dry-run 76 包升 7.0.0，`check-release-parity` 红→绿；删 20 脚本，3 文档切 changesets。
- **S04** CI/文档统一到 `scripts/gate.mjs`；**S03** `check-package-deps` 补 `export ... from`。
- **S18** 内联 `display:none`→`hidden`，UI 664/664；**S15–S17** composables、受控 51 断言、i18n 基线。
- **S13/S14** 对拍 100/100；bundle 按 0020；fast 53/53、slow 14/14。
- **S01/S02/S06–S12** gate 委托、check-deps 76/76、ErrorBoundary 下沉等。
- **`sideEffects` B2** ADR 0022：`registerBuiltinComponents()`；五入口 18/18。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，见 0021。

## 下一步
1. 负控清零：73 项 **verified 72 / unverified 0 / uninjectable 1**（聚合运行器 `:slow`）。
   fast 跑 `--quick`、slow 跑 `--slow`，build/type-check/test 仅显式点名；分层只改频率不降判据。
2. S23+：按评估台账确认后启动。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
