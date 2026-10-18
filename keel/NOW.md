---
scope: now
status: active
last-verified: 2026-10-18
updated: 2026-10-18
keywords: [硬约束9, 并行会话, 过渡生命周期, 原型污染, 覆盖率快照]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测（2026-10-18，此前一直用 10-15 旧快照）
全局 **71.25%**；非 UI 未覆盖 Top：`tools/devtools/panel/*` **999 语句 0%**
；`compiler/client-server-boundary` 244/326；`core/create-app` 228/417；
`renderer/index` 223/238；`common/a11y` 218/365；`component/component-init` 213/275。
（`treeShaking` 250 属未完成功能，不测。）

## 本日完成（10-17 ~ 10-18）
- **cli**：`add` 未知类型抛 **TypeError**、报错只列 3/8 种；`plugin` 的 `strict` **藏警告却 exit(1)**、
  `warningsAsErrors` **无效**；`generate` 的 `--storybook` **静默空操作**。
- **devtools 9 模块**（7 个电池）→ 6 类缺陷：时序事件丢嵌套、**成环丢边**、`setStoreState` 三类谎报成功（含**原型污染**）、
  `registerVDOMRoot` **id 双生成 ⇒ 死循环**、装饰器**丢 `this`**、循环引用抛错。
- **过渡生命周期** → **P1**：`doneCallback` 置 null 却**从未调用**；**立规 0011 + 三份收敛**。

## 下一步
1. **非 UI 车道转向核心包**（按实测排序）：`common/a11y`(218) → `core/create-app`(228) → `component-init`(213) →
   `client-server-boundary`(244)。
2. `devtools/panel/*` **999 语句 0%**：先判断是"扩展 UI 代码"还是该补测。
3. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需与它串行。
4. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` / `log()` 禁用时仍返回**假记录**；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言**不被 tsc 验证** ⇒ 类型缺陷靠人工核对 |
