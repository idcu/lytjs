---
scope: now
status: active
last-verified: 2026-10-22
updated: 2026-10-22
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **缺陷按 ADR 0010 二分** + **平行实现按 ADR 0011 收敛**；棘轮只上不下。UI 由并行会话在写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-22 四跑）
全局 **77.26%**（76.35% → 77.26%）。非 UI 未覆盖 Top：`treeShaking` 250（未完成）、
`codegen-signal-optimized` 176/1629(89%)、`vdom/render-helpers` 135/148(**9%**)、
`core/composition` 128/182(**30%**)。手法：`statementMap` 反查区间；快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-22 完成（1 电池 / 27 守卫）
- **reactivity/batch**（27）→ **同步模式对 `undefined` 返回值直接抛错**（void 写法与文件自己的
  JSDoc 示例全跑不通；异步分支早已修过、同步漏了）；异步 `.catch` 里 `throw` ⇒ **unhandledRejection**；
  `flushBatchScopes()` 空操作却叫「等待全部完成」（现真等待）；异步出栈 `pop()` 删错对象（改按身份）。

## 10-21 摘要（6 电池 / 157 守卫；明细见日志）
- **renderer/server**（P1 存储型 XSS）：SSR 数据原样嵌 `<script>` ⇒ `</script>` 可闭合。
- **compiler/server**：产物 TDZ / 桩重复声明。**core-vnode/web-component**（P1 渲染恒为空）。
- **dom/web-components**：反射回声两次回调。**ssr**：`Date` 死代码 + 共享引用误判为循环。

## 下一步
1. **非 UI 车道**：`core/composition`(128, 30%) → `vdom/render-helpers`(135, 9%)。
2. 按 ADR 0010 判定 UI 剩余登记项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用时返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退过源文件） | 串行 | 显式路径 add；**改完立刻验证文件内容**；恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 ⇒ 靠人工核对 |
