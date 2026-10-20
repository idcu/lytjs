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
全局 **73.87%**（+1.85pt）。非 UI 未覆盖 Top：`treeShaking` 250（未完成）、
`router/history` 194/305、`ssr/server-components` 178。
**手法**：`statementMap` 反查未覆盖行区间再定点补。快照 `~/.workbuddy-ai/tmp/cov-1020b/`。

## 10-20 完成（9 个电池 / 183 条守卫）
- **component 代理**（23）→ **P1**：options API 的 `methods`/`computed` **从未装到实例上**。
- **time-travel**（20）→ **P2**：`EventRecord`/`DevToolsEvent` 字段错配 ⇒ **回放失效**；
  `importHistory` 先清空后校验 ⇒ **导入失败丢录制**。
- **performance**（19）→ 慢渲染被记成 `error:captured`（无性能事件类型）⇒ 污染错误率。
- **state-editor**（22）→ 撤销把 `StateValue` 包装对象写回信号；`props.*` 恒 undefined。
- **config 转换器**（27）→ `additionalProperties:true` 丢键；`array` 无 `items` 崩溃。
- **adapter-web**（23）→ `onceEventListener` 注销不在 `finally`。
- **renderer 插件**（15）→ `removePlugin()` 只清一条注册通道。
- **devtools 面板**（15）→ `refresh()` 恒为空操作。
- **client-server-boundary**（19）→ 全局 API 检测失效 + 组件体截断。

## 下一步
1. **非 UI 车道**：`router/history`(194) → `ssr/server-components`(178) → `dom/web-components`(166)。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` 恒 false；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
