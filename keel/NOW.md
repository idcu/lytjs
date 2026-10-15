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

## 本轮完成（2026-10-15 · Pagination 行为电池 20 用例）
`Pagination.ts` **100%**（241/241 语句）。登记 4 处怪癖（修复走决策）：
A) 非受控无 watch，外部 current prop 变化显示不同步；B) layout includes 只管存在性，
渲染顺序写死（'next, prev' 仍 prev 在前）；C) total=0 时 next 不禁用但点击无效；
D) jumper 非法输入静默忽略且保留垃圾值。
实测 stmts 66.10→**66.50** / fns 72.20→72.29 / branches 86.16→86.21，
棘轮 66.5/72.2/86.2（273 文件 / 6505 用例全绿，串行独占）。

## 本轮完成（2026-10-15 · Dialog / Upload / InputNumber 电池）
Dialog 90.5% 登 5 怪癖；Upload 97.6% 登 6 怪癖（inputRef 协议不匹配点击无效等）；
InputNumber 98.0% 登 4 怪癖（dirty 后 setAttribute('value') 失效显示脱节等）。
stmts 64.93→65.31→65.71→66.10。

## 本轮完成（2026-10-15 · TreeSelect / Cascader / Tabs + ADR 0010 首修）
TreeSelect 99.7% 登 5 怪癖；Cascader 99.4% 登 4 怪癖；Tabs 47 用例 98.3%。
ADR 0010 首项 Tabs 受控修复已推送。stmts 63.93→64.45→64.93。新坑 coverage 并发互清。

## 本轮完成（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 112 用例修 12 缺陷。新坑 `date-utc-parse`。

## 下一步
1. 按未覆盖排序继续组件电池：Calendar(214) → Modal(209)。
2. 登记怪癖待决策修复（勿顺手改）：Pagination 4 项、InputNumber 4 项、Upload 6 项、
   Dialog 5 项、TreeSelect 5 项、Cascader 4 项、VaporListRenderer updateItem 死代码、
   serializeData Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区 | 显式路径 git add；coverage 串行 | 提交前 git status 核对 |
