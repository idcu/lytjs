---
scope: verify
status: active
severity: P1
last-verified: 2026-11-09
triggers: 1
keywords: [单包测试, vitest alias, dist, 身份对拍, 假红, core-vnode]
---

## 症状

`pnpm --filter @lytjs/core test` 里 core / core-vnode「同名函数身份一致」用例红，
而 `pnpm vitest run packages/core/tests`（根配置）同用例绿；stash 后基线同样红。

## 根因

单包 `packages/core/vitest.config.ts` 主包 alias 大多仍指 `dist`，且**没有**
`@lytjs/core-vnode` 别名。测试直接 import `../../core-vnode/src/h`（src），
而 `core/src/h` 转发 `@lytjs/core-vnode/h` 解析到 `dist/h.mjs` ⇒ 两个模块实例，
`Object.is` 必为 false，与本次改动无关。

## 正解

- 跨包身份 / 生命周期对拍用**根配置**（根 alias 全指 src），单包配置只跑包内断言；
- 单包测试报红先 `git stash` 复跑基线，区分「既有噪声」与「本次引入」；
- 修配置属另一类改动，不要为了让它绿而放宽 `toBe` 断言。
