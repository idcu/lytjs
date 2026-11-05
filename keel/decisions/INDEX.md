---
scope: meta
status: active
last-verified: 2026-10-14
keywords: [决策, ADR, 索引]
---

| # | 决策（一句话） | 状态 | → 文件 |
|---|---|---|---|
| 0001 | 接入 keel 并单写回：`.workbuddy` 冻结为存档，上下文只写 `keel/NOW.md` | active | [0001-adopt-keel-single-writeback.md](0001-adopt-keel-single-writeback.md) |
| 0002 | `<Suspense>` fallback 暂缓：4 处耦合改动属设计项目，维持 `it.fails` | active | [0002-suspense-fallback-deferred.md](0002-suspense-fallback-deferred.md) |
| 0003 | 主 SSR 水合标记默认关：`hydrateMarkers` 可选开启，不改变既有输出 | active | [0003-ssr-hydrate-markers-default-off.md](0003-ssr-hydrate-markers-default-off.md) |
| 0004 | group v-model 剩余项暂缓：`min/max` 靠子组件上报（provide/inject） | active | [0004-group-vmodel-collaboration-deferred.md](0004-group-vmodel-collaboration-deferred.md) |
| 0005 | lytx 版本对齐 npm 已发布稳定版（现 6.9.6），不追主仓 `v7.0.0-dev` 分支 | active | [0005-lytx-version-alignment.md](0005-lytx-version-alignment.md) |
| 0006 | 新增硬约束 #9：每个公开开关必须有产物级断言（翻转 ⇒ 变红） | active | [0006-public-switch-assertion.md](0006-public-switch-assertion.md) |
| 0007 | 砍包范围：不全量合并 common 子包（只做同名不同实现收敛） | active | [0007-common-package-merge-scope.md](0007-common-package-merge-scope.md) |
| 0008 | 环境类失败不得转化为仓库改动（内核提炼进人审关卡，坑 `sandbox-safe-delete-block` 置 distilled） | active | [0008-env-failure-not-code-defect.md](0008-env-failure-not-code-defect.md) |
| 0009 | 已蒸馏的坑移出检索面：`pitfalls/` → `archive/`，INDEX 只列活跃坑 | active | [0009-pitfall-archive-out-of-retrieval.md](0009-pitfall-archive-out-of-retrieval.md) |
| 0010 | 登记缺陷二分：缺陷按 ADR 修复 + 守卫，取舍交 owner（Tabs 四处） | active | [0010-registered-defects-fix-vs-tradeoff.md](0010-registered-defects-fix-vs-tradeoff.md) |
| 0011 | 同名 API 只许一份权威实现，其余入口只转发（`defineAsyncComponent` 三份合一） | active | [0011-single-authoritative-implementation.md](0011-single-authoritative-implementation.md) |
| 0012 | signal/vapor 优化器默认关（须显式开启），`check-compiler-parity` 进 fast + 分叉棘轮 | active | [0012-signal-optimizer-default-off.md](0012-signal-optimizer-default-off.md) |
| 0013 | `@lytjs/ui` Golden 20 冻结，其余 41 导出标 experimental；`mislabeled_stable=0` | active | [0013-golden-20-freeze.md](0013-golden-20-freeze.md) |
| 0014 | 取舍先实测盈亏平衡点；回退短别名，留 import 裁剪 | active | [0014-measure-breakeven-before-tradeoff.md](0014-measure-breakeven-before-tradeoff.md) |
| 0015 | B01 部分完成：基础实现为语义主干，优化版留实验路径，23 条差异入棘轮（待拍板） | active | [0015-b01-partial-merge.md](0015-b01-partial-merge.md) |
