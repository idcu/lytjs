---
scope: build
status: active
severity: P2
last-verified: 2026-10-10
triggers: 0
keywords: [dist, 中文, 转义, uXXXX, grep 查不到, charset ascii, tsup, esbuild]
---

## 症状

改了源码里的**中文字符串**（描述文案、警告语），重建成功、`dist` 时间戳也是新的，
但 `grep "中文字符串" dist/index.mjs` **命中 0** ⇒ 误判"构建没带上改动"。

## 根因

tsup / esbuild 默认 `charset: 'ascii'`，产物里非 ASCII 字符会被转义成 `\uXXXX`。
实测 `description: "…56 个组件（VNode 模式）"` 在 dist 里是
`"…56 \u4E2A\u7EC4\u4EF6\uFF08VNode \u6A21\u5F0F\uFF09"`。
⇒ 拿中文原文去 grep **必然**命中 0，与是否构建成功无关。

## 正解

- 核对产物是否含中文改动时，grep **相邻 ASCII 片段**（变量名、英文词、数字），别 grep 中文原文；
- 想看中文原文：`node -e "…readFileSync(…,'utf8').match(/description: \"[^\"]*\"/)"`；
- 判"产物是否刷新"首选 **`ls -l dist/` 时间戳**；
- 相关：`dist-src-split-brain.md`（那条讲 src/dist 两套真相，本条讲**读产物时被编码误导**）。
