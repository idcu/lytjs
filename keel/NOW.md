---
scope: now
status: active
last-verified: 2026-10-18
updated: 2026-10-18
keywords: [评估, 硬约束9, 并行会话, 平行实现, 同一性守卫, 时序事件, 依赖图, 过渡生命周期, 原型污染, 漏转, 死循环]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本日完成（2026-10-17 ~ 10-18）
- **devtools/vdomInspector**（28）→ **P1** + 3 + 漏转：`registerVDOMRoot` **生成两个 id**
  （根被注册两次、`parentId` 指向丢弃的 id ⇒ **`getVDOMPath` 死循环**）；Text/Fragment 的
  **symbol 类型**被归为 `unknown`（文本在面板消失）；`findVDOMNodesByProp` 用 `in` 查原型链；
  `index.ts` **14 个函数一个都没转出**（面板文案却让用户调它）。
- **devtools/storeInspector**（28）→ 2 缺陷：`setStoreState` **三类谎报成功**（写 `store` 顶层
  而读 `$state`；空路径 / 中间段不存在照样 true；**无原型污染防护**）；`getStoreStates()` 用 `$id`
  覆盖注册键 ⇒ 与 `getStoreState()` id 不一致。
- **过渡生命周期**（20 条）→ **P1**：`finishEnter`/`finishLeave` 把 `doneCallback` 置 null 却
  **从未调用** ⇒ 泛型路径的 `done` 永不触发。
- **devtools 两文件**（`performance` 39 / `signalsInspector` 47）→ 3 缺陷 + 1 死代码。
- **立规 0011 + `defineAsyncComponent` 三份收敛**（权威实现收在 `@lytjs/component`）。
  10-15~16 轮已蒸馏至 `NOW-history/`。

## 下一步
1. **非 UI 车道**继续：devtools 其余模块（`componentTree` / `debugEnhancer` / `benchmark`）。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 待判定（取舍 vs 缺陷）：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` 返回**假指标**；`getTimeTravelState().canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**每次收尾都查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
