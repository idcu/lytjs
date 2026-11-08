---
scope: verify
status: active
severity: P1
last-verified: 2026-11-09
triggers: 2
keywords: [单包测试, vitest alias, dist, 身份对拍, 假红, 共享别名源]
---

## 症状

`pnpm --filter @lytjs/core test` 中 core/core-vnode「同名函数身份一致」红，
根配置同用例绿；stash 后基线同样红。

## 根因

单包 alias 多指 dist 且缺 `@lytjs/core-vnode`。测试 import `../../core-vnode/src/h`，
而 `core/src/h` 转发 `@lytjs/core-vnode/h` 解析到 dist ⇒ 两个模块实例，`Object.is` false。

## 正解

- 跨包身份对拍用根配置（全指 src）；单包只跑包内断言。
- 报红先 `git stash` 复跑基线，区分既有噪声与本次引入。
- 修配置，不放宽 `toBe`。

## 已修

- S31：core 改 mergeConfig(根配置)；storage 补 setupFiles；54/54 绿。
- S32：别名表抽到 `vitest.shared.ts`，30 份单包配置改为引用共享源，54/54 绿。
  注意：文本解析/注入 alias 的守卫与负控需同步迁源，否则报「守卫失效/注入点漂移」。
