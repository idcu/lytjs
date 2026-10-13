---
scope: build
status: distilled
severity: P2
last-verified: 2026-10-14
triggers: 3
keywords: [沙箱, safe-delete, pnpm, 后台任务]
---

## 症状

本机（宿主沙箱）跑门禁/提交会撞三类**环境**问题：
① 根 `build`/`coverage` 跑不了（safe-delete 守卫）；
② **后台任务跨轮被杀** —— coverage 跑一半就没了（无日志）；
③ `git commit` 被 pre-commit 拦下（`@pnpm/exe` 校验失败）。

## 根因

① `tsx` 的 bundle-require 清缓存撞守卫；
② 后台任务生命周期绑在**当前轮**，结束即回收；
③ 钩子是裸 `pnpm exec lint-staged`，PATH 解析到**全局新版** pnpm（不在 lockfile）⇒ 自检失败。

## 正解

- ①：逐包 `tsup` + 分包跑测试；coverage 加 `--coverage.clean=false` 且前台；
- ②：**长任务一律前台跑完**（长 timeout）；
- ③：按项目声明版本建 corepack shim 前置 PATH 后再 `git commit`；
- 别为"跑通"改仓库代码或绕守卫（`--no-verify` 仅限纯环境失败 + 校验已手动跑过）。

> 已蒸馏：内核「环境失败 ≠ 代码缺陷」已提炼进 CONSTITUTION「人审关卡」表（`decisions/0008`）。
