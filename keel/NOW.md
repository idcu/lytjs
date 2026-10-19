---
scope: now
status: active
last-verified: 2026-10-20
updated: 2026-10-20
keywords: [硬约束9, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 覆盖率实测（2026-10-20）
全局 **72.02%**；非 UI 未覆盖 Top：`devtools/panel/*` **999 语句 0%**、`treeShaking` 250（未完成）、
`renderer/index` 223、`web-host-extended` 196。
**手法**：用 `coverage-final.json` 的 `statementMap` 反查**未覆盖行区间**再定点补。
快照在 `~/.workbuddy-ai/tmp/cov-1020/`。

## 10-20 完成
- **devtools 面板**（15 条）→ `refresh()` **恒为空操作**（查的 `.active` 类**从没人加过**）⇒
  数据不刷新、重开仍是旧内容。改用实例字段记录。
- **component 公共实例代理**（23 条）→ **P1**：options API 的 `methods` / `computed` **从未装到
  实例上**（`finishComponentSetup` 往 `ctx[key]` 赋值，代理 `set` 只允许 setupState/data）⇒
  `this.myMethod()` 抛 TypeError、**整页空白**。修：`set` 兜底写实例（`$` 前缀仍拒）+ `get` 解包 ref。
- **compiler/client-server-boundary**（19 条）→ 2 根因 + 1 连带：**全局 API 检测整体失效**
  （锚点模式被拼成 `\b^fs$\b`）；`[^}]+` **在首个 `}` 截断** ⇒ `componentsToSplit` 恒空；
  连带修 `import 'document';`。

## 下一步
1. **非 UI 车道继续核心包**：`renderer/index`(223) → `web-host-extended`(196)。
2. `devtools/panel/*` **999 语句 0%**：先判断是"扩展 UI"还是该补测。
3. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
4. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric`/`log()` 禁用时返回**假记录**；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**） | 串行 | 显式路径 add；**收尾必查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
