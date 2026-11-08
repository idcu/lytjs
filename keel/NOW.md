---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S26, S28, 包元数据, pnpm 单源, vitest alias, type-check, 冷仓, tsconfig]
---

# NOW · main

## 当前焦点
- **S28 包元数据与工具链统一**已完成：7f95d5dd（pnpm 单源）、bb3208e7（exports 键序）、
  878970c7（sideEffects）、d80b9191（files）、0d1249c4（新门禁+负控）。
  - exports 三序（`.` 首 / 子路径字典序 / `./package.json` 末）+ 条件
    `types→import→require`；9 包补 `sideEffects: false`；76 包 `files` 统一
    `dist+src`（cli 额外 `lyt-cli.js`）。公开导出名/路径未动。
  - pnpm 版本只留 root `packageManager`；4 份 workflow 删除 `version`
    （docs.yml 的 11.1.3 已收）；gate/verify/keel 操作手册统一 `corepack pnpm`。
  - 新门禁 `check-package-metadata`（fast 56→57）；负控注入 @lytjs/core 旧口径
    红→绿：`❌ 3 处不一致 … exports 的 "." 必须是第一个键`。
  - 验收：fast 57/57、check-lockfile/package-exports 绿、API 39/1961 不变、
    根测试 411/8769 绿、type-check 绿。
- **S26 冷仓 type-check 自洽**已修：ac1859bd。
  - 唯一 `tsconfig.paths.json` 全指各包 src；包级去 dist paths/baseUrl/rootDir；
    根 env.d.ts 注入各 program；补 `@lytjs/di` alias；删 renderer 两处死代码。
  - 零 dist 冷仓：71 包 0 error；常规 type-check 绿、fast 57/57、411/8769 绿。
- S29/S31/S32 已归档：NOW-history/2026-11-09-S26冷仓typecheck.md。
- 新坑：pitfalls/process/package-metadata-drift.md（包元数据/工具链多源）。
- B01d 仍延后。

## 下一步
1. 8.0.0 窗口删除 `createVaporRenderer` / `VaporRenderer`。
2. compiler 余量断言行为化；0023 死包删除等 8.0.0。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
