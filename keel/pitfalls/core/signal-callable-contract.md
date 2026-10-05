---
scope: core
status: active
severity: P1
last-verified: 2026-10-05
triggers: 2
keywords: [signal, 可调用对象, Symbol.for, 品牌标记, 插值, codegen, toDisplayString]
---

## 症状

- 文档写 `count(count()+1)`（调用即写入）→ **静默无效**，页面数字不变；
- 模板插值 `{{ count }}` 输出**整个函数源码**，点击也不更新。

## 根因

本仓 `signal()` 是**可调用对象**（`sig()` 取值 / `sig.set()` / `sig.update()`，
**没有 `.value`**）。品牌标记若是 `Symbol(...)` 则无法跨包识别（vdom 不依赖 reactivity）；
`toDisplayString` 把可调用 signal 当普通值 stringify，且未建立依赖。

## 正解

- 写入一律 `.set()/.update()`；文档先核对本仓契约再抄；
- 跨包识别用 `Symbol.for('lytjs:signal')`（vdom 侧识别后 `val()` 一次调用同时取值 + track）；
- 同构先例：`common-vnode` 的 `Symbol.for('Teleport')`。
