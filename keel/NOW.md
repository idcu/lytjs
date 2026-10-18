---
scope: now
status: active
last-verified: 2026-10-18
updated: 2026-10-18
keywords: [硬约束9, 并行会话, 平行实现, 同一性守卫, 时序事件, 依赖图, 过渡生命周期, 原型污染, 漏转, 死循环]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本日完成（2026-10-17 ~ 10-18）
- **devtools/debugEnhancer**→ 3：`measurePerformance` **丢 `this`**（装饰对象方法即坏）；
  检查点遇**循环引用**直接抛（连带比较也比不了）；`createDebugger` 返回类型藏掉 `metadata`。
- **devtools/vdomInspector**→ **P1** + 3 + 漏转：`registerVDOMRoot` **生成两个 id** ⇒ 根注册两次、
  `parentId` 指向丢弃的 id ⇒ **`getVDOMPath` 死循环**；symbol 类型被归为 `unknown`（文本消失）；
  `findVDOMNodesByProp` 用 `in` 查原型链；`index.ts` **14 个函数没转出**。
- **devtools/storeInspector**→ 2：`setStoreState` **三类谎报成功**（写 `store` 顶层而读 `$state`、
  空路径/中间段不存在仍 true、**无原型污染防护**）；`getStoreStates()` 与 `getStoreState()` id 不一致。
- **过渡生命周期**（20）→ **P1**：`finishEnter`/`finishLeave` 把 `doneCallback` 置 null 却**从未调用**。
- **devtools 两文件**（39+47）→ 3 + 1 死代码；**立规 0011 + 三份收敛**。

## 下一步
1. **非 UI 车道**继续：devtools 剩余 `componentTree` / `benchmark`。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 待判定（取舍 vs 缺陷）：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` / `log()` 在禁用时仍返回**假记录**；`getTimeTravelState().canRedo` **恒 false**；
   `suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**每次收尾都查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 测试里的类型断言**不被 tsc 验证** ⇒ 类型缺陷靠人工核对 |
