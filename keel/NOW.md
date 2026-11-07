---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S19/S20/S21 完成；S22 首件（`as unknown as` 基线+棘轮）完成，余项待判断；C3 待架构人审。

## 11-08 完成
- **S21 残留**：删 `verify-build-list.ts`（依赖已删的 `final-publish.ts`）与
  `check-actual-packages.ts`（硬编码 85 条），职责归 `check-release-parity`。
- **S20**：引用地图 128/零引用 29；删 27+restore 2+孤儿 1；入口收敛为 `build`；
  `check-script-refs` 棘轮+负控（基线 0）。
- **S22 首件**：`as unknown as` 基线 326/123；`check-as-unknown` 棘轮+负控上线；
  host-contract 与 API 快照仅出判断。
- 计时断言并发抖动登记 pitfalls，口径待决（未改阈值）。

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
1. S22 余项：host-contract 接入判断、API 快照（先出结论再动手）。
2. 63 项未验证负控：逐项补注入实验，每验一项从 unverified 移入 verified。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
