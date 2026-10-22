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
全局 **77.26%**。非 UI 未覆盖 Top：`treeShaking` 250、
`codegen-signal-optimized` 176/1629、`renderer/vapor/vapor-hmr` 132/175(**25%**)。快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-22 完成（3 电池 / 91 守卫）
- **vdom/render-helpers**（40）→ **`toHandlerKey` 没做 kebab→camel** ⇒ 编译产物的事件键与
  `emit()` 查找键对不上（模板写 kebab 事件名收不到）；`createStaticVNode` **多造节点**（水合错位）；
  `renderList` 遇负数/小数抛 **RangeError**；`_isVList` 可枚举污染；RegExp 退化成 `{}`。
- **core/composition**（24）→ **`useTemplateRef()` 恒为 null**（watch 读普通对象 `refs`，除 immediate
  外永不重跑）；**`useCssVars()` 依赖从未被收集**（首跑在 `vars()` 前就 return）。既有测试全 mock。
- **reactivity/batch**（27）→ 同步模式对 `undefined` 返回值抛错（void 写法全跑不通）；异步
  `.catch` 里 `throw` ⇒ **unhandledRejection**；`flushBatchScopes()` 空操作却叫「等待完成」。

## 10-21 摘要（6 电池 / 157 守卫）
- 两个 P1：SSR 注入可被 `</script>` 闭合（XSS）、`defineCustomElement` 渲染恒为空。

## 下一步
1. **非 UI 车道**：`renderer/vapor/vapor-hmr`(132, 25%) → `vdom/patch`(141, 67%)。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；**改完立刻验证文件内容**；恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 |
