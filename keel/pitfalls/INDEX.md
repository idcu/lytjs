---
scope: meta
status: active
last-verified: 2026-11-12
keywords: [坑库, 索引, 假绿, 门禁, 负控]
---

| 症状（grep 用） | → 文件 |
|---|---|
| 平行 | [parallel](core/parallel-impl-only-one-fixed.md) |
| 循环 | [circ](core/circular-deps-three-layers.md) |
| 插值 | [signal](core/signal-callable-contract.md) |
| null | [null](core/null-children-break-keyed-diff.md) |
| 选项 | [deco](core/decorative-option-never-read.md) |
| 判定 | [branch](core/branch-condition-mismatch.md) |
| 正则 | [regex](core/regex-rewrite-on-generated-code.md) |
| aria | [aria](core/aria-false.md) |
| UTC | [date](core/date-utc-parse.md) |
| 中文 | [ascii](build/dist-nonascii-escaped.md) |
| 但绿 | [alias](build/alias-missing-tests-never-run.md) |
| 自造 | [self](verify/self-fulfilling-green.md) |
| 恒真 | [true](verify/always-true-assertion.md) |
| 判据 | [multi](verify/multi-gate-fix.md) |
| DOM | [hydra](verify/hydration-needs-difference.md) |
| 类型错 | [tsc](verify/typecheck-gap.md) |
| Node26 | [node26](verify/node26-localstorage-hijacks-jsdom.md) |
| bench | [bench](verify/vitest-bench-harness-traps.md) |
| 0%死码 | [zero](verify/coverage-zero-is-not-dead.md) |
| grep | [neg](verify/negative-evidence.md) |
| 静态 | [static](core/static-html-slot-reuse.md) |
| 漏抛 | [throw](verify/async-throw-escapes.md) |
| src/dist | [ident](verify/module-identity-src-vs-dist.md) |
| 覆盖 | [cov](verify/coverage-concurrent-runs-clobber-tmp.md) |
| Proxy | [proxy](core/proxy-has-cache-poison.md) |
| pre | [pre](process/precommit-reverts-working-tree.md) |
| 吞行 | [span](process/import-rewrite-span.md) |
| 短别名 | [ac](core/signal-param-alias-contract.md) |
| 计时 | [flaky](verify/timing-flaky-parallel.md) |
| 负控 | [negctl](verify/negctl-same-source.md) |
| 子路径 | [subpath](build/subpath-external-singleton-blindspot.md) |
| 预算 | [split](build/bundle-budget-split-entry-not-baseline.md) |
| runtime胖 | [ns](build/namespace-dynamic-import-retains-all.md) |
| 绑实现 | [impl](verify/test-impl-coupling.md) |
| app | [state](core/state-leak.md) |
| 假红 | [pkg](verify/pkg-config-alias-blindspot.md) |
| 元数据 | [meta](process/package-metadata-drift.md) |
| 变胖 | [paths](build/tsconfig-paths-leak-into-bundler.md) |
| TS2307 | [root](verify/undeclared-root-dep-gate.md) |
| 残留 | [residual](core/residuals.md) |
| mtime | [mtime](verify/dist-mtime.md) |
| cs漏项 | [csdiff](release/changeset-vs-diff.md) |
| 自比对 | [gen](verify/coverage-generate-then-verify.md) |
| commit≠push | [push](process/commit-vs-push.md) |
| 旧dist | [stale](verify/bundle-gate-reads-stale-dist.md) |
| 锚点 | [anchor](verify/negative-control-anchor-drift.md) |
| 子串 | [substr](verify/substring-probe-comment-false-pass.md) |
| 首帧 | [once](verify/test-once-unreproduced.md) |
| 长跑 | [sentinel](process/long-gate-must-wait-sentinel.md) |
| 跨入口 | [shared](build/cross-entry-module-state-duplicated.md) |
