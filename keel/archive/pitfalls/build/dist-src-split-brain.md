---
scope: build
status: archived
severity: P1
last-verified: 2026-10-10
triggers: 6
keywords: [dist, src, vitest, alias, tsup, TS2367, d.ts, 陈旧产物, 行号]
---

## 症状

- 改了 src、测试全绿，但门禁报"缺导出"；
- compiler 自己测试通过、renderer 侧行为没变——**两边结论相反**（陈旧 dist 假象）。
- 报错栈里的**行号停在旧行号**（源码明明加了几十行）⇒ 一眼判定「改动没生效」的线索。

## 根因

根 vitest **只**把 `@lytjs/common-error` 指 src，其余读 **dist**；
`adapter-web`/`renderer`/`vdom` 无 src 别名 ⇒ 测试也读 dist
（2026-10-10 实测：`@lytjs/vdom` → `packages/vdom/dist/index.mjs`）。

## 正解

- 改 `renderer`/`vdom`/`adapter-web`/`compiler` 的 src 后必须重建：
  `cd packages/<pkg> && ../../node_modules/.bin/tsup`；
- 新增公开导出后必须重建（否则 `check-runtime-contract` 假报缺失）；
- 用**栈里的行号**当第一判据：与源文件行号不符 ⇒ 跑的是 dist，先重建再谈；
- `tsc` 遇 TS2367 会**静默不产 `.d.ts`** ⇒ `ls dist/index.d.ts` 核对；
- 已提炼进 CONSTITUTION 硬约束 3。
