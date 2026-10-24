---
scope: now
status: active
last-verified: 2026-10-24
updated: 2026-10-24
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；棘轮只上不下。UI 由并行会话写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-24 五跑）
全局 **79.42%**（+2.16pt）。非 UI 未覆盖 Top：`treeShaking` 250（未完成）、
`codegen-signal-optimized` 176、`devtools/panel/performance` 123、`dom-runtime/index` 115、
`ssr/ssr-stream` 108、`core/plugin-sdk` 103/158(**35%**)。快照 `~/.workbuddy-ai/tmp/cov-1024/`

## 10-24 完成（4 电池 / 101 守卫）
- **dom-runtime/events**（20）→ 模块**未从入口导出**、无消费方（0%）；同一容器只能委托
  **一种**事件类型（监听器只在首次创建、闭包写死 eventType）⇒ `click`+`input` 示例跑不通。
- **devtools/signalsInspector**（16）→ **时间旅行没有游标**：`canRedo` 恒 false、`forward()` 恒空操作。
- **vdom/transition-group**（28）→ 重载判别靠 props 有没有 `name` ⇒ `(el,{},done)` 被当成泛型版、
  `addClass is not a function`；DOM 路径另漏 enter 等待、`onBefore*`、自定义 `*Class`。
- **tools/test-utils**（37）→ 挂载层零判据。三个 P1：`mount()` 没 await core 的 async `mount()`
  ⇒ `vm` 是 Promise；`props` 没进组件；`setProps()` 空操作。⚠️ `mount()` 改返回 Promise。

## 下一步
1. **非 UI 车道**：`core/plugin-sdk`(103, 35%) → `renderer/ssr/ssr-stream`(108, 58%)。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`suspensible` 从未读取；`ServerComponentOptions`
   的 3 个输出选项、HMR 的 `_preservation`/`mounted` 从未读取；**core 与 core-vnode 各有一份
   `createApp`**（ADR 0011 第三例）；`TransitionGroup` 组件是 pass-through。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；改完**立刻验证文件内容** |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 |
