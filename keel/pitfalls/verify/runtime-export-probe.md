---
scope: verify
status: distilled
severity: P2
last-verified: 2026-10-05
triggers: 3
keywords: [导出面, 探针, Object.keys, 重导出, grep 不可靠, core 转出]
---

## 症状

`grep 'export function X'` 判 21 个 reactivity API"全缺"——实际全在 `export {}` 重导出列表里；
"core 不转出"因此被误判三次。

## 根因

文本匹配看不见重导出。

## 正解

- 判定 API 本体是否存在，用 10 行探针：`await import(dist)` + `Object.keys()` 逐个 `includes()`；
- 文档 import 门禁同理：扫文档里的具名 import，对**实际导出面**断言；
- 已并入 CONSTITUTION 硬约束 8。
