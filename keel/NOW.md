---
scope: now
status: active
last-verified: 2026-10-19
updated: 2026-10-19
keywords: [硬约束9, 并行会话, 覆盖率快照]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测（2026-10-18）
全局 **71.25%**；非 UI 未覆盖 Top：`devtools/panel/*` **999 语句 0%**；
`client-server-boundary` 244；`core/create-app` 228；`a11y` 218（**已补 38 条**）。
（`treeShaking` 250 未完成，不测）

## 10-19 完成
- **common-a11y**（38 条）→ 2 缺陷：`isFocusable` 把 **`input[type=hidden]`** 与**无 href 的 `<a>`**
  误判为可聚焦 ⇒ 隐藏输入成为焦点陷阱的 `firstElement`，而 `.focus()` 对它**空操作** ⇒ **初始焦点落空**。

## 10-18 完成（摘要）
- **cli**：`add` 未知类型抛 TypeError；`plugin` 的 `strict` 藏警告却 exit(1)、`warningsAsErrors`
  无效；`generate` 的 `--storybook` 静默空操作。
- **devtools 9 模块** → 6 类缺陷：时序事件丢嵌套、**成环丢边**、`setStoreState` 三类
  谎报成功（含**原型污染**）、`registerVDOMRoot` **id 双生成 ⇒ 死循环**、装饰器丢 `this`、循环引用抛错。
- **过渡生命周期** → **P1**：`doneCallback` 置 null 却**从未调用**；**立规 0011 + 三份收敛**。

## 下一步
1. **非 UI 车道继续核心包**（按实测排序）：`core/create-app`(228) → `component-init`(213) →
   `client-server-boundary`(244)。
2. `devtools/panel/*` **999 语句 0%**：先判断是"扩展 UI"还是该补测。
3. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
4. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric`/`log()` 禁用时返回**假记录**；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言**不被 tsc 验证** ⇒ 类型缺陷靠人工核对 |
