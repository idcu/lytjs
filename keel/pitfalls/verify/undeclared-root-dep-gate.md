---
scope: verify
status: active
severity: P2
last-verified: 2026-11-09
triggers: 0
keywords: [check-scaffold, vite, pnpm isolated, 未声明依赖, node_modules]
---

## 症状

`check-scaffold` 的 SSR 模板 `tsc --noEmit` 报 `TS2307: Cannot find module 'vite'`，
连锁「服务启动 / 首页 200」红；其它模板全绿，代码与 lockfile 无相关改动。

## 根因

门禁把生成目录的 `node_modules` 软链到根 `node_modules`，并假设 vite「仓库自带」。
但 isolated linker 下根目录只链 root package.json 声明的依赖；vite 只是 vitest 的
传递依赖（藏在 `.pnpm/node_modules`）。一次 `pnpm install` 重链后根 vite 链接消失，
门禁由绿转红 —— 它依赖的是机器上曾存在的链接，不是仓库声明。

## 正解

- 门禁直接 spawn / 取类型的工具必须在 root package.json 显式声明，保证冷仓可复现。
- 排查顺序：门禁脚本 → spawn 的命令 → 它解析哪个 node_modules；用
  `ls node_modules/<pkg>` 与 `.pnpm/node_modules/<pkg>` 对照。
- 临时 `ln -s` 只用于验证假设；修复必须落到依赖声明。
