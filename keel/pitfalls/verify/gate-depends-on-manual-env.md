---
scope: verify
status: active
severity: P1
last-verified: 2026-11-15
triggers: 1
keywords: [门禁, 环境, 顺序红]
---

# 门禁依赖 out-of-band 手工环境

## 症状

同一门禁单独跑绿、整档跑到某处才红；干净 clone/worktree 上必红。复跑即绿，易当成抖动。

## 根因

- 根 `package.json` 不依赖子包 ⇒ `pnpm install` 不建 `node_modules/@lytjs`；它由 `link-workspace-packages.mjs` 手工建且 gitignore。`check-package-exports`（76 条 `Cannot find module`）与 `check-examples`（0 个包）依赖它 ⇒ 干净树必红。
- 整档跑到 `check-negative-controls` 的 `check-bundle-size` 负控才侧向补链 ⇒ 之后单独复跑全绿。不是重试变绿，是环境被补齐。
- `check-consumer-demo` 曾写死 `/Volumes/...`：worktree 加载主仓 dist，负控注入不可见。

## 正解

判据：被判对象必须能由「版本控制 + `pnpm install`」复现（ADR 0034 第 6 条），不得读 gitignored 产物、不得写死机器路径。两检查按 workspace 映射绝对路径导入；`gate.mjs` 补链仅兜底。

复现：`rm -rf node_modules/@lytjs` → 旧实现红 → 补链 → 绿。
