---
scope: verify
status: active
severity: P2
last-verified: 2026-11-13
triggers: 2
keywords: [SSR, 快照矩阵, 对拍, 断言, 产物, 假绿, Fragment, null]
---

## 症状

SSR 产物里出现 `<__LYTJS_FRAGMENT__>` 占位标签、字面量 `null`，
但 `check-compiler-parity` 全绿，快照矩阵"115 条 × 2 模式一致"。

## 根因

矩阵只比了**编译产物代码文本**与 **signal 基础实现的 DOM**，从没比过 SSR 的 HTML：

- `expected` 是 signal 路径的语义基准（Fragment 用 `<span data-lyt-frag>` 或
  `<!---->` 注释锚点），SSR 产物不参与这条断言；
- SSR 冒烟（模式快照 ④）只断言"不抛错 + 返回 string"，`typeof html === 'string'`
  对 `<div>null</div>` 与 `<div></div>` 一视同仁；
- 因此"占位符被当标签""假分支输出 null"这类**产物级**缺陷对矩阵完全不可见，
  只有人为执行产物才看得到。

不是 fixture 的 `expected` 写错，也不是只比 innerHTML：SSR 侧根本没有语义断言。

## 正解

- 对拍模板增加 `expectedSsr`（SSR 语义基准），由矩阵逐字断言；
- 修复前先写负控：`expect(html).not.toContain('__LYTJS_FRAGMENT__')`、
  `not.toContain('null')` + 精确结构断言，确认红在产物内容而不是"没跑"；
- 新增 SSR codegen 路径时，矩阵断言必须覆盖**产物**，不能只覆盖"能执行"。
