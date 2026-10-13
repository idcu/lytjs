---
scope: now
status: active
last-verified: 2026-10-14
updated: 2026-10-14
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏]
---

# NOW · main

## 当前焦点
全维度评估整改全量推进：P0/P1/P2 + §8.2 已闭合；keel 监管/自我演进已加固；权威基线（含 build）全绿。

## 本轮完成（2026-10-14 · 环境坑蒸馏 + ADR 0008）
坑 `sandbox-safe-delete-block` triggers=3 ⇒ keel-lint 报「待蒸馏」。内核「**环境失败 ≠ 代码缺陷**」
提炼进 CONSTITUTION「人审关卡」表（新增一行），坑置 `distilled`，告警消失。依据见 `decisions/0008`。

## 本轮完成（2026-10-13 · UI 行为电池 → 4 个缺陷）
对**随包发布且未测**的 UI 组件写行为电池，挖出并修 **4 个真实缺陷**：
① `common-dom/patchAttr` 把 `false` 当 `null` ⇒ 所有 `aria-*` 的 false 被移除（违反 WAI-ARIA）；
② `Slider` 的 `handleKeydown` 同时挂根与把手 ⇒ 按键冒泡**双触发**（一次 ArrowRight 走 2 步）；
③ `Slider` 的 `emit('input')` 后又直接调 `props.onInput` ⇒ 回调**双触发**（该修法只加在一处）；
④ `Slider` 的 `showTooltip=false` ⇒ **把手整个不渲染**（失去焦点与键盘入口）。
新增 `e2e-select`(22) / `e2e-slider`(28)；②③④ 并入坑 `parallel-impl-only-one-fixed`。

## 本轮完成（2026-10-13 · 权威基线 + 类型检查闭环 + 死代码清理）
首跑全量 `type-check` 暴露 2 个潜伏类型错误（vitest 只转译 ⇒ 本地「全绿」漏过）⇒ 新坑 `typecheck-gap`；
`build` 补跑通过；可达性分析删 6 个死文件 787 行 ⇒ 新坑 `coverage-zero-is-not-dead`；棘轮只上调。

## 更早（2026-10-10 ~ 10-12）
P0/P1/P2 整改、安全收敛、残留 XSS、§8.2 第三/四步（事件收敛/AOT/benchmark）、keel 监管加固
（test-lint 入 CI + check-keel-wiring）、ADR 0007 —— 详见 `NOW-history/`。

## 下一步
1. `pitfalls/INDEX.md` 已贴顶（2991/3000）：**第 29 条坑无处安放** ⇒ 需 owner 决定提高
   `BYTES_DOMAIN_INDEX`（走 ADR）或改结构（去列 / 分域）。
2. 覆盖率长尾仍大（statements 61.56%）：继续对**随包发布**的组件写行为电池（两轮已挖出 4 个缺陷）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
