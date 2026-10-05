---
scope: core
status: active
severity: P2
last-verified: 2026-10-05
triggers: 2
keywords: [循环依赖, 类型环, 懒加载, madge, 棘轮, detective]
---

## 症状

`check-circular --src` 报几十条环，看上去全是技术债；照着"还债"会把无害的环当缺陷改。

## 根因

环分三层，性质完全不同：**类型环**（`import type`，运行时擦除）/ **懒加载环**
（`await import()`，调用时解析）/ **真静态值环**。行尾 `skipTypeImports` +
`skipAsyncImports` 后，21 条里只剩 12 条是真运行时环（compiler 8、core+renderer 4）。

## 正解

- 先分类再还债：加 `detectiveOptions.ts.skipTypeImports/skipAsyncImports`，只拦**运行时环**；
- 棘轮基线 `scripts/circular-baseline.txt` 只拦新增，消掉的要删基线行；
- 拆"动态范围开关"类环时，标志必须保持**单一模块级绑定**（先例 `shared/untracked.ts`）。
