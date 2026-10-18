---
scope: now
status: active
last-verified: 2026-10-18
updated: 2026-10-18
keywords: [硬约束9, 并行会话, 平行实现, 同一性守卫, 过渡生命周期, 原型污染]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。
UI 由并行会话在写 ⇒ 走**非 UI 包**车道。

## 本日完成（2026-10-17 ~ 10-18）
- **cli/plugin**（14）→ 2 缺陷：`strict` 下**藏警告却 exit(1)**（失败不可解释）；`warningsAsErrors`
  **完全无效**（只在「已有 errors」的分支里被读到，只有警告时照样 exit 0）。
- **cli/generate**（19）→ `--storybook` **静默空操作** ⇒ 改为**显式警告**（沿用 sfc 先例）。
- **devtools 全包 9 个模块都有行为判据**（7 个电池）→ 6 类真实缺陷：时序事件丢嵌套、布局图**成环丢边**、`setStoreState` 三类谎报成功（含**原型污染**）、
  `registerVDOMRoot` **id 双生成 ⇒ 死循环**、装饰器**丢 `this`**、循环引用抛错。
- **过渡生命周期**（20）→ **P1**：`finishEnter`/`finishLeave` 把 `doneCallback` 置 null 却**从未调用**。
- **立规 0011 + `defineAsyncComponent` 三份收敛**；`index.ts` 漏转 14 个 VDOM 函数已补。

## 下一步
1. **非 UI 车道**：`tools/cli` 其余（`build` / `dev` / `test`；`add`(359)；`buildPlugin` 需 mock 子进程）。
2. `compiler/optimizations/treeShaking` **不测**：文件头 2026-09 审计：未接入管线、外部引用 0 次 ⇒ 未完成功能，测了会制造"已支持"错觉。
3. 按 ADR 0010 判定 UI 剩余登记项（28 项）—— 需与它串行。
4. 待判定：`resetPerformanceMonitor()` **不重置 `options`**；`clearAlerts()` **不清冷却**；
   `recordMetric` / `log()` 禁用时仍返回**假记录**；`canRedo` **恒 false**；`suspensible` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**反复用 10-15 陈旧副本重写 NOW**） | 串行 | 显式路径 add；**每次收尾都查 `git status`**，恢复用 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 测试里的类型断言**不被 tsc 验证** ⇒ 类型缺陷靠人工核对 |
