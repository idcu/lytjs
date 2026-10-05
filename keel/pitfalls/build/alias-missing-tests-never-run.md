---
scope: build
status: active
severity: P1
last-verified: 2026-10-05
triggers: 1
keywords: [vitest, alias, 收集阶段, Tests 全绿, 门禁, 从未执行]
---

## 症状

"Tests N passed" 全绿，但部分文件根本没跑：文件计数显示 failed，用例计数里却没有它们
（实测借此找回 **297 个从未执行的测试**）。

## 根因

alias 指向**不存在的构建产物** ⇒ 文件在**收集阶段**就失败，收集失败不计入 Tests 计数。

## 正解

- 门禁 `check-vitest-alias-dist`：断言每个 `@lytjs/*` alias 目标存在，区分"缺构建 / 死 alias"，
  配棘轮白名单；
- 判测试真跑了看**文件数**，不要只看 Tests 数。
