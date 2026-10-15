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

## 本轮完成（2026-10-15 · Dialog 行为电池 30 用例）
`Dialog.ts` 90.5%（268/296 语句）。登记 5 处怪癖（修复走决策）：
A) 初始 modelValue=true 不走 watch（无 immediate）⇒ onOpen/lockScroll 不生效；
B) 从不 emit update:modelValue ⇒ × 关闭后外部仍 true，重开须先 false 再 true；
C) header 插槽分支不渲染关闭按钮（仅 title 分支有）；
D) appendToBody 未在 props 声明被过滤 ⇒ Teleport 分支死代码；
E) 聚焦 effect 的 setTimeout 回调从不执行 ⇒ 自动聚焦与 Tab 焦点陷阱失效（returnFocus 正常）。
实测 stmts 64.93→**65.31** / fns 71.62→71.86 / branches 85.98→86.08，
棘轮 65.3/71.8/86.0（270 文件 / 6427 用例全绿，串行独占）。

## 本轮完成（2026-10-15 · TreeSelect / Cascader / Tabs + ADR 0010 首修）
TreeSelect 26 用例 99.7% 登记 5 怪癖；Cascader 26 用例 99.4% 登记 4 怪癖；Tabs 47 用例 98.3%。
并行会话落地 ADR 0010 首项：Tabs 受控修复（f7b873e2+a7568f07 已推送）。
stmts 63.93→64.45→64.93。新坑 `coverage-concurrent-runs-clobber-tmp`。

## 本轮完成（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 共 112 用例，修 12 缺陷。新坑 `date-utc-parse`。

## 下一步
1. 按未覆盖排序继续组件电池：Upload(225) → InputNumber(224) → Pagination(221) →
   Calendar(214) → Modal(209)。
2. 登记怪癖待决策修复（勿顺手改）：Dialog 5 项、TreeSelect 5 项、Cascader 4 项、
   VaporListRenderer updateItem 死代码、serializeData Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区 | 显式路径 git add；coverage 串行 | 提交前 git status 核对 |
