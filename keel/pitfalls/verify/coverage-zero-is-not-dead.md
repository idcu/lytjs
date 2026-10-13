---
scope: verify
status: active
severity: P2
last-verified: 2026-10-12
triggers: 1
keywords: [死代码, 0% 覆盖, 覆盖率为零, 删除, test, bench, docs]
---

## 症状

把「0% 覆盖 + 静态零入边」的文件当死代码删除后，`vitest run` 在**收集阶段**报
`Failed to load ...`（测试 / 基准导入了它），或构建 / docs 校验报缺文件。

## 根因

"零入边"只统计 src 之间的 import，而文件可能**只被 test / bench / docs 引用**：
① `vitest run` 的覆盖率**不含 bench** ⇒ 只被 bench 导入的文件仍是 0%；
② 依赖分析器通常**排除测试文件** ⇒ 只被测试导入的文件看似零入边。
两者都会把活代码误判成死代码（实测 `dom-runtime/src/batch.ts`、`events.ts` 均误判）。

## 正解

- 删"疑似死代码"前，用 Grep 在 `*.{ts,json,md,mjs,cjs}` 查该文件名 / 路径，覆盖
  **test + bench + docs + 构建配置**；全无引用才可删。
- 更稳：**先删、立刻跑受影响包 `vitest run` + 门禁**（收集阶段失败会立刻暴露）。
- 删后**同步清理引用它的清单**（如 `check-src-hygiene` 的 allowlist），否则留陈旧条目。
