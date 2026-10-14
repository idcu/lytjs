---
scope: now
status: active
last-verified: 2026-10-15
updated: 2026-10-15
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚：对随包发布的 UI 组件逐个写行为电池（六轮累计 13 个真实缺陷）；棘轮只上不下。

## 本轮完成（2026-10-15 · Tabs 行为电池 47 用例）
`e2e-tabs.test.ts`：渲染/aria、受控点击、键盘导航（方向/Home/End/Enter/Space/Delete/Backspace、
跳过 disabled）、关闭/新增/拖拽。`Tabs.ts` 98.3%（353/359，分支 96/96）。Tabs 是受控组件
⇒ 测试用 signal 回写 modelValue。登记缺陷：非受控时渲染强制 activeIndex 回第一个
（Tabs.ts:288，修复走单独决策）。实测 stmts 63.39→**63.93** / fns 70.93→71.24 /
branches 85.71→85.81，棘轮上调至 63.9/71.2/85.8（267 文件 / 6341 用例全绿）。提交 `beb8710f`。

## 本轮完成（2026-10-13~14 · UI 行为电池 → 12 个真实缺陷）
Select 22 / Slider 28 / Menu 17 / ColorPicker 24 / DatePicker 21 用例，修 12 缺陷：
`patchAttr` false 当 null（aria-* 违反 WAI-ARIA）；Slider 键盘双触发 / showTooltip=false 把手消失；
Menu 渲染键盘口径不一致 / uniqueOpened 公告读不到；ColorPicker 下拉打不开 / onChange 不调 /
无 update:modelValue；DatePicker 数组快捷项失效 / date 型 modelValue 无效 / UTC 偏移。
新坑 `date-utc-parse`；`check-ui-props-wiring` 误报修复。

## 更早（2026-10-10 ~ 10-14）
P0/P1/P2 整改、安全收敛、残留 XSS、§8.2、keel 监管加固、ADR 0007/0008/0009、type-check 闭环、
死代码清理 1317 行、坑库归档（INDEX 2991→1983B）、环境坑蒸馏入 CONSTITUTION。

## 下一步
1. 按未覆盖排序继续组件电池：Cascader(293) → TreeSelect(268) → Dialog(239) → Upload(225) →
   InputNumber(224) → Pagination(221) → Calendar(214) → Modal(209)。
2. 登记缺陷待决策修复：Tabs 非受控重置（本轮）、VaporListRenderer updateItem 死代码、
   serializeData Date 分支死代码（10-09 登记）。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| （无） | — | — |
