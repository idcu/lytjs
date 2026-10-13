---
scope: verify
status: active
severity: P2
last-verified: 2026-10-11
triggers: 1
keywords: [bench, 基准, benchmark, vitest, beforeEach, jsdom, OOM, 迭代, 挂载]
---

## 症状

`vitest bench`：① 整套件**产不出数字**（NaN / 空表）；② `beforeEach` 建的 `container`
在 bench 内报 `cannot find element matching selector "undefined"`；③ 中途 `FATAL ERROR: ...
JavaScript heap out of memory`。

## 根因

三机制叠加：① `bench()` **不执行** `beforeEach`/`afterEach` ⇒ 靠它赋值的变量恒 `undefined`；
② 本 vitest 版 `bench(name, fn, options)` **忽略第三参**（设 `iterations:20` 实测跑 149 样本）
⇒ 迭代上限兜不住；③ jsdom 里**挂载型**场景（真实 DOM × 按时间多迭代）持续累积保留节点，必 OOM。

## 正解

- 容器/夹具**在 bench 函数体内就地建**，不放 `beforeEach`；收尾 `app.unmount()` + `container.remove()`（只 `remove` 不停 effect 仍泄漏）。
- **别指望 `bench(name,fn,options)` 限迭代**——要限规模就改数据量（1000 行 → 100 行）。
- 挂载型重负载**不在 jsdom 跑**，走真浏览器 harness。
