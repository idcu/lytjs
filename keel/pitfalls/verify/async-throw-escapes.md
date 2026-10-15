---
scope: verify
status: active
severity: P2
last-verified: 2026-10-16
triggers: 1
keywords: [not.toThrow, 异步抛, await, 静默死掉, 假绿, Promise, rejects]
---

## 症状

用 `expect(() => fn()).not.toThrow()` 判定「不该抛」，而 `fn` 内部有 `await` ⇒ 抛错发生在
**微任务**里 ⇒ 同步断言**看不到**，测试**假绿**。实测（2026-10-16）：`queueHydration` 缺
`requestIdleCallback` 时抛 `ReferenceError`，`not.toThrow()` 仍通过；真实后果是排空循环
**静默死掉**（后续任务永不执行）。

## 根因

`expect(...).not.toThrow()` 只捕获**同步**抛出。async 函数体内的抛错变成**被拒绝的 Promise**，
若无人 await / 捕获 ⇒ 既不冒泡到断言，通常只表现为 unhandled rejection。

## 正解

- 测 async 路径要断言**可观测的后续行为**（如「再入队一个任务，它仍应被执行」），
  而不是只断言「没抛」；
- 判据：凡「不该抛 / 不该失败」的断言，追问一句 **「它真抛了的话，我会看到什么？」**——
  答不上来就说明该断言太弱；
- 写法：async 版用 `await expect(fn()).rejects.toThrow()`。
