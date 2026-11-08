---
scope: core
status: active
severity: P1
last-verified: 2026-11-09
triggers: 1
keywords: [transformOn, v-on, handleVOn, 死路径]
---

## 症状

破坏 `transforms/on.ts` 的 `transformOn` 后，v-on 修饰符用例仍全绿。

## 根因

内建 v-on 不经该文件：`compile()` 只透传用户自定义 `directiveTransforms`，元素指令由 `handleDirective` 内联处理、v-on 走 `handleVOn`。两者语义不同（`.once/.capture/.passive` 是监听选项；语句 handler 需包装），直接合并会退化。

## 正解

- 结论：设计如此，不改实现。依据：`index.ts` 只传 `userDirectiveTransforms ?? {}`；`handleDirective` registry-first 后内联 `handleVOn`；`transformOn` 仍公开导出（`compile({directiveTransforms:{on:transformOn}})` 可用）。
- 回归负控打 `handleVOn`（过滤 `guardModifiers` → `@keyup.enter` 红），不要打 `transformOn`。
- 已修复：v-show `c7a768e5`；v-if 吞 v-for `68bf132b`；动态参数 key `f9268d1e`。
