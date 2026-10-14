---
scope: now
status: active
last-verified: 2026-10-14
updated: 2026-10-14
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档]
---

# NOW · main

## 当前焦点
全维度评估整改全量推进：P0/P1/P2 + §8.2 已闭合；keel 监管/自我演进/坑库容量已加固；权威基线（含 build）全绿。

## 本轮完成（2026-10-14 · 坑库归档 + ADR 0009）
`pitfalls/INDEX.md` 贴顶（2991/3000）⇒ 按 keel 自身设计（`_template.md` 写明 `archived（已移入 archive/）`、
`hot_files()` 排除 `*/archive/*`）把 10 个 `distilled` 坑移入 `keel/archive/pitfalls/`、改 `archived`、
删 INDEX 行 ⇒ **2991 → 1983 字节**（≈10 条余量），**不放宽预算**。

## 本轮完成（2026-10-14 · 环境坑蒸馏 + ADR 0008）
坑 `sandbox-safe-delete-block` triggers=3 ⇒「待蒸馏」。内核「**环境失败 ≠ 代码缺陷**」提炼进
CONSTITUTION「人审关卡」表，坑置 `distilled`（已随归档）。依据见 `decisions/0008`。

## 本轮完成（2026-10-13~14 · UI 行为电池 → 12 个真实缺陷）
对**随包发布且未测**的 UI 组件写行为电池（Select 22 / Slider 28 / Menu 17 / ColorPicker 24 /
DatePicker 21 用例），修 **12 个缺陷**：
① `patchAttr` 把 `false` 当 `null` ⇒ 所有 `aria-*` 的 false 被移除（违反 WAI-ARIA）；
②③ `Slider` 键盘冒泡 / 回调**双触发**；④ `Slider` 的 `showTooltip=false` ⇒ **把手不渲染**；
⑤⑥ `Menu` 渲染/键盘**口径不一致**、`uniqueOpened` 公告**读不到**；
⑦⑧⑨ `ColorPicker` 默认**下拉打不开**、`onChange` 从未调用、无 `update:modelValue`；
⑩⑪⑫ `DatePicker` 数组快捷项**静默失效**、`modelValue` 对 `date` 型**无效**、日期串**按 UTC 偏移**。
另修判据：`check-ui-props-wiring` 误报 `emit('x')` 接线（注入验证会红）。新坑 `date-utc-parse`。

## 更早（2026-10-10 ~ 10-13）
P0/P1/P2 整改、安全收敛、残留 XSS、§8.2 第三/四步、keel 监管加固、ADR 0007、`type-check` 闭环、
死代码清理 1317 行。

## 下一步
1. 覆盖率长尾仍大（statements 63.39%）：继续对**随包发布**的组件写行为电池（五轮已挖出 12 个缺陷）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
