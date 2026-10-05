---
scope: verify
status: active
severity: P2
last-verified: 2026-10-05
triggers: 1
keywords: [hydration, 水合, 判据, 对照, 假绿, DOM]
---

## 症状

"水合成功"的判据恒绿：vnode 产物与既有 DOM 完全一致 ⇒ 匹配场景覆盖一切。

## 根因

判据里"新产物"与"既有 DOM"没有差异，无法区分"匹配"与"碰巧相同"。

## 正解

- hydration 类判据必须让**新产物与既有 DOM 不同**（改文本 / 结构），再断言差异被正确协调；
- 一致性判据（多入口产出对比）是最强形态：任何一次分叉都会暴露。
