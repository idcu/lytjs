---
scope: now
status: active
last-verified: 2026-10-17
updated: 2026-10-17
keywords: [评估, 硬约束9, 覆盖率, 并行会话, 双包危险, 平行实现, 同一性守卫, 时序事件, 依赖图]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本轮完成（2026-10-17 · devtools 两文件电池 → 3 缺陷 + 1 死代码）
两文件此前**无测试引用**（同包 `index.test.ts` 786 行）。`performance.ts` 39 条：
① `endTimelineEvent` 的 `splice` 把上层未结束的嵌套事件一并移除却**只记录外层** ⇒ 内层数据静默
丢失（修：逐个隐式收口并记录）；② `nodeMap` 只写不读 ⇒ 删。
`signalsInspector.ts` 47 条：① 布局图的边「边算边找」⇒ **成环时静默丢边**（`a⇄b` 只得 1 条；
修：先定位全部节点再统一生成边）；② `getSubgraph` 作为**读** API 临时删空全局注册表 ⇒ 子图高度
虚增（修：改用子图视图）。devtools 154/154。

## 本轮完成（2026-10-17 · 立规 0011 + `defineAsyncComponent` 三份收敛为一份）
原有 **3 份平行实现**（component / core / core-vnode），「修复只落一份」实测两次（`delay` 只落
component；`showLoading` 未同步 ⇒ core-vnode 是**陈旧 fork**）。按 **ADR 0011**：权威实现收在
`@lytjs/component`，其余只**转发**（含类型）、core 独有能力**下沉**；顺带修 core **漏转** preload。

## 下一步
1. **非 UI 车道**继续：devtools 其余模块（`componentTree` / `vdomInspector` / `storeInspector` /
   `debugEnhancer` / `benchmark`）—— 同款。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 待判定（取舍 vs 缺陷）：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` 返回**假指标**；`getTimeTravelState().canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 add；恢复用 `git checkout HEAD -- <file>` |
