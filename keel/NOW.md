---
scope: now
status: active
last-verified: 2026-10-16
updated: 2026-10-16
keywords: [评估, 门禁, 安全收敛, 硬约束9, AOT, keel监管, type-check, a11y, 蒸馏, 归档, 覆盖率, 并行会话]
---

# NOW · main

## 当前焦点
覆盖率长尾攻坚（行为电池）+ **登记缺陷按 ADR 0010 二分**；棘轮只上不下。UI 由并行会话在写 ⇒
走**非 UI 包**车道。

## 本轮完成（2026-10-16 · defineAsyncComponent 2 修 + 1 登记）
`async-component.ts`（402 行、覆盖 **4.6%**）补 11 条电池（含 3 条 `it.fails`）：
① `delay` 只当 `=== 0` 开关用 ⇒ loading **立刻**闪出（文档写的是"延迟毫秒"）；修：delay>0 时超时才显示。
② `clearPreloadCache()` 无参清不掉任何东西（JSDoc 承诺"所有"）；修：加 `preloadedLoaders` Set。
**登记待修**：挂载异步组件后**视图不切换** ⇒ 根因在重渲染没发生（`triggerComponentUpdate`
的"回退到 nextTick"未实现，可参照 `component-proxy.ts` 的 `$forceUpdate`）。

## 本轮完成（2026-10-16 · enhanced-hydration → 2 个真实缺陷）
① `queueHydration` 首次调用同步排空 ⇒ 高优先级插不到前面（实测 low,high,medium）；
② rIC/IO 在 Safari 与 Node/jsdom 均缺失 ⇒ 抛 `ReferenceError`；rIC 在 `await` 内抛 ⇒
排空循环静默死掉。修：`onIdle()` 降级；无 IO 时立即水合全部。守卫 18；renderer 489/489。

## 本轮完成（2026-10-15 · vdom transition → 3 个真实缺陷）
camelCase 调 `getPropertyValue` ⇒ 恒报「无过渡」；enter 类名口径不一致；`d !== '0s'` 字符串判定
⇒ `parseDuration` 返 NaN。守卫 15。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421) /
   `client-server-boundary`(244)。
2. **待修缺陷**（已实测）：`defineAsyncComponent` 挂载后视图不切换（见上）。
3. 按 ADR 0010 判定 UI 剩余登记项（共 28 项）—— 需与它串行。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
