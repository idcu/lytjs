---
scope: now
status: active
last-verified: 2026-10-17
updated: 2026-10-17
keywords: [评估, 硬约束9, 并行会话, 双包危险, 平行实现, 同一性守卫, 时序事件, 依赖图, 过渡生命周期, 原型污染]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本日完成（2026-10-17）
- **devtools/storeInspector**（28 条）→ 2 缺陷：`setStoreState` **三类谎报成功**（写的是 `store`
  顶层而读的是 `$state` ⇒ 普通对象形态直接失效；空路径 / 中间段不存在照样 true；
  **无原型污染防护**）；`getStoreStates()` 用 `$id` 覆盖注册键 ⇒ 与 `getStoreState()` id 不一致、
  「列表 → 写值」静默失败。
- **过渡生命周期**（`vdom/transition.ts` + `TransitionEngine`）20 条 → **P1**：
  `finishEnter`/`finishLeave` 把 `doneCallback` 置 null 却**从未调用** ⇒ 泛型路径的 `done`
  **永不触发**（离开的元素不被移除）；DOM 回退是另一套实现、**有**调 done。
- **devtools 两文件**（`performance` 39 条 / `signalsInspector` 47 条）→ 3 缺陷 + 1 死代码：
  时序事件 `splice` 丢弃嵌套事件；布局图**成环丢边**；`getSubgraph` 改写全局注册表。
- **立规 0011 + `defineAsyncComponent` 三份收敛为一份**（权威实现收在 `@lytjs/component`，其余只转发）。
  10-15~16 轮已蒸馏至 `NOW-history/`。

## 下一步
1. **非 UI 车道**继续：devtools 其余模块（`componentTree` / `vdomInspector` / `debugEnhancer` /
   `benchmark`）—— 同包同款，均未被 `index.test.ts` 引用。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 待判定（取舍 vs 缺陷）：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` 返回**假指标**；`getTimeTravelState().canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 add；恢复用 `git checkout HEAD -- <file>` |
