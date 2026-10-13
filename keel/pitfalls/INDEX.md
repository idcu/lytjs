---
scope: meta
status: active
last-verified: 2026-10-13
keywords: [坑库, 索引, 转发链, dist, 假绿, 门禁]
---

| 症状（grep 用） | scope | 级 | → 文件 |
|---|---|---|---|
| 转发丢字段 | core | P1 | [forwarding-chain-drops-options](core/forwarding-chain-drops-options.md) |
| 平行实现漏改 | core | P1 | [parallel-impl-only-one-fixed](core/parallel-impl-only-one-fixed.md) |
| 循环依赖债 | core | P2 | [circular-deps-three-layers](core/circular-deps-three-layers.md) |
| signal 插值 | core | P1 | [signal-callable-contract](core/signal-callable-contract.md) |
| null 崩 diff | core | P1 | [null-children-break-keyed-diff](core/null-children-break-keyed-diff.md) |
| 公开选项装饰 | core | P1 | [decorative-option-never-read](core/decorative-option-never-read.md) |
| 判定写两遍 | core | P1 | [branch-condition-mismatch](core/branch-condition-mismatch.md) |
| 正则误伤生成码 | core | P1 | [regex-rewrite-on-generated-code](core/regex-rewrite-on-generated-code.md) |
| 测试绿但缺导出 | build | P1 | [dist-src-split-brain](build/dist-src-split-brain.md) |
| dist grep 中文 0 | build | P2 | [dist-nonascii-escaped](build/dist-nonascii-escaped.md) |
| failed 但 Tests 绿 | build | P1 | [alias-missing-tests-never-run](build/alias-missing-tests-never-run.md) |
| 根 build/coverage 跑不了 | build | P2 | [sandbox-safe-delete-block](build/sandbox-safe-delete-block.md) |
| 测试手写非生产输入 | verify | P1 | [self-fulfilling-green](verify/self-fulfilling-green.md) |
| 门禁恒绿：断布尔 | verify | P1 | [always-true-assertion](verify/always-true-assertion.md) |
| 检测器假阳性 | verify | P1 | [detector-false-positive](verify/detector-false-positive.md) |
| 宽松匹配当引用 | verify | P2 | [dep-reference-not-dependency](verify/dep-reference-not-dependency.md) |
| grep 判导出缺失 | verify | P2 | [runtime-export-probe](verify/runtime-export-probe.md) |
| 判据绿现象仍在 | verify | P1 | [multi-gate-fix](verify/multi-gate-fix.md) |
| --list 过但真跑失败 | verify | P1 | [verifier-must-really-run](verify/verifier-must-really-run.md) |
| 恢复错版本 cp 晚 | verify | P2 | [verification-order-backup](verify/verification-order-backup.md) |
| hydration 同 DOM | verify | P2 | [hydration-needs-difference](verify/hydration-needs-difference.md) |
| 测试绿但类型错 | verify | P1 | [typecheck-gap](verify/typecheck-gap.md) |
| commitlint 拦提交 | process | P2 | [commitlint-rules](process/commitlint-rules.md) |
| 批量改写但代码坏 | process | P1 | [bulk-edit-must-compile](process/bulk-edit-must-compile.md) |
| Node≥26 localStorage 抢 jsdom | verify | P1 | [node26-localstorage-hijacks-jsdom](verify/node26-localstorage-hijacks-jsdom.md) |
| bench 无数字/NaN/OOM | verify | P2 | [vitest-bench-harness-traps](verify/vitest-bench-harness-traps.md) |
| 0% 覆盖≠死代码 | verify | P2 | [coverage-zero-is-not-dead](verify/coverage-zero-is-not-dead.md) |
