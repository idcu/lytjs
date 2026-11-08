---
scope: build
status: active
severity: P1
last-verified: 2026-11-08
triggers: 1
keywords: [vdom, 内联, external, 子路径, 单例, tsup]
---

## 症状

删包并把 import 改指子路径后，构建/测试/`check-package-deps` 仍绿，但产物里可能多出一份模块实例。vdom 被内联时无门禁可抓。

## 根因

1. `tsup` 的 `external` 不保证包名覆盖子路径；漏写 `@lytjs/core/runtime` 会把 core/runtime（含 reactivity）打包进 `ui/dist`。
2. `check-package-deps` 第二层只认 `SINGLETONS`（scheduler、reactivity），vdom 不在清单。
3. 第一层只扫 `src`，且 `@lytjs/core/runtime` 归并为 `@lytjs/core`，声明检查能过。

## 正解

- 先加新子路径进 `external`，再删旧包，同批完成。
- 构建后 grep：`dist/index.mjs`/`.d.ts` 中旧包 0 处、新子路径存在、`class ReactiveEffect` 0 处。
- 跑 `check-dist-freshness` 与 `check-package-deps`；要把 vdom 纳入自动守护，需先给 `SINGLETONS` 加唯一标记并做正负控。
