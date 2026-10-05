---
scope: verify
status: active
severity: P1
last-verified: 2026-10-05
triggers: 2
keywords: [多道关, 判据转绿, 上游, 下游, 撤回, group v-model]
---

## 症状

注入 `modelValue` 后值正确、依赖正确，但子组件选中态不更新——**判据转绿 ≠ 问题解决**；
两次尝试均撤回。

## 根因

同一现象有多道关（依赖建立 / `update()` 是否真重跑 render / patch 的 `shallowEqual` 判定），
转绿只说明闯过了已看到的那道。

## 正解

- 每次"修好"后追问：**还有没有第二 / 第三道关**；
- **不要在上游尚未修好的状态下推断下游机制**（曾据此误判 KeepAlive，先修上游后现象自消）。
