---
scope: now
status: active
last-verified: 2026-11-08
updated: 2026-11-08
keywords: [C1, vdom, core-runtime, C2, C3, B01d]
---

# NOW · main

## 当前焦点
- **C1 已完成（45dd43d0）**：`@lytjs/ui` vdom 清零（58 文件 = 55 运行时 + 2 type-only + 1 测试）改指 `@lytjs/core/runtime`；删除 vdom 的 `Component` 类型；package/tsup/tsconfig/vitest/README/allowlist/锁文件同批收紧。
  - 盲区核对：tests 目录 0 残留；`dist/index.mjs` 与 `dist/index.d.ts` 0 处 `@lytjs/vdom`；UI allowlist 已无 vdom。
  - 门禁：UI type-check/build 绿；fast 56/56；lockfile/package-deps/deps/freshness/alias 绿；api-snapshot 1961 名不变；bundle 六入口在 2% 预算内（与 baseline 差异来自 970e3b30 后 core/vdom/compiler 提交，非本批）。
  - 新坑：`pitfalls/build/subpath-external-singleton-blindspot.md`。
- **C2 待启动**：reactivity 38 处 → `@lytjs/core/runtime`（signal/watch/reactive/computed/effect 5 符号全被覆盖）。
- **C3 待启动**：a11y 40 + common-is 31 + common-string 1 = 72 处文档例外 + ADR。口径拆分：a11y 为 UI-only 语义叶子；is/string 为通用 L0 叶子（不写“UI 语义强绑定”）。
- **B01d 延后**：重开条件与旧台账见 `NOW-history/2026-11-08-S23-S30台账与C3.md`。

## 下一步
1. C2：重定向 reactivity 并收紧 UI 依赖（期望：dist 无 `@lytjs/reactivity`，check-package-deps 0 提示）。
2. C3：ARCHITECTURE 窄口径 + ADR + 订正 0021（a11y 符号 11→14、覆盖口径 24/23 已过时）。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
