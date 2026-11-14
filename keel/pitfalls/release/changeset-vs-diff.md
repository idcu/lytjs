---
scope: release
status: active
severity: P1
last-verified: 2026-11-14
triggers: 0
keywords: [changeset, 迁移指南, CHANGELOG, 破坏性变更, 导出面 diff, 发布]
---

## 症状

7.0.0 发布后，`@lytjs/devtools`、`@lytjs/shared-types`、`@lytjs/bundler` 删了公开导出，
但对应包的 CHANGELOG `## 7.0.0` 段落没有任何记录；只有迁移指南提到，而多数用户只读 CHANGELOG。

## 根因

changeset 由人手写，只覆盖「改代码的人记得写」的部分；导出面删除分散在重构提交里，
不会自动出现在 changeset 摘要。14 个 changeset 与 `d9897d8f..HEAD` 的实际 diff 对账后，
才发现 3 条漏网。

## 正解

- 每次 major 发布前，用 `git diff d9897d8f..HEAD -- '**/package.json'` 对比 exports，
  并对包根 `src/index.ts` 的具名导出做一次增删清单；
- 漏网的破坏性变更补一笔 `major` changeset（已 major 的包不会二次升版）；
- **迁移指南的权威性高于 changeset 摘要**：changeset 是摘要，diff 是事实；
- 判据：`pnpm changeset version` 后，每条破坏性变更都能在对应包 `## <version>` 段落 grep 到。
