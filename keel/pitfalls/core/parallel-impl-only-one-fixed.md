---
scope: core
status: active
severity: P1
last-verified: 2026-10-10
triggers: 0
keywords: [平行实现, core-vnode, 只修一处, 生命周期钩子]
---

## 症状

同一能力一条路径正常、另一条完全不生效，且不报错、测试全绿。
实测：4 个生命周期钩子在 `@lytjs/core` 正常，`@lytjs/core-vnode` 上**一个都不触发**。

## 根因

仓里有**两条平行的 createApp**（`core/src/create-app.ts` 与 `core-vnode/src/create-app.ts`），
各自向 vdom 注入回调。2026-09-26 修钩子时只改了 core 那份；
vdom 侧是 `ctx.invokeMountedHook?.()` **可选调用** ⇒ 没注入就静默跳过。
根因是**同族副本未被识别为同一缺陷的多个载体**。

## 正解

- 修"某能力不生效"先 grep **消费点**再 grep **写入点**：写入点有几个就改几个
  （本例消费点在 vdom，写入点只有 core，漏了 core-vnode）；
- 平行实现要有**对称性判据**：每条路径各写一条断言真实行为的用例（core-vnode 此前零断言 ⇒ 缺陷隐身）；
- 判"修好"按硬约束 2 走完整链，并断言钩子**各恰好一次**（同时挡住重复触发）。
