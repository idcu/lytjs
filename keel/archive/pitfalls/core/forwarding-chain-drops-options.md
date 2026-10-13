---
scope: core
status: archived
severity: P1
last-verified: 2026-10-10
triggers: 5
keywords: [转发链, 静默丢弃, createTransformContext, directiveTransforms]
---

## 症状

上游新增字段后下游拿到旧值或 undefined，中间层不报错、测试也不红。
公开选项没反应：`compile({directiveTransforms})` 的自定义 transform 一次都不被调用。

## 根因

`core → adapter-web → vdom` 是"Pick + 逐字段转发"链。新字段不在**每一层**显式转发即静默丢弃——
同模式已现 5 次（事件、水合、props、`scopeId`、`directiveTransforms`）。
第 5 次（2026-10-10）：`transform()` 的选项已由 `{...restOptions}` 铺开，
但 `createTransformContext` 是**逐字段显式构造** ⇒ 没写进去的字段全消失。

## 正解

- 新增字段沿**整条链 grep**；同族副本按**被调用点**搜，不按函数名搜；
- **逐字段构造的对象是重灾区**：改 options 类型时回头核对那个 `{…}` 字面量；
- 判"公开选项真生效"用**可观测副作用探针**，别只看类型定义（硬约束 8）；
- 已提炼进 CONSTITUTION 硬约束 7。
