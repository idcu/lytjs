---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S19 完成（16 个 common 死包保留并 deprecated→8.0.0）；S21 待出单轨事实对照；C3 待架构人审。

## 11-07 完成
- **S19** 16 个 common 死包逐包判定，16/16 命中「已发布/有导出面」⇒ 保留+deprecated，
  ADR 0023，目标 8.0.0 删除；README 横幅、overview/API/PUBLISH-MANIFEST/棘轮同步。
- **S05** 负控框架 `gate --inject`；已验 4 项（S02/S03/受控/样式），**其余 64 项未验证**
  （`scripts/negative-controls.json`）——列入后续，不得从账上消失。
- **S04** CI/文档统一到 `scripts/gate.mjs`；**S03** `check-package-deps` 补 `export ... from`。
- **S18** 内联 `display:none`→`hidden`，UI 664/664；**S15–S17** composables、受控 51 断言、i18n 基线。
- **S13/S14** 对拍 100/100；bundle 按 0020 上调；fast 53/53、slow 14/14。
- **S01/S02/S06–S12** gate 委托、check-deps 76/76、ErrorBoundary 下沉等。
- **`sideEffects` B2** ADR 0022：`registerBuiltinComponents()`；五入口 18/18。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，见 0021。

## 下一步
1. S21 发布单轨事实对照（**只出报告，不动代码**）。
2. S20、S22（按开发计划台账）。
3. 64 项未验证负控：逐项补注入实验，每验一项从 unverified 移入 verified。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
