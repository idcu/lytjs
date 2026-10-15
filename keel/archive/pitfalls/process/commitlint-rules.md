---
scope: process
status: archived
severity: P2
last-verified: 2026-10-05
triggers: 4
keywords: [commitlint, scope, subject-case, 100 列, husky, 提交]
---

## 症状

提交被拒且报错绕口：`ui` scope 被拒；subject 以 PascalCase / 大写英文开头被拒；
body 超 100 列（markdown 表格极易超）。

## 根因

三条硬规则：scope 白名单（`common,reactivity,vdom,compiler,renderer,component,core,
shared-types,e2e,docs,ci,release`）/ `subject-case` / `body-max-line-length`。

## 正解

- **省略 scope 最省事**（`ui` 包必须省）；subject 用中文起头最稳；
- 排查：`./node_modules/.bin/commitlint --edit <msgfile>`；
- 操作性规则已落在 **`skills/no-global-pnpm-commit.md`**（其「注意」段写明：省略 scope 最省事、
  subject 中文起头）—— 原文写的 `skills/commit-hygiene.md` **并不存在**（悬空引用，2026-10-15 订正）。
