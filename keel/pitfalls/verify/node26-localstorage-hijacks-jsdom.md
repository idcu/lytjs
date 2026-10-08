---
scope: verify
status: active
severity: P1
last-verified: 2026-10-09
triggers: 1
keywords: [Node26, localStorage, jsdom, vitest, 假失败, 存储]
---

## 症状

Node ≥26 本机上 vitest 的 jsdom 存储用例**假失败**：`isStorageAvailable()` 恒 false、
`setItem` 静默 no-op；同一代码在 CI（Node 22）全绿 —— **本机红、CI 绿**。

## 根因

Node ≥26 内置了 `localStorage` 全局（未配 `--localstorage-file` 时为空实现）；
vitest `populateGlobal` 只注入「Node 全局里不存在」的 window 键，而 `localStorage`
不在其 KEYS 白名单 ⇒ **jsdom 自己的 localStorage 被跳过**，`window.localStorage`
拿到的是 Node 的空实现。

## 正解

- `vitest.setup.ts` 里把 `globalThis.jsdom.window.localStorage` 接回全局
  （非 jsdom 环境零影响；Node 22 下等价覆盖）；
- **别改产品源码** —— 源码「不可用即返回 false」的行为正确，错在测试环境；
- 判据：存储类用例须在**本机（新 Node）与 CI（旧 Node）双绿**才算绿。