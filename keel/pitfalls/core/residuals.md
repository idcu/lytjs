---
scope: core
status: active
severity: P1
last-verified: 2026-11-09
triggers: 1
keywords: [transformOn, v-show, v-if, v-for, signal]
---

## 症状

- 破坏 `transforms/on.ts` 的 `transformOn`，v-on 修饰符测试仍全绿。
- `v-show="a ? b : c"` 产物缺括号，条件真时 style 取 `true`。
- 优化版 signal 下 `<div v-if><li v-for>` 得空 `<div></div>`，文本 `''`。

## 根因

- 内建 v-on 走 `transform-element.ts` 的 `handleVOn`；`transformOn` 只覆盖非元素分支，是死路径。
- `transformShow` 直接拼 `${exp} ? …`，三元右结合致优先级错。
- v-if 分支序列化在优化路径上整体丢 v-for 子节点。

## 正解

- 负控打 `handleVOn`（改 `guardModifiers` 过滤 → `@keyup.enter` 变红）；不变红即路径未触达。
- v-show 改 `(${exp}) ? undefined : {…}`；属产物变更，须同步快照/对拍。
- 修 v-if 分支序列化须同步 `check-signal-profile-snapshot`、`check-compiler-parity`。
- 修前保留 show（1 处）/ codegen-signal（2 处）形态断言守护。
