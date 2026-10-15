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

## 本轮完成（2026-10-15 · Upload 行为电池 29 用例）
`Upload.ts` 97.6%（241/247 语句）。登记 6 处怪癖（修复走决策）：
A) inputRef 形状 {current} 不匹配 setRef 协议（要 value 键）⇒ trigger 点击打不开文件选择；
B) onload 里 JSON.parse 非法响应抛错在 try/catch 外 ⇒ 卡 uploading、onError 不调；
C) 达 limit 静默拒绝无任何回调；D) remove 不 abort XHR，回调仍触发 onChange；
E) disabled 只挡点击不挡拖拽；F) multiple=false 时 drop 仍可多文件。
实测 stmts 65.31→**65.71** / fns 71.86→72.07 / branches 86.08→86.10，
棘轮 65.7/72.0/86.1（271 文件 / 6456 用例全绿，串行独占）。

## 本轮完成（2026-10-15 · Dialog 电池 30 用例）
`Dialog.ts` 90.5%（268/296），登记 5 怪癖（初始 true 不走 watch / 无 update:modelValue /
header 插槽无 × / appendToBody 死代码 / 聚焦 setTimeout 不执行）。stmts 64.93→65.31。

## 本轮完成（2026-10-15 · TreeSelect / Cascader / Tabs + ADR 0010 首修）
TreeSelect 99.7% 登 5 怪癖；Cascader 99.4% 登 4 怪癖；Tabs 47 用例 98.3%。
ADR 0010 首项 Tabs 受控修复已推送（f7b873e2+a7568f07）。stmts 63.93→64.45→64.93。
新坑 `coverage-concurrent-runs-clobber-tmp`。

## 本轮完成（2026-10-13~14 · UI 电池 → 12 个真实缺陷）
Select/Slider/Menu/ColorPicker/DatePicker 112 用例修 12 缺陷。新坑 `date-utc-parse`。

## 下一步
1. 按未覆盖排序继续组件电池：InputNumber(224) → Pagination(221) →
   Calendar(214) → Modal(209)。
2. 登记怪癖待决策修复（勿顺手改）：Upload 6 项、Dialog 5 项、TreeSelect 5 项、
   Cascader 4 项、VaporListRenderer updateItem 死代码、serializeData Date 分支死代码。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑（已入坑库） | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区 | 显式路径 git add；coverage 串行 | 提交前 git status 核对 |
