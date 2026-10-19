---
scope: now
status: active
last-verified: 2026-10-20
updated: 2026-10-20
keywords: [硬约束9, 并行会话, 原型污染, 覆盖率快照, 未覆盖行区间, 正则锚点]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测（2026-10-20）
全局 **72.02%**；非 UI 未覆盖 Top：`devtools/panel/*` **999 语句 0%**、`treeShaking` 250（未完成，不测）、
`renderer/index` 223、`devtools.ts` 218、`component-init` 213、`web-host-extended` 196、
`config-transformer` 195。**手法**：用 `coverage-final.json` 的 `statementMap` 反查**未覆盖行区间**再定点补，别通读猜。
快照留在 `~/.workbuddy-ai/tmp/cov-1020/`（约 7MB，供后续轮次复用）。

## 10-20 完成
- **compiler/client-server-boundary**（19）→ 2 根因 + 1 连带：**全局 API 检测整体失效**
  （锚点模式被拼成 `\b^fs$\b` ⇒ 只有整个源文件恰好等于 `fs` 才匹配 ⇒ `*Imports` 恒空、
  类型误判、函数级归属恒空）；`defineComponent` 的 `[^}]+` **在首个 `}` 截断** ⇒ 带 `props` 的
  组件永远扫不到生命周期钩子（`componentsToSplit` 恒空）；连带修生成器产出 **`import 'document';`**。

（10-19 及更早的成果见工作日志 `2026-10-19.md` 等与 git 历史。）

## 下一步
1. **非 UI 车道继续核心包**：`component-init`(213) → `devtools.ts`(218) → `renderer/index`(223)。
2. `devtools/panel/*` **999 语句 0%**：先判断是"扩展 UI"还是该补测。
3. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
4. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric`/`log()` 禁用时返回**假记录**；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言**不被 tsc 验证** ⇒ 类型缺陷靠人工核对 |
