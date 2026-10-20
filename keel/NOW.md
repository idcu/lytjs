---
scope: now
status: active
last-verified: 2026-10-20
updated: 2026-10-20
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测
全局 **72.02%**；非 UI 未覆盖 Top：`devtools/panel/*` **999 语句 0%**、`treeShaking` 250（未完成）、
。
**手法**：用 `statementMap` 反查未覆盖行区间再定点补。
快照在 `~/.workbuddy-ai/tmp/cov-1020/`。

## 10-20 完成
- **component 公共实例代理**（23）→ **P1**：options API 的 `methods`/`computed` **从未装到实例上** ⇒
  `this.m()` 抛 TypeError、**整页空白**。修：`set` 兜底 + `get` 解包 ref。
- **ecosystem/config 转换器**（27）→ `additionalProperties:true` **仍丢键**（无任何拷贝逻辑）；
  `array` 无 `items` ⇒ `items!` 传 undefined ⇒ **TypeError 崩溃**。
- **adapter-web 扩展宿主**（23）→ `onceEventListener` 注销不在 `finally` ⇒ 抛错时监听永久留着。
- **renderer 插件系统**（15）→ `removePlugin()` **只清一条**通道 ⇒ `context.on` 钩子留全局表。
- **devtools 面板**（15）→ `refresh()` **恒为空操作**（`.active` 类从没人加过）。
- **client-server-boundary**（19）→ **全局 API 检测失效**（`\b^fs$\b`）+ `[^}]+` 截断组件体。

## 下一步
1. **非 UI 车道**：`devtools/panel/*` **999 语句 0%** —— 先判断性质（扩展 UI 代码 or 该补测）；
   其余 Top 已清完 ⇒ **重跑覆盖率重排**。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
