---
scope: meta
status: active
last-verified: 2026-11-08
keywords: [坑库, 索引, 转发链, dist, 假绿, 门禁, 负控]
---

| 症状（grep 用） | scope | 级 | → 文件 |
|---|---|---|---|
| 平行实现·双触发 | core | P1 | [parallel](core/parallel-impl-only-one-fixed.md) |
| 循环依赖债 | core | P2 | [circular-deps](core/circular-deps-three-layers.md) |
| signal 插值 | core | P1 | [signal](core/signal-callable-contract.md) |
| null 崩 diff | core | P1 | [null-keyed-diff](core/null-children-break-keyed-diff.md) |
| 公开选项装饰 | core | P1 | [decorative](core/decorative-option-never-read.md) |
| 判定写两遍 | core | P1 | [branch](core/branch-condition-mismatch.md) |
| 正则误伤生成码 | core | P1 | [regex-rewrite](core/regex-rewrite-on-generated-code.md) |
| aria false 被移除 | core | P1 | [aria-false](core/aria-false.md) |
| 日期串按 UTC 偏移 | core | P2 | [date-utc](core/date-utc-parse.md) |
| dist 中文 0 | build | P2 | [dist-nonascii](build/dist-nonascii-escaped.md) |
| failed 但绿 | build | P1 | [alias](build/alias-missing-tests-never-run.md) |
| 自造输入 | verify | P1 | [self-green](verify/self-fulfilling-green.md) |
| 恒绿：断布尔 | verify | P1 | [always-true](verify/always-true-assertion.md) |
| 判据绿现象在 | verify | P1 | [multi-gate-fix](verify/multi-gate-fix.md) |
| hydration 同DOM | verify | P2 | [hydration](verify/hydration-needs-difference.md) |
| 测试绿类型错 | verify | P1 | [typecheck-gap](verify/typecheck-gap.md) |
| Node≥26 抢 jsdom | verify | P1 | [node26](verify/node26-localstorage-hijacks-jsdom.md) |
| bench 无数字/NaN | verify | P2 | [vitest-bench](verify/vitest-bench-harness-traps.md) |
| 0% 覆盖≠死码 | verify | P2 | [coverage-zero-is-not-dead](verify/coverage-zero-is-not-dead.md) |
| grep 未命中当没有 | verify | P1 | [negative-evidence](verify/negative-evidence.md) |
| 静态HTML复用 | core | P1 | [static-html](core/static-html-slot-reuse.md) |
| not.toThrow 漏抛 | verify | P2 | [async-throw-escapes](verify/async-throw-escapes.md) |
| src/dist 混用假缺陷 | verify | P1 | [module-identity](verify/module-identity-src-vs-dist.md) |
| 覆盖率并发作废 | verify | P1 | [coverage-concurrent](verify/coverage-concurrent-runs-clobber-tmp.md) |
| Proxy has 污染取值 | core | P1 | [proxy-has](core/proxy-has-cache-poison.md) |
| pre-commit 回滚 | process | P2 | [precommit](process/precommit-reverts-working-tree.md) |
| 批量改 import 吞行 | process | P1 | [import-span](process/import-rewrite-span.md) |
| 短别名断契约 | core | P1 | [alias-contract](core/signal-param-alias-contract.md) |
| 计时抖动 | verify | P2 | [flaky](verify/timing-flaky-parallel.md) |
| 负控同源 | verify | P1 | [negctl](verify/negctl-same-source.md) |
| 子路径内联 | build | P1 | [subpath](build/subpath-external-singleton-blindspot.md) |
| 测试绑实现细节 | verify | P1 | [impl-coupling](verify/test-impl-coupling.md) |
