---
scope: meta
status: active
last-verified: 2026-10-14
keywords: [决策, ADR, 索引]
---

| # | 决策（一句话） | 状态 | → 文件 |
|---|---|---|---|
| 0002 | `<Suspense>` fallback 暂缓（4 处耦合） | active | [0002](0002-suspense-fallback-deferred.md) |
| 0003 | SSR 水合标记默认关（可选开启） | active | [0003](0003-ssr-hydrate-markers-default-off.md) |
| 0004 | group v-model 暂缓（子组件上报 min/max） | active | [0004](0004-group-vmodel-collaboration-deferred.md) |
| 0006 | 硬约束 #9：公开开关须产物级断言 | active | [0006](0006-public-switch-assertion.md) |
| 0007 | common 子包只收敛同名不同实现 | active | [0007](0007-common-package-merge-scope.md) |
| 0008 | 环境类失败不改仓库（内核进人审） | active | [0008](0008-env-failure-not-code-defect.md) |
| 0009 | 已蒸馏坑移入 archive，INDEX 只列活跃 | active | [0009](0009-pitfall-archive-out-of-retrieval.md) |
| 0010 | 缺陷按 ADR 修复+守卫，取舍交 owner | active | [0010](0010-registered-defects-fix-vs-tradeoff.md) |
| 0011 | 同名 API 单一权威，其余入口转发 | active | [0011](0011-single-authoritative-implementation.md) |
| 0012 | signal 优化器默认关＋分叉棘轮 | active | [0012](0012-signal-optimizer-default-off.md) |
| 0013 | UI Golden 20 冻结，其余 41 标 experimental | active | [0013](0013-golden-20-freeze.md) |
| 0014 | 取舍先实测盈亏点；回退短别名 | active | [0014](0014-measure-breakeven-before-tradeoff.md) |
| 0015 | B01 部分完成：优化版留实验 | active | [0015](0015-b01-partial-merge.md) |
| 0016 | `ErrorBoundary` 下沉 component | active | [0016](0016-error-boundary-single-authority.md) |
| 0017 | 公开名登记册：unified 单一实现 | active | [0017](0017-public-name-registry.md) |
| 0018 | style 数值不补 px | active | [0018](0018-style-unit-policy.md) |
| 0019 | hydration 入口转发＋keyed diff 收敛 | active | [0019](0019-hydration-list-diff-authority.md) |
| 0020 | S13 必要功能增长：三入口基线签字上调 | active | [0020](0020-bundle-baseline-s13-parity-growth.md) |
| 0021 | C3：UI 依赖与 ARCHITECTURE:26 冲突（待裁） | pending | [0021](pending/0021-c3-ui-dependency-conflict.md) |
| 0022 | `sideEffects:false`：内置组件改显式注册（B2 已实施） | active | [0022](pending/0022-sideeffects-b2-builtin-registration.md) |
| 0023 | common 域 16 个死包：保留+deprecated，8.0.0 删除 | pending | [0023](pending/0023-common-dead-packages-deprecation.md) |
| 0024 | S22：计时断言低于 20ms 只报数字，不参与慢档判定 | active | [0024](pending/0024-perf-timing-assertion-thresholds.md) |
| 0025 | host-contract 暂缓接入：前置=出现第二个宿主目标 | pending | [0025](pending/0025-host-contract-deferred.md) |
