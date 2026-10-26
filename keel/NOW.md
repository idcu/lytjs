---
scope: now
status: active
last-verified: 2026-10-26
updated: 2026-10-26
keywords: [硬约束9]
---

# NOW · main

## 当前焦点
覆盖率长尾（行为电池）+ 缺陷按 ADR 0010 二分 + 平行实现按 ADR 0011 收敛；只上不下。

## 覆盖率（10-25 四跑：330 文件 / 7791）
行 **81.65%** / 分支 87.28% / 函数 86.14%（79.42% → **+2.23pt**）。
⚠️ 全量报表对**同被 src 与 dist 引用**的文件会低估 ⇒ **定方向前先单包复核**。


## 10-25/26 完成（21 电池 / 328 守卫）
- **错误链**：`handleError` 无人处理时静默 ⇒ setup/生命周期/data/computed/watch/render 全不留痕。
- **路由**：RouterLink / RouterView 的 render 都返回非 vnode ⇒ 入口出口都渲染不出东西。
- **中间件链**：`await next()` 不返回时下游再下发 ⇒ **2^N 次** `finalHandler`。
- **KeepAlive**：`matchesPattern` 的 `g`/`y` 正则未重置 `lastIndex` ⇒ 时而缓存时而丢弃。
- **DI**：`inject()` 找不到就抛（签名却是 `T | undefined`）；`provideTransient` 实为单例。
- **其它**：api 方法裸子串、`useModel` 静默失败、ErrorBoundary `fallback` 未读、devtools 门面 0% 覆盖。
- **纯补判据**：VirtualList / router-fs / 前六电池。
- **SSR 流**：`totalBytes` 按**字符**累加（中文只有 1/3）；`http2Push`/`deferThreshold`/
  `compression` 声明+默认值却未读 ⇒ 已删。
- **事件总线**：`once()` 存 wrapper，`off(原始函数)` 删不掉 ⇒ 监听无法取消、闭包泄漏。
- **水合**：`setup` 返回渲染函数时组件被**整体跳过**（服务端 HTML 原样留着，看似正常但没接上）；
  `setup` 第二参是 `undefined` ⇒ 解构 `{ slots }` 直接崩。
- 删 `optimizations/treeShaking.ts`（459 行桩）；ADR 0011 第三例（`createApp`）不合并。

## 下一步
1. 选点判据「跨层 / 状态机 / 并发」：`ssr-island`（岛屿激活）。
2. UI 车道**接不了**：并行会话在改 `TreeSelect`，需 owner 明确分工后再动。
3. 待办：`suspensible`；vapor-hmr `_preservation` 未读；devtools `startRecording` 只是标志位；
   `provideTransient` 在组件内等同单例。

## 阻塞
| 卡在 | 绕行 |
| --- | --- |
| 覆盖率并发跑互清 .tmp | 单包独测复核 |
| `--coverage` 清 `coverage/` 被 safe-delete 拦 | `--coverage.reportsDirectory=/tmp/…` |
