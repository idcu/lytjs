---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S18 完成并推送；C3 待架构人审；`sideEffects` B2 已实施（ADR 0022）。

## 11-07 完成
- **S03** `check-package-deps` 补 `export ... from` 运行时判据；`@lytjs/common`
  聚合包补 `@lytjs/common-constants` 声明（负控先红后绿）。
- **S18** 6 处内联 `display:none` 改 `hidden`；Tabs 仅删重复 `.lyt-tabs__header`；
  Dialog e2e 断言升级为 computed `display`（负控实测变红）。UI 664/664、fast 53/53。
- **S15/S16** UI composables 5 个；受控 props 17 组件/51 断言；`<select>` 初始值按
  Property/Attribute 单一判据修复（vdom 延后写表单状态）。
- **S17** `check-ui-i18n` 扫 61 组件：Golden 20 硬编码 0；experimental 欠账 122 条
  入基线（只减不增）。
- **S13/S14** 对拍 100/100、divergent 23→0；bundle 三入口按 `0020` 签字上调；
  复跑 fast 53/53、slow 14/14、bundle 18/18。
- **S01/S02** gate 委托；check-deps 覆盖 76/76。
- **S06–S12** ErrorBoundary 下沉；core-vnode 权威收敛（首屏 70.4 KB、runtime 36.6 KB）；
  事件修饰符共用；public-names、isSafeAttribute、style 数值、hydration/list-diff 收敛。
- **`sideEffects` B2** 已实施（ADR 0022）：内置组件改 `registerBuiltinComponents()`；
  AOT codegen 直接 import，运行时 template 需显式注册一次；未注册 DEV 告警。
  负控 5 红 → 11/11 绿；五入口 18/18，minimal-app 94,216 B（上限 95,948）。
- **slow 归因**：`first-screen-runtime` 38,719 B 超 504 B 由 `d936f3e9` 引入
  （vdom 新增 `@lytjs/common-dom` 依赖，整包进 runtime 闭包）；判据下沉 `common-is`
  后 37,966 B，`check-bundle-size` 恢复 18/18。
- **待决 C3**：`@lytjs/ui` 5 个运行时依赖、61 文件/167 处 import 与 ARCHITECTURE:26
  冲突；见 `decisions/pending/0021-c3-ui-dependency-conflict.md`，待架构人审。

## 下一步
1. 批次 0 收尾：S04/S05。
2. 批次 4：S19–S22。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
