---
scope: build
status: active
last-verified: 2026-10-05
trigger: 改了 packages/*/src 或新增公开导出后
keywords: [tsup, dist, 重建, build-order, d.ts]
---

# 改了 src 之后：重建哪些 dist

## 为什么

根 vitest 除 `@lytjs/common-error` 外**都读 dist**；门禁（契约 / 文档 import）也读 dist。
不重建就得到"两边结论相反"的假象（坑 `dist-src-split-brain`）。

## 做法

1. 单包重建：`cd packages/<pkg> && ../../node_modules/.bin/tsup`；
2. 有依赖顺序时按真相源：`scripts/build-order.ts`（关键序 `common-vnode → vdom`）；
3. 核对产物：`ls dist/index.d.ts`（TS2367 会**静默不产 `.d.ts`**）；
4. 再说"修好了"。

## 适用包

`renderer` / `vdom` / `adapter-web` / `compiler` / `core`——凡被测试或门禁按 dist 读取的包。
新增公开导出后**必须**重建，否则 `check-runtime-contract` 报缺导出而源码明明在。
