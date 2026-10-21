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
全局 **76.35%**（本轮清掉 `renderer/server/server-components` 138/0%）。
手法：`statementMap` 反查区间；快照 `~/.workbuddy-ai/tmp/cov-1021/`。

## 10-21 完成（6 电池 / 157 守卫）
- **renderer/server/server-components**（32）→ **P1 存储型 XSS**：SSR 数据**原样**嵌进内联
  `<script>`（`JSON.stringify` 不转义 `<`）⇒ 数据含 `</script>` 即闭合标签。另 2 处：`Date` 死代码
  （第二份副本）；生成的 import 指向**不存在的子路径**且两个函数根本不存在 ⇒ 链断（已补齐）。
- **compiler/server-components**（31）→ 产物**跑不起来**：箭头服务端函数 **TDZ**、桩**重复声明**、
  缩进 `'use server'` 静默失效。判据用 `new Function()` 真跑。
- **core-vnode/web-component**（29）→ **P1：`defineCustomElement` 渲染恒为空**（裸调渲染器 ⇒ 无
  `setupChildComponent`；`core` 同样坏）。另 5 处 + 按 **ADR 0011** 把 `core` 副本改纯转发。
- **dom/web-components**：反射回声 ⇒ 两次回调。**ssr/server-components**：`Date` 死代码 + 共享引用
  误判为循环。**renderer 门面**：无缺陷。

## 下一步
1. **非 UI 车道**：Top 缺口已清完 ⇒ **重跑覆盖率重排**再定方向。
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
