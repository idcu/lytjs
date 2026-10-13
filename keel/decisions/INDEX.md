---
scope: meta
status: active
last-verified: 2026-10-14
keywords: [决策, ADR, 索引]
---

| # | 决策（一句话） | 状态 | → 文件 |
|---|---|---|---|
| 0001 | 接入 keel 并单写回：`.workbuddy` 冻结为存档，上下文只写 `keel/NOW.md` | active | [0001-adopt-keel-single-writeback.md](0001-adopt-keel-single-writeback.md) |
| 0002 | `<Suspense>` fallback 暂缓：4 处耦合改动属设计项目，维持 `it.fails` 判据 | active | [0002-suspense-fallback-deferred.md](0002-suspense-fallback-deferred.md) |
| 0003 | 主 SSR 水合标记默认关：`hydrateMarkers` 可选开启，不改变既有输出 | active | [0003-ssr-hydrate-markers-default-off.md](0003-ssr-hydrate-markers-default-off.md) |
| 0004 | group v-model 剩余项暂缓：`min/max` 需子组件上报，机制走 provide/inject 注册表 | active | [0004-group-vmodel-collaboration-deferred.md](0004-group-vmodel-collaboration-deferred.md) |
| 0005 | lytx 版本对齐 npm 已发布稳定版（现 6.9.6），不追主仓 `v7.0.0-dev` 分支 | active | [0005-lytx-version-alignment.md](0005-lytx-version-alignment.md) |
| 0006 | 新增硬约束 #9：每个公开开关必须有产物级断言（翻转 ⇒ 变红） | active | [0006-public-switch-assertion.md](0006-public-switch-assertion.md) |
| 0007 | 砍包范围：不全量合并 common 子包（只做同名不同实现收敛） | active | [0007-common-package-merge-scope.md](0007-common-package-merge-scope.md) |
| 0008 | 环境类失败不得转化为仓库改动（内核提炼进「人审关卡」表，坑 `sandbox-safe-delete-block` 置 distilled） | active | [0008-env-failure-not-code-defect.md](0008-env-failure-not-code-defect.md) |
