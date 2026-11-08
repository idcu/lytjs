---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [C1, C2, vdom, reactivity, core-runtime, C3, B01d]
---

# NOW · main

## 当前焦点
- **C1 已完成（45dd43d0）**：`@lytjs/ui` vdom 清零（58 文件）改指 `@lytjs/core/runtime`。
- **C2 已完成（72001721）**：UI reactivity 清零（38 src + 6 测试/require）改指 `@lytjs/core/runtime`；删除 reactivity 依赖/external/tsconfig/vitest alias/allowlist/README；锁文件同步。
  - 残留核对：src/tests 0；`dist/index.mjs`/`index.d.ts` 0 处 `@lytjs/reactivity`；dist 无 `class ReactiveEffect`（未内联）。
  - 门禁：UI type-check/build 绿；UI 测试 27 文件/664 用例绿；fast 56/56；lockfile/package-deps/deps/freshness/alias 绿（alias 213 目标，减 2 条 reactivity）；api-snapshot 39/1961 不变；bundle 六入口与 C1 逐字节一致（1697/9471/95367/93230/75015/38171）。
  - 新坑：`pitfalls/process/import-rewrite-span.md`（批量正则跨行误吞相邻 import）。
- **C3 待启动**：a11y 40 + common-is 31 + common-string 1 = 72 处文档例外 + ADR。口径拆分：a11y 为 UI-only 语义叶子；is/string 为通用 L0 叶子（不写“UI 语义强绑定”）。
- **B01d 延后**：重开条件与旧台账见 `NOW-history/2026-11-08-S23-S30台账与C3.md`。

## 下一步
1. C3：ARCHITECTURE 窄口径 + ADR + 订正 0021（a11y 符号 11→14、覆盖口径 24/23 已过时）。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
