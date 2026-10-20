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

## 覆盖率实测（10-21 三跑）
全局 **76.35%**（73.87% → 76.35%）。非 UI 未覆盖 Top：`treeShaking` 250（未完成，不测）、
`core-vnode/web-component` 165/174(**5%**)、`compiler/server-components` 160/168(**5%**)、
`renderer/server/server-components` 138(**0%**)。
**手法**：`statementMap` 反查未覆盖行区间再定点补。快照 `~/.workbuddy-ai/tmp/cov-1021/`。

## 10-21 完成（3 个电池 / 65 条守卫；明细见日志）
- **dom/web-components**：`setProperty` 反射回声 ⇒ **两次变更回调**。**ssr/server-components**：
  `Date` 分支死代码（`toJSON` 先于 replacer）+ **共享引用被误判为循环**。
- **renderer 门面**（纯测试）：16 个 `await import` 门面逐个调用，**委托链完整、无缺陷**。

## 10-20 摘要（10 个电池 / 206 条守卫；明细见日志与提交历史）
- **router/history**（P1）：空 base ⇒ `//about`（**协议相对 URL**）⇒ `createWebHistory()` **推不动**。
- **component 代理**（P1）：options API 的 `methods`/`computed` **从未装到实例上**。

## 下一步
1. **非 UI 车道**：`core-vnode/web-component`(165) → `compiler/server-components`(160) →
   `renderer/server/server-components`(138)。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` 恒 false；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
