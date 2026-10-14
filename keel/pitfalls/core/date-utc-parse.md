---
scope: core
status: active
severity: P2
last-verified: 2026-10-14
triggers: 1
keywords: [Date, UTC, 时区, 日期串, new Date, 区间, 偏移]
---

## 症状

按「日期串」传入的日期在**非 UTC 时区**整体偏移，使比较类逻辑错判。实测（2026-10-14）：
`DatePicker` 的 `daterange` 传 `['2026-10-03','2026-10-06']` 时，**终点当天 10-06 也被判进区间**
（`--in-range` 实测 `['4','5','6']`，期望 `['4','5']`）。

## 根因

`new Date('YYYY-MM-DD')` 按 **UTC 午夜**解析（ES 规范：date-only 形式视为 UTC），
而日历格子里是 `new Date(y, m, d)`（**本地** 00:00）。GMT+8 下两者差 8 小时 ⇒
`isInRange` 的 `date < end` 对「终点当天」成立。
**UTC 时区下不复现** —— 这正是它长期隐身的原因。

## 正解

- 解析 `YYYY-MM-DD` 一律走**本地构造**：先正则匹配，再 `new Date(y, m-1, d)`，不要直接 `new Date(str)`；
- 判据：涉及时区的日期用例必须**断言区间端点**（不只是"能选中"），且 CI 应跑**非 UTC 时区**；
- 同类：`new Date('YYYY-MM-DDTHH:mm')`（无 `Z`）按**本地**、带 `Z` 按 UTC —— 不要混用两种来源。
