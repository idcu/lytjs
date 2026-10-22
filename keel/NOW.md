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
`codegen-signal-optimized` 176/1629、`vdom/render-helpers` 135/148(**9%**)。快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-22 完成（2 电池 / 51 守卫）
- **core/composition**（24）→ **`useTemplateRef()` 恒为 null**（watch 读的是**普通对象** `refs`，
  且 refs 在 mount 阶段才写入 ⇒ 除 immediate 外永不重跑）；**`useCssVars()` 依赖从未被收集**
  （首跑在 `vars()` 之前就因 `vnode.el` 为空 return）。既有测试把 `getCurrentInstance` 全 mock 了。
- **reactivity/batch**（27）→ **同步模式对 `undefined` 返回值直接抛错**（void 写法与文件自己的
  JSDoc 示例全跑不通）；异步 `.catch` 里 `throw` ⇒ **unhandledRejection**；`flushBatchScopes()`
  空操作却叫「等待全部完成」（现真等待）；异步出栈 `pop()` 删错对象（改按身份）。

## 10-21 摘要（6 电池 / 157 守卫；明细见日志）
- 两个 P1：SSR 数据注入可被 `</script>` 闭合（XSS）、`defineCustomElement` 渲染恒为空。

## 下一步
1. **非 UI 车道**：`vdom/render-helpers`(135, 9%) → 之后需**重跑覆盖率重排**。
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
