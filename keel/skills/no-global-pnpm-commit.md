---
scope: process
status: active
last-verified: 2026-10-05
trigger: 本机无全局 pnpm 时跑命令或提交
keywords: [pnpm, corepack, shim, husky, commit]
---

# 无全局 pnpm：corepack 与提交 shim

## 做法

1. 日常一律用 corepack 前缀：`corepack pnpm@11.3.0 <script>`；
2. husky 钩子会调裸 `pnpm` ⇒ 提交前造 shim 并注入 PATH：

   ```sh
   mkdir -p /tmp/pnpm-shim
   printf '#!/bin/sh\nexec corepack pnpm@11.3.0 "$@"\n' > /tmp/pnpm-shim/pnpm
   chmod +x /tmp/pnpm-shim/pnpm
   PATH="/tmp/pnpm-shim:$PATH" git commit -F <msgfile>
   ```

3. 提交后核对：`git log --oneline -1` + `git status`。

## 注意

- lint-staged 会改写暂存文件 ⇒ 提交后重建 dist + 重跑相关测试；
- `.husky/` 两钩子已链式调用 keel 本体（ADR 0017）：keel/ md 有问题会被拦；
- 提交信息规则见坑 `commitlint-rules`（省略 scope 最省事，subject 中文起头）。
