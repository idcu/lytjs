---
scope: verify
status: active
severity: P1
last-verified: 2026-10-13
triggers: 1
keywords: [type-check, 假绿, vitest, 转译, 类型错误, tsc, ES2020, 全绿口径]
---

## 症状

单跑 `vitest run` 全绿、甚至全量套件 6179 用例全绿，但 `pnpm type-check` 一跑就红。
实测两例：`staticAnalysis.test.ts` 从 `../types` 导入了并不存在的 `StaticAnalysisResult`；
`html-renderer/renderer.ts` 用了 `replaceAll` 而基座 `lib` 是 ES2020（TS2550）。

## 根因

**vitest 用 esbuild 只转译（transpile-only），不做类型检查** —— `import type` 目标不存在、
ES 版本不匹配的 API、拼错的类型名，都不会让任何用例失败。于是本地「全绿」的口径**不含**
类型正确性；`ci.yml` 虽跑 `type-check`，缺陷只在**本地**被漏过。

## 正解

- 声明「全绿」前必须跑 `node scripts/gate.mjs type-check`（或 `verify-baseline.sh` 完整档）；
- **新增测试文件后尤其要跑**：`import type` 最容易写错，而它恰恰是最不会被测试发现的；
- 本地「全绿」口径 = 快档 + `type-check` + `lint:check` + `format:check` + `test`，缺一不算。
