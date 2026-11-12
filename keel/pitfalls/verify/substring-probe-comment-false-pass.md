---
scope: verify
status: active
severity: P1
last-verified: 2026-11-12
triggers: 1
keywords: [子串匹配, substring, AST, 探针, 假通过, 注释]
---

## 症状

静态探针判「已实现」，但组件/API 实际没有对应行为；把实现删掉、只留一行注释，
探针依然是 pass。

## 根因

探针用源码子串匹配（`src.includes("emit('update:x'")`、`/slots\.(\w+)/`）：
注释、字符串、文档示例里的同形文本都会命中，且不认 `slots['x']`、解构读取等
等价写法 ⇒ 判据与运行期语法结构不同构。

## 正解

- 用 TypeScript AST 判据：只认真实的 `CallExpression`（emit 首参为字符串字面量）、
  `PropertyAccessExpression` / `ElementAccessExpression` / 对象解构读取。
- 反证：把真实调用替换成注释里的同形文本，探针必须转红；实现还原后必须回绿。
- 判据改动后先跑一次全量对比登记表，差异逐格说明，不得顺手刷新登记表。
