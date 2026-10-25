---
scope: process
status: active
severity: P2
last-verified: 2026-10-25
triggers: 1
keywords: [pre-commit, lint-staged, revert, 工作区, 未暂存, husky, 提交失败]
---

## 症状

`git commit` 被 pre-commit 拦下后，**工作区里没暂存的改动凭空消失**，`git diff` 变空，
文件回到"已暂存那一版"。改到一半的代码无声蒸发。

## 根因

`lint-staged` 收尾：任一任务失败 ⇒ `Reverting to original state because of errors`，
它把**工作区**恢复成**暂存区**的版本（避免 `--fix` 改动残留）。暂存区旧、工作区新时，
工作区那版被丢弃。本项目实测：ESLint 报一条 `prefer-const`，随后补的修改被 revert。

## 正解

- 提交前**先把整批改动 `git add`**（暂存区 = 工作区），revert 才无副作用；
- 钩子失败后**立刻验证文件内容**（`grep -E` 关键标识），别假设"刚改过就还在"；
- `pnpm` 自检失败（`Cannot verify the identity of the @pnpm/exe.*`）属**环境类**：
  按 ADR 0008 只在本机建 corepack shim，不改仓库代码、不放宽门禁；
- 用 `--no-verify` 前必须手工跑完钩子那两件事。
