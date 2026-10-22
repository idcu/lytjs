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
`codegen-signal-optimized` 176/1629、`vdom/patch` 141/423(67%)。快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-22 完成（4 电池 / 123 守卫）
- **vapor/vapor-hmr**（32）→ **生成的 accept 回调是空操作**（只赋值 `instance.component` + 空注释，
  没有任何东西观察它 ⇒ HMR「接受」但界面不变）；**id 未转义** ⇒ 含 `'`/`\`/换行时生成的文件语法错误。
- **vdom/render-helpers**（40）→ **`toHandlerKey` 没做 kebab→camel** ⇒ 事件键与 `emit()` 对不上；
  `createStaticVNode` 多造节点；`renderList` 负数抛 **RangeError**；`_isVList` 可枚举；RegExp 退化。
- **core/composition**（24）→ **`useTemplateRef()` 恒为 null**；**`useCssVars()` 依赖从未被收集**。
- **reactivity/batch**（27）→ 同步模式对 `undefined` 返回值抛错；异步 `.catch` 里 `throw` ⇒
  **unhandledRejection**；`flushBatchScopes()` 空操作；异步出栈删错对象。

## 10-21 摘要（6 电池 / 157 守卫）：两个 P1 —— SSR 注入 XSS、`defineCustomElement` 渲染恒为空。

## 下一步
1. **非 UI 车道**：`vdom/patch`(141, 67%) → `adapter-web/web-dom-renderer`(142, 45%)。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项、HMR 的 `_preservation`/`mounted` 从未读取。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；**改完立刻验证文件内容**；恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 |
