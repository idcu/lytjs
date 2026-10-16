---
scope: now
status: active
last-verified: 2026-10-17
updated: 2026-10-17
keywords: [评估, 门禁, 安全收敛, 硬约束9, 覆盖率, 并行会话, 空渲染, 双包危险, 平行实现, 同一性守卫, 时序事件]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本轮完成（2026-10-17 · devtools/performance 电池 → 1 缺陷 + 1 死代码）
`performance.ts`（812 行、~429 未覆盖）补 **39 条**电池（公开导出面，而 `index.test.ts` 786 行
**一个符号都没引用**）。① **`endTimelineEvent` 静默丢弃嵌套事件（P1）**：
`splice` 把上层未结束的嵌套事件一并移除却**只记录外层** ⇒ 内层永不出现、也无法再收口。修：
逐个隐式收口并**一并记录**；顺带修 `currentDepth`。② `nodeMap` 只写不读 ⇒ 删。

## 本轮完成（2026-10-17 · 立规 0011 + `defineAsyncComponent` 三份收敛为一份）
原有 **3 份平行实现**（component / core / core-vnode），「修复只落一份」实测两次（`delay` 只落
component；`showLoading` 未同步 ⇒ core-vnode 是 core 的**陈旧 fork**）。按 **ADR 0011**：
`@lytjs/component` 为唯一权威实现，其余只**转发**（含类型）、core 独有能力**下沉**；顺带修 core
**漏转** preload 系列。守卫含 2 条**函数同一性**。

## 更早（10-16 / 10-15）
vdom 空渲染崩溃、core loading 失效、误判订正（真因 = src/dist 双包危险）；async `delay`；hydration
rIC/IO 降级；transition 三处。

## 下一步
1. **非 UI 车道**继续：`signalsInspector`(421) —— 同包同款。
2. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
3. 待判定（取舍 vs 缺陷）：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` 被禁用/采样丢弃时返回**假指标**（`id:''`）；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 add；恢复用 `git checkout HEAD -- <file>` |
