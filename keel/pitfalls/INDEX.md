---
scope: meta
status: active
last-verified: 2026-10-14
keywords: [坑库, 索引, 转发链, dist, 假绿, 门禁]
---

| 症状（grep 用） | scope | 级 | → 文件 |
|---|---|---|---|
| 平行实现·双触发 | core | P1 | [parallel-impl-only-one-fixed](core/parallel-impl-only-one-fixed.md) |
| 循环依赖债 | core | P2 | [circular-deps-three-layers](core/circular-deps-three-layers.md) |
| signal 插值 | core | P1 | [signal-callable-contract](core/signal-callable-contract.md) |
| null 崩 diff | core | P1 | [null-children-break-keyed-diff](core/null-children-break-keyed-diff.md) |
| 公开选项装饰 | core | P1 | [decorative-option-never-read](core/decorative-option-never-read.md) |
| 判定写两遍 | core | P1 | [branch-condition-mismatch](core/branch-condition-mismatch.md) |
| 正则误伤生成码 | core | P1 | [regex-rewrite-on-generated-code](core/regex-rewrite-on-generated-code.md) |
| aria false 被移除 | core | P1 | [aria-false](core/aria-false.md) |
| 日期串按 UTC 偏移 | core | P2 | [date-utc-parse](core/date-utc-parse.md) |
| dist 中文 0 | build | P2 | [dist-nonascii-escaped](build/dist-nonascii-escaped.md) |
| failed 但 Tests绿 | build | P1 | [alias-missing-tests-never-run](build/alias-missing-tests-never-run.md) |
| 手写非生产输入 | verify | P1 | [self-fulfilling-green](verify/self-fulfilling-green.md) |
| 恒绿：断布尔 | verify | P1 | [always-true-assertion](verify/always-true-assertion.md) |
| 判据绿现象在 | verify | P1 | [multi-gate-fix](verify/multi-gate-fix.md) |
| hydration 同DOM | verify | P2 | [hydration-needs-difference](verify/hydration-needs-difference.md) |
| 测试绿类型错 | verify | P1 | [typecheck-gap](verify/typecheck-gap.md) |
| Node≥26 抢 jsdom | verify | P1 | [node26-localstorage-hijacks-jsdom](verify/node26-localstorage-hijacks-jsdom.md) |
| bench 无数字/NaN | verify | P2 | [vitest-bench-harness-traps](verify/vitest-bench-harness-traps.md) |
| 0% 覆盖≠死码 | verify | P2 | [coverage-zero-is-not-dead](verify/coverage-zero-is-not-dead.md) |
| grep 未命中当没有 | verify | P1 | [negative-evidence](verify/negative-evidence.md) |
| not.toThrow 漏异步抛 | verify | P2 | [async-throw-escapes](verify/async-throw-escapes.md) |
| src/dist 混用假缺陷 | verify | P1 | [module-identity-src-vs-dist](verify/module-identity-src-vs-dist.md) |
| 覆盖率并发作废 | verify | P1 | [coverage-concurrent-runs-clobber-tmp](verify/coverage-concurrent-runs-clobber-tmp.md) |
| Proxy has 污染取值 | core | P1 | [proxy-has-cache-poison](core/proxy-has-cache-poison.md) |
| pre-commit 回滚工作区 | process | P2 | [precommit-reverts-working-tree](process/precommit-reverts-working-tree.md) |
