---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S22 完成（API 快照 / 计时分层 / host-contract 前置）；fast 56/56、slow 15/15；C3 待架构人审。

## 11-08 完成
- **S21 残留**：删 `verify-build-list.ts` 与 `check-actual-packages.ts`，职责归 `check-release-parity`。
- **S20**：零引用 29→0（删 27+restore 2+孤儿 1）；入口收敛为 `build`；`check-script-refs` 棘轮+负控。
- **S22**：`as unknown as` 基线 326/123 + 棘轮+负控；API 快照 39 包/1961 名（slow，`--update`
  显式）+负控；计时断言按 ADR 0024（<20ms 只报数字，≥20ms 保留）；host-contract ADR 0025
  维持不接（前置=第二个宿主目标）。

## 11-07 完成
- **S19** 16 个 common 死包逐包判定，16/16 命中「已发布/有导出面」⇒ 保留+deprecated，
  ADR 0023，目标 8.0.0 删除；README 横幅、overview/API/PUBLISH-MANIFEST/棘轮同步。
- **S05** 负控框架 `gate --inject`；已验 5 项（S02/S03/受控/样式/发布一致性），**其余 63 项未验证**
  （`scripts/negative-controls.json`）——列入后续，不得从账上消失。
- **S21（A 轨）** access→public、baseBranch/trigger→`v7.0.0-dev`；dry-run 76 包升至 7.0.0，
  `check-release-parity` 负控先红后绿；已删 5 手工 + 15 孤儿脚本，3 份文档切 changesets。
- **S04** CI/文档统一到 `scripts/gate.mjs`；**S03** `check-package-deps` 补 `export ... from`。
- **S18** 内联 `display:none`→`hidden`，UI 664/664；**S15–S17** composables、受控 51 断言、i18n 基线。
- **S13/S14** 对拍 100/100；bundle 按 0020 上调；fast 53/53、slow 14/14。
- **S01/S02/S06–S12** gate 委托、check-deps 76/76、ErrorBoundary 下沉等。
- **`sideEffects` B2** ADR 0022：`registerBuiltinComponents()`；五入口 18/18。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，见 0021。

## 下一步
1. 63 项未验证负控：逐项补注入实验，每验一项从 unverified 移入 verified。
2. S23+：按评估台账确认后启动。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
