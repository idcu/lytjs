---
scope: verify
status: active
severity: P2
last-verified: 2026-11-08
triggers: 1
keywords: [计时, flaky, performance.now, 并发]
---

## 症状

慢档 `gate --tier slow` 偶发 `ui/tests/performance.test.ts:196` `expected 9.74 < 5`。

## 证据（2026-11-08 S20）

- 全量（并发+覆盖率）：signal 9.74ms / 阈值 5；
- 单 worker 单跑：0.07ms（computed 0.18、props 0.00），12/12 绿；
- 同码复跑慢档：14/14 绿。

## 根因

微秒级 `performance.now()` 在并发 worker + 覆盖率插桩 + 负载下被调度/GC 放大
两个数量级；断言没错，测量方式不稳。

## 正解

已定（ADR 0024）：阈值 <20ms 只打印数字、不参与 slow 判定；≥20ms 保留并留余量。
本次处置：props / 初始化 / signal / computed / 单个导入 移出判定；Table 1000 行 50ms、
Tree 深度 5 50ms、完整导入 100ms 保留（余量依据见 ADR）。不加 retry、不改判据口径。
