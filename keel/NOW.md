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
`async-component.ts`（402 行、覆盖 **4.6%**）补 11 条电池：① `delay` 只当 `=== 0` 开关用 ⇒
loading **立刻**闪出（文档写的是"延迟毫秒"）；② `clearPreloadCache()` 无参清不掉任何东西
（JSDoc 承诺"所有"）。均已修（守卫 8 条 + 3 条 `it.fails`）。
**登记待修（根因已定位到框架层）**：挂载后**视图不切换** ⇒ 探针证实 **`getCurrentInstance()`
在 setup 里返回 null**（**普通子组件也一样**）⇒ 拿不到实例 ⇒ 不触发更新。副作用更大：
**setup 里注册的生命周期钩子（`onBeforeUnmount` 等）会被静默丢弃**。

## 本轮完成（2026-10-16 · enhanced-hydration → 2 个真实缺陷）
① `queueHydration` 首次调用同步排空 ⇒ 高优先级插不到前面；② rIC/IO 在 Safari 与
Node/jsdom 均缺失 ⇒ 抛 `ReferenceError`，且 rIC 在 `await` 内抛 ⇒ 排空循环静默死掉。
修：`onIdle()` 降级；无 IO 时立即水合全部。守卫 18。

## 本轮完成（2026-10-15 · vdom transition → 3 个真实缺陷）
camelCase 调 `getPropertyValue` ⇒ 恒报「无过渡」；enter 类名口径不一致；`d !== '0s'` 字符串判定
⇒ `parseDuration` 返 NaN。守卫 15。

## 下一步
1. **非 UI 车道**继续：`devtools/performance`(429) / `signalsInspector`(421)。
2. **待修（框架层）**：`setup` 期间未设「当前实例」⇒ `getCurrentInstance()` 恒 null ⇒
   生命周期钩子被静默丢弃、异步组件视图不切换（见上）。
3. 按 ADR 0010 判定 UI 剩余登记项（共 28 项）—— 需与它串行。

## 阻塞
| 卡在 | 解锁 | 绕行 |
| --- | --- | --- |
| 覆盖率并发跑互清 .tmp | 串行独占跑 | `ps aux \| grep vitest` 先查 |
| 并行会话共工作区（**它用陈旧副本整体重写 NOW / decisions-INDEX**） | 串行 | 显式路径 git add；**恢复用 `git checkout HEAD -- <file>`** |
