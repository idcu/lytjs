---
scope: process
status: active
severity: P2
last-verified: 2026-11-09
triggers: 2
keywords: [package.json, exports, sideEffects, files, packageManager, pnpm]
---

## 症状

76 包的 package.json 字段各写各的，但单测、type-check、行为门禁全绿：
exports 子路径顺序不一、9 包漏 sideEffects、files 有的带 src 有的不带；
pnpm 版本散落在 root、gate.mjs、verify-baseline.sh 与 3 份 workflow（docs.yml 已漂到 11.1.3）。

## 根因

这些字段只影响发布产物形态与 tree-shaking，不影响 alias 直连 dist 的单测；
无独立门禁时改动不会让既有判据变红。pnpm 版本同理：各处抄一份，升级只改 root 不同步。

## 正解

- 新增 check-package-metadata（fast）：exports 三序（. 首 / 子路径字典序 /
  ./package.json 末 / 条件 types→import→require）、sideEffects、files、pnpm 单源一并判死；
- pnpm 只留 root packageManager；workflow 省略 version（action-setup 读它）；脚本与文档用 corepack pnpm；
- 负控：@lytjs/core 恢复旧口径（exports 乱序 + sideEffects true + files 丢 src）必须红，
  登记 scripts/negative-controls.json。
