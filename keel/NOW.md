---
scope: now
status: active
last-verified: 2026-10-24
updated: 2026-10-24
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；棘轮只上不下。UI 由并行会话在写 ⇒ 走非 UI 车道。

## 覆盖率实测（10-22 四跑）
全局 **77.26%**。非 UI 未覆盖 Top：`treeShaking` 250、`codegen-signal-optimized` 176/1629。
快照 `~/.workbuddy-ai/tmp/cov-1022/`。

## 10-24 完成（2 电池 / 65 守卫）
- **vdom/transition-group**（28）→ 重载判别靠 props 有没有 `name`：`(el,{},done)` 被判成泛型版
  ⇒ 把 Element 当 host ⇒ `addClass is not a function`（既有测试全传 `{name}`）。DOM 路径另漏 3 处
  （只在泛型版有）：enter 不等过渡（首帧被掐）、`onBefore*`、自定义 `*Class`。
- **tools/test-utils**（37）→ 挂载层**零判据**（既有测试跑 node 环境）。三个 P1：`mount()` 没 await
  core 的 async `app.mount()` ⇒ `vm` 是 Promise、DOM 空、`root` 恒为容器；`options.props` 没进组件；
  `setProps()` 空操作。另 3 处：容器不入文档、`assertEmits` 换 `$emit` 劫持、`spyOn` 变 stub。
  顺带修 component：`app.provide()` 根组件 inject 不到、共用冻结 `EMPTY_OBJ`。⚠️ `mount()` 返回 Promise。

## 下一步
1. **非 UI 车道**：Top 缺口已清完 ⇒ **重跑覆盖率重排**再定方向。
2. 按 ADR 0010 判定 UI 剩余项（28）—— 需串行。
3. 待判定：`resetPerformanceMonitor()` 不重置 `options`；`clearAlerts()` 不清冷却；
   `recordMetric`/`log()` 禁用返回假记录；`canRedo` 恒 false；`suspensible` 从未读取；
   `ServerComponentOptions` 的 3 个输出/前缀选项、HMR 的 `_preservation`/`mounted` 从未读取；
   **`@lytjs/core` 与 `@lytjs/core-vnode` 各有一份 `createApp`**（ADR 0011 第三例）；
   `TransitionGroup` 组件是 pass-through，不调用 vdom 的过渡函数。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行 | `ps aux \| grep vitest` |
| 并行会话共工作区（**反复用 10-15 副本重写 NOW**，曾回退源文件） | 串行 | 显式路径 add；**改完立刻验证文件内容**；恢复 `git checkout HEAD -- <file>` |
| 包级 tsconfig 排除 tests | —— | 类型断言不被 tsc 验证 |
