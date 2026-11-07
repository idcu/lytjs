---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S13 完成（对拍 100/100 + 共享 helper 双发射器）；下一步 S14 slow 档复跑。

## 11-07 完成
- **S13** `check-compiler-parity` **100/100**、`expectedMismatch` 0；baseline
  divergent 23→0。语义抽入 `codegen-signal-shared.ts`，两发射器只留输出形态
  （短别名/形参名/变量名/前缀）；契约与测试未改，对拍维持 100/100。
  修齐以基础实现 A 为语义基准：根级文本、多插值槽位、v-if 分支动态内容、
  kebab 组件引用、v-for 嵌套子元素。
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
