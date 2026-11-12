---
scope: meta
status: active
last-verified: 2026-11-12
keywords: [坑库, 索引, 假绿, 门禁, 负控]
---

| 症状（grep 用） | → 文件 |
|---|---|
| 平行实现 | [parallel](core/parallel-impl-only-one-fixed.md) |
| 循环依赖 | [circ](core/circular-deps-three-layers.md) |
| signal 插值 | [signal](core/signal-callable-contract.md) |
| null 崩 diff | [null](core/null-children-break-keyed-diff.md) |
| 选项装饰 | [deco](core/decorative-option-never-read.md) |
| 判定两遍 | [branch](core/branch-condition-mismatch.md) |
| 正则误伤 | [regex](core/regex-rewrite-on-generated-code.md) |
| aria false | [aria](core/aria-false.md) |
| UTC 偏移 | [date](core/date-utc-parse.md) |
| 中文转义 | [ascii](build/dist-nonascii-escaped.md) |
| failed 但绿 | [alias](build/alias-missing-tests-never-run.md) |
| 自造输入 | [self](verify/self-fulfilling-green.md) |
| 恒真断言 | [true](verify/always-true-assertion.md) |
| 判据绿 | [multi](verify/multi-gate-fix.md) |
| 同 DOM | [hydra](verify/hydration-needs-difference.md) |
| 类型错 | [tsc](verify/typecheck-gap.md) |
| Node26 jsdom | [node26](verify/node26-localstorage-hijacks-jsdom.md) |
| bench NaN | [bench](verify/vitest-bench-harness-traps.md) |
| 0%≠死码 | [zero](verify/coverage-zero-is-not-dead.md) |
| grep 无命中 | [neg](verify/negative-evidence.md) |
| 静态HTML | [static](core/static-html-slot-reuse.md) |
| 漏抛 | [throw](verify/async-throw-escapes.md) |
| src/dist | [ident](verify/module-identity-src-vs-dist.md) |
| 覆盖率并发 | [cov](verify/coverage-concurrent-runs-clobber-tmp.md) |
| Proxy has | [proxy](core/proxy-has-cache-poison.md) |
| precommit | [pre](process/precommit-reverts-working-tree.md) |
| 导入吞行 | [span](process/import-rewrite-span.md) |
| 短别名 | [ac](core/signal-param-alias-contract.md) |
| 计时抖动 | [flaky](verify/timing-flaky-parallel.md) |
| 负控同源 | [negctl](verify/negctl-same-source.md) |
| 子路径内联 | [subpath](build/subpath-external-singleton-blindspot.md) |
| 绑实现 | [impl](verify/test-impl-coupling.md) |
| 跨app泄漏 | [state](core/state-leak.md) |
| 单包假红 | [pkg](verify/pkg-config-alias-blindspot.md) |
| 元数据多源 | [meta](process/package-metadata-drift.md) |
| 体积变胖 | [paths](build/tsconfig-paths-leak-into-bundler.md) |
| TS2307 | [root](verify/undeclared-root-dep-gate.md) |
| 残留缺陷 | [residual](core/residuals.md) |
| dist mtime | [mtime](verify/dist-mtime.md) |
| 快照落后 HEAD | [cov-age](verify/coverage-snapshot-commit-staleness.md) |
| 体积测旧 dist | [stale](verify/bundle-gate-reads-stale-dist.md) |
| 负控锚点漂移 | [anchor](verify/negative-control-anchor-drift.md) |
| 子串假通过 | [substr](verify/substring-probe-comment-false-pass.md) |
