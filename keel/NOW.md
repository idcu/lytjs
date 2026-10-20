---
scope: now
status: active
last-verified: 2026-10-21
updated: 2026-10-21
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测
全局 **73.87%**（+1.85pt）。非 UI 未覆盖 Top：`treeShaking` 250（未完成）、
`renderer/index` 153。
**手法**：`statementMap` 反查未覆盖行区间再定点补。快照 `~/.workbuddy-ai/tmp/cov-1020b/`。

## 10-21 完成
- **dom/web-components**（25）→ `setProperty` **触发两次变更回调**：反射到 attribute 会**同步**触发
  `attributeChangedCallback`，后者又把同值写回并再通知一次（第二次 oldValue 已是新值）。
- **ssr/server-components**（25）→ 2 缺陷：`safeSerializeState` 的 **Date 分支是死代码**
  （`toJSON` 先于 replacer ⇒ 日期退化成字符串、反序列化回不到 Date）；**共享引用被误判成循环**
  （`seen` 只增不减 ⇒ `{a: shared, b: shared}` 的 b 直接丢数据）。

## 10-20 摘要（10 个电池 / 206 条守卫；明细见日志与提交历史）
- **router/history**（P1）：空 base ⇒ `//about`（**协议相对 URL**）⇒ `createWebHistory()` **推不动**。
- **component 代理**（P1）：options API 的 `methods`/`computed` **从未装到实例上**。
- **time-travel**（P2）：`EventRecord`/`DevToolsEvent` 字段错配 ⇒ **回放失效**；导入先清空 ⇒ **丢录制**。

## 下一步
1. **非 UI 车道**：`renderer/index`(153) → 其余 Top 缺口需**重跑覆盖率重排**。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` 恒 false；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
