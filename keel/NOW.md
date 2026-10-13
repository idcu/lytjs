---
scope: now
status: active
last-verified: 2026-10-13
updated: 2026-10-13
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y]
---

# NOW · main

## 当前焦点
全维度评估整改全量推进：P0/P1/P2 + §8.2 已闭合；keel 监管/自我演进已加固；权威基线（含 build）全绿。

## 本轮完成（2026-10-13 · UI 行为电池 → 4 个真实缺陷）
对**随包发布且未测**的 UI 组件写行为电池，挖出并修 **4 个真实缺陷**：
① `common-dom/patchAttr` 把 `false` 当 `null` ⇒ 所有 `aria-*` 的 false 被移除（违反 WAI-ARIA）；
② `Slider` 把 `handleKeydown` 同时挂根与把手 ⇒ 按键冒泡**双触发**（一次 ArrowRight 走 2 步）；
③ `Slider` 的 `emit('input')` 后又直接调 `props.onInput` ⇒ 回调**双触发**（该修法只加在一处）；
④ `Slider` 的 `showTooltip=false` ⇒ **把手整个不渲染**（失去焦点与键盘入口）。
新增 `e2e-select`(22) / `e2e-slider`(20) 用例；②③④ 教训并入坑 `parallel-impl-only-one-fixed`（三形态）。

## 本轮完成（2026-10-13 · 权威基线 + 类型检查闭环 + 死代码清理）
首跑全量 `type-check` 暴露 2 个潜伏类型错误（vitest 只转译 ⇒ 本地「全绿」漏过）⇒ 新坑 `typecheck-gap`；
`build` 补跑通过；可达性分析删 6 个死文件 787 行 ⇒ 新坑 `coverage-zero-is-not-dead`；棘轮只上调。

## 本轮完成（2026-10-12 · 砍包决策 + 覆盖率棘轮 + 死代码第一批）
ADR 0007：**不全量合并 common 子包** ⇒ §8.2 四步闭合；删 2 个死文件 530 行。

## 更早（2026-10-10 ~ 10-11）
P0/P1/P2 整改、安全收敛、残留 XSS 修复、§8.2 第三/四步（事件收敛 / AOT / benchmark）、keel 监管加固
（test-lint 入 CI + check-keel-wiring）—— 详见 `NOW-history/`。

## 下一步
1. `keel/pitfalls/INDEX.md` 已贴顶（2993/3000）：**第 29 条坑无处安放** ⇒ 需 owner 决定提高
   `BYTES_DOMAIN_INDEX`（走 ADR）或改结构（去列 / 分域）。
2. 覆盖率长尾仍大（statements 60.95%）：继续对**随包发布**的组件写行为电池（Slider 一轮即挖出 4 个缺陷）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
