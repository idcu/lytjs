---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S29, S31, 单包测试, vitest alias, setupFiles]
---

# NOW · main

## 当前焦点
- **S31 单包测试配置假红**已修：3fa3fdc2（core alias）、5d9c48dc（storage setup）。
  - core：单包配置自带 dist 别名且缺 `@lytjs/core-vnode` / `core-signal` ⇒ 3 身份对拍
    + 2 DEV 告警假红；改为 `mergeConfig` 根配置，不再维护第二份别名表。
  - storage：缺根 `setupFiles`，Node ≥26 空 localStorage 顶掉 jsdom ⇒ 2 用例假红；补齐。
  - 审计 54 份配置 / 219 条 alias：53 份单包矩阵（除 core）51 绿 1 红（storage），
    修复后 54/54 单包绿。
  - 另有 30 份仍指 dist、22 份无 alias，当前不假红，属潜在 stale-dist 风险（未批量改）。
- **S29 已完成**（d51eea43 / ba75eaa4 / aff7cec1 / 2432dd70）：`_instance`、renderList
  注释、死注册、双名导出标 deprecated（8.0.0 移除）。
- **实测**：`pnpm test` 411 文件 / 8769 用例全绿；core 单包 828 全绿；fast 56/56；
  API 39/1961；signal 115×2、parity 115/115 未动。
- B01d 仍延后。

## 下一步
1. 8.0.0 窗口删除 `createVaporRenderer` / `VaporRenderer`。
2. 30 份 dist 别名单包配置是否批量对齐 src，待裁决（当前无假红）。
3. compiler 余量断言行为化；0023 死包删除等 8.0.0。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
