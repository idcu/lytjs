---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（UI 组件行为电池）+ **登记缺陷按 ADR 0010 二分**；棘轮只上不下。

## 本轮完成（2026-10-15 · ADR 0010 两处"死代码"登记项 → 均判为缺陷并修复）
① `VaporListRenderer.updateItem`：调 `diffLists` **未传 compareFn** ⇒ `diff.updated` 恒空 ⇒
该分支**永不执行**（公开选项静默失效）。修：`VaporListOptions` 增 `compareFn?` 并转发。
② `serializeData` 的 Date 分支：`JSON.stringify` **先调 `toJSON()`** ⇒ replacer 收到 ISO 串 ⇒
`instanceof Date` 恒假 ⇒ `__type:'Date'` 协议对 Date 失效。修：改用 `this[key]` 取原始值。
守卫 3 + 6 条（修复前红）；dom-runtime 177/177、renderer 471/471、tsc ✅、dist 已重建。
另修坑 `commitlint-rules` 悬空引用；shim 改放 `~/.cache`（`/tmp` 会被清）。

## 本轮完成（2026-10-15 · UI 电池 7 轮 → 14 个缺陷/怪癖）
Cascader 26 / Tabs 47 / TreeSelect 26 / Dialog 30 / Upload 29 / InputNumber 29 / Pagination 20 用例。
**ADR 0010 首项**：Tabs 四处（非受控重置 / 无 `update:modelValue` / 嵌套 tablist / 键盘双触发）
已修 + 4 守卫。棘轮 66.5/72.2/86.2。

## 更早（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 112 用例修 12 缺陷（`patchAttr` false 当 null、Slider
键盘双触发、ColorPicker 下拉打不开、DatePicker 数组快捷失效 / UTC 偏移）；新坑 `date-utc-parse`、
`negative-evidence`；坑库归档 2991→1983B（ADR 0009）。

## 下一步
1. 继续组件电池：Calendar(214) → Modal(209)。
2. 按 **ADR 0010** 判定剩余登记项：Pagination 4 / InputNumber 4 / Upload 6 / Dialog 5 /
   TreeSelect 5 / Cascader 4 项。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX，覆盖他人改动**） | 串行；或它写前先重读 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`**（索引可能已被污染） |
