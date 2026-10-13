---
scope: core
status: active
severity: P1
last-verified: 2026-10-10
triggers: 1
keywords: [null children, keyed diff, patchKeyedChildren]
---

## 症状

**更新**时报 `TypeError: Cannot read properties of null (reading 'key')`，栈在
`patchKeyedChildren`；同输入的**挂载**路径却完全正常。

## 根因

`normalizeVNodeChildren` 对 `null` / `undefined` / 布尔只是 `continue`
（跳过但留在数组里）⇒ 数组带着空洞进入 keyed diff，`c2[j].key` 读到 null。
触发形态：`<b v-if="ok">` 为假 ⇒ 子节点数组就是 `[null]`。
`mountChildren` 有 `if (child != null)` 守卫 ⇒ **只有更新会崩、挂载不会**。

## 正解

- 规范化函数要**真正移除**无效项（就地压缩 + `children.length = write`），不能只跳过；
- 「跳过但保留」是重灾区：下游按下标访问就会踩空 —— 改这类函数要连带查消费者；
- 卸载循环同样要空值守卫（`unmountChildren` 此前直接 `children[i]!`）；
- 长期隐身：调用方（Vapor 挂载）每次「清空 + 重新 mount」，**永不进 diff** ⇒
  改 patch 后立刻暴露。修 A 打出 B 是常态，别当回归。
