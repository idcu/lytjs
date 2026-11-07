---
scope: now
status: active
last-verified: 2026-11-07
updated: 2026-11-07
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
S12 完成（hydration 入口与 keyed list diff 收敛），下一步批次0 余项 S03/S04/S05。

## 11-07 完成
- **S01** `check-deps`+`check-src-hygiene` 入 gate；`check:fast` 与 CI 改委托 `gate.mjs`。
- **S02** `check-deps` 补 24 包层级、删 7 幽灵包名；未登记包/依赖直接红；覆盖 **76/76**，fast **50/50 · 138.1s**。
- **S06/S07** ErrorBoundary 下沉 component；`h/directives/composition/lifecycle` 权威收敛到 core-vnode；7 例对拍。
- **S08** 修饰符表/解析/拦截收敛到 `common-events`；三路径共用 `isEventModifierIntercepted`；
  对拍 11 例，check-event-semantics 45/45。
- **S09** ADR 0017 + `public-names.json`：unified **28 名**、registered **4 组**；负控退出 1；fast **51/51**。
- **S10** `dom-runtime.setAttribute` 复用 `isSafeAttribute`，signal 拦截 `javascript:`/内联事件；
  `check-render-parity` 6 断言；负控退出 1；fast **52/52 · 119.8s**。
- **S11** style 数值统一**不补 px**（ADR 0018，破坏性变更）：`common-string` 新增
  `normalizeStyleValue/buildStyleString`，vnode/signal/SSR 三处复用；`check-render-parity`
  扩至 10 断言；负控（注入 px）**8/10** 退出 1。
- **S12** hydration 入口收敛（ADR 0019）：`hydrateApp` 改走 `adapter-web.hydrateVNodeTree`；
  keyed diff 收敛 `common-algorithm.planKeyedDiff`，vdom/dom-runtime 只做 DOM 应用。
  `check-hydration` 52/52；新增 `check-list-diff` 36/36；负控 27/36 退出 1；fast 53 项。
  残留：ssr-island 水合副本已登记。
- ⚠️ `sideEffects:false` 丢弃 `builtin-components` 副作用，core 包级 dist 测试 5 红，归批次0。
- **待决 C3**：`@lytjs/ui` 依赖与 `ARCHITECTURE.md:26` 冲突；S02 只登记 allowlist，待 owner 裁定。

## 11-06 完成
- A15 体积预算；B01 对拍 77/100（`0015` 草稿）；B04 契约红 15→0；B05 各 UI 门禁全绿。

## 下一步
1. 批次0 余项 **S03/S04/S05**（re-export 检查、CI/文档同步、负控框架）+ `sideEffects` 构建问题。
2. ssr-island 内部水合副本收敛（ADR 0019 登记的残留债）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发 / safe-delete 拦 coverage | 单包复核 / reportsDirectory 走仓内 |
