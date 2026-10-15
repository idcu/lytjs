---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚：对随包发布的 UI 组件逐个写行为电池（七轮累计 14 个真实缺陷/怪癖）；棘轮只上不下。

## 本轮完成（2026-10-15 · Cascader 行为电池 26 用例）
`e2e-cascader.test.ts`：渲染/aria、开合、逐级单选、懒加载、多选标签、清除、过滤。
`Cascader.ts` 99.4%（317/319，分支 96/100）。登记 4 处怪癖（修复走单独决策）：
① option 点击无 stopPropagation，冒泡到根再 toggle（点父级反而关）；
② 无 children 必须显式 isLeaf 才可选；③ 过滤态只渲一级，嵌套命中不可见；
④ load resolve 原地改 children 不写 signal，需下一次信号变化才出子面板。
实测 stmts 63.93→**64.45** / fns 71.24→71.41 / branches 85.81→85.89，
棘轮 64.4/71.4/85.8（268 文件 / 6367 用例全绿）。

## 本轮完成（2026-10-15 · Tabs 行为电池 47 用例）
`e2e-tabs.test.ts`：渲染/aria、受控点击、键盘导航、关闭/新增/拖拽。
`Tabs.ts` 98.3%（353/359）。Tabs 受控 ⇒ 测试用 signal 回写 modelValue。
登记缺陷：非受控时渲染强制 activeIndex 回第一个（Tabs.ts:288）。
stmts 63.39→63.93，棘轮 63.9/71.2/85.8。

## 本轮完成（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 共 112 用例，修 12 缺陷：
`patchAttr` false 当 null（aria 违规）；Slider 键盘双触发；Menu 键盘口径不一致；
ColorPicker 下拉打不开/onChange 不调；DatePicker 快捷数组失效/UTC 偏移。新坑 `date-utc-parse`。

## 下一步
1. 按未覆盖排序继续组件电池：TreeSelect(268) → Dialog(239) → Upload(225) →
   InputNumber(224) → Pagination(221) → Calendar(214) → Modal(209)。
2. 登记缺陷待决策修复（勿顺手改）：Cascader 4 怪癖、Tabs 非受控重置、
   VaporListRenderer updateItem 死代码、serializeData Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
