---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（UI 组件行为电池）+ **登记缺陷按 ADR 0010 二分处置**；棘轮只上不下。

## 本轮完成（2026-10-15 · Tabs 四处缺陷修复 + ADR 0010）
ADR 0010 定规：登记缺陷**二分** —— 违背已声明契约的是**缺陷**（按 ADR 修 + 补守卫），
其余是**取舍**（交 owner）。按此口径 Tabs 四条**全是缺陷** ⇒ 已修：非受控 / 受控同步改为
「仅 `modelValue` 变化时同步」（此前每次渲染强制拉回第一个）；补 `emit('update:modelValue')`；
`role=tablist` 只留 header（原为 2 个嵌套）；`handleKeydown` 只挂 tablist 容器（原冒泡双触发）。
守卫 4 条（修复前全红）；`e2e-tabs` 51/51。

## 本轮完成（2026-10-15 · Cascader 26 / Tabs 47 / TreeSelect（进行中）电池）
`Cascader.ts` 99.4%、`Tabs.ts` 98.3%。Cascader 登记 4 怪癖（**待按 ADR 0010 判定**）：
option 冒泡 toggle（点父级反而关）/ 无 children 需显式 isLeaf / 过滤态只渲一级 / load 不写 signal。

## 本轮完成（2026-10-13~15 · UI 电池累计）
Select/Slider/Menu/ColorPicker/DatePicker 修 12 缺陷（`patchAttr` false 当 null、Slider 键盘双触发、
Menu 口径不一致、ColorPicker 下拉打不开 / `onChange` 不调、DatePicker 数组快捷失效 / UTC 偏移）。
新坑 `date-utc-parse`、`negative-evidence`；坑库归档 2991→1983B（ADR 0009）。

## 下一步
1. 继续组件电池：TreeSelect → Dialog → Upload → InputNumber → Pagination → Calendar → Modal。
2. 按 ADR 0010 判定剩余登记项：Cascader 4 怪癖、`VaporListRenderer updateItem` 死代码、
   `serializeData` Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| **并行会话共用同一工作目录**（双方在途未提交文件会被对方 `git add -A` 卷走） | 约定分工 / 串行 | **只用显式路径 `git add`**，绝不用 `-A`；`coverage/` 不可同时跑 |
