---
scope: core
status: active
severity: P1
last-verified: 2026-10-10
triggers: 1
keywords: [判定, 条件, 分支, 不一致, undefined, data-v-undefined, scoped]
---

## 症状

同一语义在两处各写了一遍条件，两处**不等价**。落在第二支时消费方拿到 `undefined`，
产物里出现 `undefined` 字面量（如 `[data-v-undefined]`），**静默失效且不报错**。

## 根因

"是否作用域"被写了两遍：算 id 处是 `scopedId = scoped ? id : undefined`；判是否作用域处是
`shouldScope = scoped === true || (scoped === undefined && style.scoped)`。
第二支（未显式传 `scoped` 且 style 块自带该属性）下 `shouldScope` 为真而 `scopedId` 为
`undefined` ⇒ `scopeCSS(css, undefined)` 产出 `[data-v-undefined]`：**所有组件共用同一个
scope 属性**，隔离完全失效。测试只覆盖显式传 `scoped: true` 的那一支，恰好绕开。

## 正解

- 判定抽成**单一表达式**先算出值，再让两处消费**同一个值**；
- 测试必须覆盖**每一支**——"未显式传"往往才是默认路径；
- 产物出现 `undefined` 字面量视为**硬缺陷信号**，可做成门禁正则。
