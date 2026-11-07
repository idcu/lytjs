---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S07 体积回归已修（core-vnode 子入口），下一步 S13 codegen 对拍/合并。

## 11-07 完成
- **S01/S02** gate 委托 `gate.mjs`；`check-deps` 补 24 包层级、删 7 幽灵名，覆盖 **76/76**。
- **S06/S07** ErrorBoundary 下沉 component；h/directives/composition/lifecycle 权威收敛 core-vnode。
- **S07 回归修复** core-vnode 增 h/directives/composition/lifecycle 子入口，core 转发改子入口
  （不再穿透 barrel 拉入 compile）；first-screen 90.3→**70.4 KB**、runtime 87.7→**36.6 KB**；
  fast **53/53 · 117.2s**。bisect：S06 绿(70.4)→S07 红(90.3)，S12 排除。
- **S08** 修饰符收敛 `common-events` 三路径共用；对拍 11 例，check-event-semantics 45/45。
- **S09** ADR 0017 + public-names：unified 28 / registered 4 组；负控退出 1。
- **S10** dom-runtime 复用 `isSafeAttribute`；check-render-parity 6 断言；负控退出 1。
- **S11** style 数值统一不补 px（ADR 0018）：vnode/signal/SSR 复用；对拍 10 断言。
- **S12** hydration 收敛 `adapter-web.hydrateVNodeTree`；keyed diff 收敛 `planKeyedDiff`；
  check-hydration 52/52、check-list-diff 36/36；负控 27/36；残留 ssr-island 副本已登记。
- ⚠️ 既有红：`format:check` 仅 `playground/ui-a11y.html`（最后改动 73a1b005/B05，S07–S12 未碰）。
- ⚠️ `sideEffects:false` 丢弃 builtin-components 副作用，core 包级 dist 测试 5 红，归批次0。
- **待决 C3**：`@lytjs/ui` 依赖与 ARCHITECTURE:26 冲突，待 owner 裁定。

## 11-06 完成
- A15 体积预算；B01 对拍 77/100（`0015` 草稿）；B04 契约红 15→0；B05 各 UI 门禁全绿。

## 下一步
1. **S13**：`check-compiler-parity` 修到 100/100 后合并两套 signal codegen（保留 `optimizeSignal`）。
2. **S14**：23→0 差异基线逐条修/删；fast + slow 绿。
3. 批次0 余项 S03/S04/S05 + `sideEffects` 构建问题；ssr-island 残留副本。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
