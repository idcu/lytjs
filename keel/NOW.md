---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚：UI 组件逐个写行为电池；登记缺陷按 ADR 0010 逐个决策修复；棘轮只上不下。

## 本轮完成（2026-10-15 · TreeSelect 行为电池 26 用例）
`TreeSelect.ts` 99.7%（293/294，分支 80/82）。登记 5 处怪癖（修复走决策）：
A) multiple 只落类名无多选交互；B) 父节点点击即选中；C) 过滤不自动展开；
D) selectedLabel 死代码 signal；E) value 受控语义。
新坑 `coverage-concurrent-runs-clobber-tmp`：并发跑覆盖率互清 .tmp，数字作废（实测 -0.64pp）。
实测 stmts 64.45→**64.93** / fns 71.41→71.62 / branches 85.89→85.98，
棘轮 64.9/71.6/85.9（269 文件 / 6397 用例全绿，串行独占复测值）。

## 进行中（并行会话 · 未提交）
ADR 0010 落地：Tabs 非受控重置已修（同步仅跟 modelValue 变化 + 补 emit update:modelValue），
工作区含 Tabs.ts / e2e-tabs.test.ts / decisions/0010 未提交改动。

## 本轮完成（2026-10-15 · Cascader / Tabs 电池）
Cascader 26 用例 99.4%，登记 4 怪癖（冒泡双 toggle / isLeaf 约定 / 过滤只渲一级 /
load resolve 不写 signal）；Tabs 47 用例 98.3%。stmts 63.39→63.93→64.45。

## 本轮完成（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 共 112 用例，修 12 缺陷：
`patchAttr` false 当 null（aria 违规）；Slider 键盘双触发；Menu 键盘口径不一致；
ColorPicker 下拉打不开/onChange 不调；DatePicker 快捷数组失效/UTC 偏移。新坑 `date-utc-parse`。

## 下一步
1. 按未覆盖排序继续组件电池：Dialog(239) → Upload(225) → InputNumber(224) →
   Pagination(221) → Calendar(214) → Modal(209)。
2. 登记怪癖待决策修复（勿顺手改）：TreeSelect 5 项、Cascader 4 项、
   VaporListRenderer updateItem 死代码、serializeData Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
