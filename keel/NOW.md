---
scope: now
status: active
last-verified: 2026-10-18
updated: 2026-10-18
keywords: [硬约束9, 并行会话, 平行实现, 同一性守卫, 时序事件, 依赖图, 过渡生命周期, 原型污染, 漏转, 死循环, 别名泄漏]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本日完成（2026-10-17 ~ 10-18）
- **`@lytjs/devtools` 全包 9 个模块至此都有行为判据**（7 个新电池、共 204 条）→ 挖出 **6 类真实缺陷**：
  时序事件 `splice` 丢弃嵌套；布局图**成环丢边**；`setStoreState` 三类谎报成功（含**原型污染**）；
  `registerVDOMRoot` **id 双生成 ⇒ `getVDOMPath` 死循环**；装饰器**丢 `this`**；检查点 / 序列化遇
  **循环引用**抛错；`getBenchmarkResults` 别名泄漏。
- **过渡生命周期**（20）→ **P1**：`finishEnter`/`finishLeave` 把 `doneCallback` 置 null 却**从未调用**
  （泛型路径的 `done` 永不触发）。
- **立规 0011 + `defineAsyncComponent` 三份收敛**（权威实现收在 `@lytjs/component`）；
  `index.ts` 漏转 14 个 VDOM 函数已补。10-15~16 轮已蒸馏至 `NOW-history/`。

## 下一步
1. **非 UI 车道**下一批：`tools/cli` 的 `generate` 命令（~280 未覆盖）；`compiler` 的
   `optimizations/treeShaking`（~250 未覆盖，**先查有无调用方**，无则按死代码处置）。
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
