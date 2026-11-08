---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
B01d-2 落地（静态序列化共享）；fast 56/56 · 88.3s、slow 17/17；C3 待审。

## 11-08 完成
- **S21 残留**：删 2 个残留脚本，职责归 `check-release-parity`。
- **S20**：零引用 29→0（删 27+restore 2+孤儿 1）；入口收敛为 `build`；`check-script-refs` 棘轮+负控。
- **B01c**：100 模板 × 2 profile 逐字快照（slow）+双侧负控。
- **B01d-1/2**：`EmitProfile` 常量 + 序列化/8 helper 共享；产物逐字不变。
- **计时**：computed/memory/devtools 定时器补 `unref()`；fast 174→88.3s。
- **S22**：`as unknown as` 基线 326/123 + 棘轮+负控；API 快照 39 包/1961 名（slow）+负控；
  计时断言 ADR 0024；host-contract ADR 0025 不接（前置=第二宿主）。

## 11-07 完成
- **S19** 16 个 common 死包逐包判定，16/16 命中「已发布/有导出面」⇒ 保留+deprecated，
  ADR 0023，目标 8.0.0 删除；README 横幅、overview/API/PUBLISH-MANIFEST/棘轮同步。
- **S05** 负控框架 `gate --inject`；未验证项已按批次清零（见「下一步」）。
- **S21（A 轨）** access→public、baseBranch/trigger→`v7.0.0-dev`；dry-run 76 包升至 7.0.0，
  `check-release-parity` 负控先红后绿；已删 5 手工 + 15 孤儿脚本，3 份文档切 changesets。
- **S04** CI/文档统一到 `scripts/gate.mjs`；**S03** `check-package-deps` 补 `export ... from`。
- **S18** 内联 `display:none`→`hidden`，UI 664/664；**S15–S17** composables、受控 51 断言、i18n 基线。
- **S13/S14** 对拍 100/100；bundle 按 0020 上调；fast 53/53、slow 14/14。
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
