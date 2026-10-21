---
scope: now
status: active
last-verified: 2026-10-21
updated: 2026-10-21
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-21 三跑）
全局 **76.35%**。非 UI 未覆盖 Top：`treeShaking` 250、`renderer/server/server-components` 138(**0%**)。
手法：`statementMap` 反查区间；快照 `~/.workbuddy-ai/tmp/cov-1021/`。

## 10-21 完成（5 电池 / 125 守卫）
- **compiler/server-components**（31）→ 产物**跑不起来**：箭头形式服务端函数命中 **TDZ**
  （Reference 常量插在源码之前）；同名 server fn + data fetcher ⇒ 桩**重复声明**；缩进过的
  `'use server'` 不被识别（静默变 null）。判据用 `new Function()` 真跑。
- **core-vnode/web-component**（29）→ **P1：`defineCustomElement` 渲染恒为空**（裸调渲染器 ⇒ 无
  `setupChildComponent` ⇒ `mountComponent` 直接 return；`core` 同样坏）。另 5 处：非法标签名抛错、
  布尔无值属性判假、slot 回调泄漏、属性变更不重渲染、卸载钩子重复。
  顺带按 **ADR 0011** 把 `core` 副本改为**纯转发**。
- **dom/web-components**：`setProperty` 反射回声 ⇒ 两次回调。**ssr/server-components**：`Date` 死代码
  + 共享引用误判为循环。**renderer 门面**：无缺陷。

## 下一步
1. **非 UI 车道**：`renderer/server/server-components`(138, 0%) → 之后需**重跑覆盖率重排**。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
