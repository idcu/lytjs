---
scope: verify
status: active
severity: P1
last-verified: 2026-10-16
triggers: 1
keywords: [双包危险, alias, dist, 模块级状态, currentInstance, 假缺陷]
---

## 症状

同一测试里**被测代码取 `../src`**、**框架原语取 `@lytjs/core`**（alias → **dist**）⇒ 两侧
**模块级变量**是两份、互不可见。实测（2026-10-16）：`@lytjs/core` 的 `createApp` 挂载
`../src/async-component` 的组件时，包装器里 `getCurrentInstance()` **恒 null** ⇒ 不触发重渲染
⇒ 据此**误登记**了「框架层缺陷」（错，已订正）。

## 根因

`getCurrentInstance` 读写模块级变量；`@lytjs/component` alias 到 dist、`../src/...` 走源码
⇒ 两个模块实例。判据：`srcGet === distGet` 为 **false**。

## 正解

- 被测组件与挂载原语**必须同一模块实例**：包内测试用 src 级原语
  （`createComponentInstance` + `setupComponent`），端到端判据另放**全 dist** 文件；
- 凡「模块级状态读不到 / 单例失效」，先问**「两边是同一个模块实例吗」**（`f1===f2` 即可验）；
- 判「框架层缺陷」前，必须在**全 dist 路径**复现（用户走 dist）。
