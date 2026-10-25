---
scope: now
status: active
last-verified: 2026-10-25
updated: 2026-10-25
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；棘轮只上不下。UI 走非 UI 车道。

## 覆盖率（10-25 全量：323 文件 / 7650 用例全绿）
行 **80.18%** / 语句 80.00%（79.42% → +0.76pt；新增 4 电池后待复测）。
⚠️ 全量报表对**同被 src 与 dist 引用**的文件会低估（`devtools/performance.ts` 55.66% vs 独测
89.29%）⇒ **定方向前先单包复核**。

## 10-25 完成（4 电池 / 45 守卫）
- **devtools/performance 生命周期**（13）→ `reset()` **不重置 options**；重复 `init()`
  **叠加 PerformanceObserver**（一个长任务记 N 次）；`recordMetric` 未入库返回
  `{id:'',timestamp:0}` 空壳。改：观察器登记表 + 重入先断开 + 未入库返回 `null`。
- **renderer/server-components-client**（21）→ `createServerProxy` 是 `callServer` 的**第二份实现**
  ⇒ `configureServerAction()` 的 endpoint/headers/onError 在**主路径**全失效；`getServerData`
  无 `window` 时 `ReferenceError`；`getHydrationState` 交出内部对象。
- **compiler/server-components**（+5）→ `serverFunctionPrefix` 声明未读 ⇒ 接线（两侧同一 id）；
  删 `serverOutputDir`/`clientOutputDir`（本模块不写文件，结构上不可能生效）。
- **component/TransitionGroup**（+6）→ `tag` 恒不包裹 ⇒ 实现；16 个过渡 prop 未接线 ⇒ DEV 告警。
- 删 `PluginTesterOptions.appConfig.performance`（无消费者）；修乱码注释。

## 下一步
1. 重跑覆盖率（含新电池）→ 按**单包独测**复核 Top 缺口再定方向。
2. 待判定：`clearAlerts()` 不清冷却（已定为**限流器语义**，不修）；`suspensible`（ADR 0011 已登记）；
   HMR `_preservation`/`mounted`；core 与 core-vnode 各有 `createApp`（ADR 0011 第三例，需搬包）；
   `optimizations/treeShaking.ts` 459 行**0 引用 0 测试**（待定删/接线）。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发跑互清 .tmp | 单包独测复核 |
| 并行会话共工作区（反复重写 NOW，曾回退源文件） | 显式路径 add；改完立刻验证 |
| `--coverage` 清 `coverage/` 被 safe-delete 拦 | `--coverage.reportsDirectory=/tmp/…` |
