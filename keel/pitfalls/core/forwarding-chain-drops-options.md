---
scope: core
status: distilled
severity: P1
last-verified: 2026-10-05
triggers: 4
keywords: [转发链, extraOptions, 中间层, 静默丢弃, adapter-web, createTransformContext]
---

## 症状

上游新增回调 / 字段后，下游拿到的仍是旧值或 undefined；中间层不报错、测试也不红。

## 根因

`core → adapter-web → vdom` 是一条"Pick + 逐字段转发"链（`extraOptions` →
`createTransformContext` → `createDOMRenderer`）。新字段不在**每一层**显式转发，就在中间层
被静默丢弃——同一模式已现 4 次（事件/class/style、水合、props 各一轮）。

## 正解

- 新增回调 / 字段必须**沿整条链 grep**，从入口改到最底层，禁止只改一端；
- 找同族副本按**被调用点**搜（`grep -rn "component\.(render\|setup)(" packages/renderer/src`），
  不要按函数名搜；
- 已提炼进 CONSTITUTION 硬约束 7。
