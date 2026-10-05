---
scope: verify
status: active
severity: P1
last-verified: 2026-10-05
triggers: 1
keywords: [假绿, 自证, 跳过, 期望, 水合, data-ssr-id, 判据]
---

## 症状

测试通过，但生产路径从未被验证：测试**手写**了生产不会产生的输入；甚至把
"全部被跳过"（`skippedNodes > 0`）写成了期望。

## 根因

判据自己造输入 ⇒ 自证式假绿（`data-ssr-id` 全仓无人写入，测试却手写它）。

## 正解

- 判据必须走**真实产物**（如 `renderToString` 的实际输出），不手写中间态；
- 见到"断言被跳过 / 无变化"的用例，先问：**它是不是把缺陷写成了期望**；
- 已提炼进 CONSTITUTION 硬约束 2。
