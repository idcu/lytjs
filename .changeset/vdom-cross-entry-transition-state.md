---
'@lytjs/vdom': patch
---

修复主入口与 `/transition` 入口之间的过渡状态分叉。

`globalTransitionPrefix`、`transitionCleanupMap`、`elementCleanupKeys`、`engineCache`
原本是模块级状态，两个 dist 入口各持一份：

- `setTransitionPrefix` 只影响写入的入口，另一入口仍用旧前缀（dist 级探针实测类名仍为 `v-*`）
- 一个入口发起的过渡，另一入口的 `cancelTransition` 找不到 cleanup，存在泄漏
- 同一 host 会在两个入口各建一个 `TransitionEngine`

现在统一放入 `globalThis` + `Symbol.for` 槽，读取走 `getTransitionPrefix()`。
`export let globalTransitionPrefix` 保留为兼容快照；按 app 隔离的前缀仍由
`props.name` 优先，不改变多实例语义。
