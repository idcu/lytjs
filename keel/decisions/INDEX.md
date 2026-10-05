---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [决策, ADR, 索引]
---

| # | 决策（一句话） | 状态 | → 文件 |
|---|---|---|---|
| 0001 | 接入 keel 并单写回：`.workbuddy` 冻结为存档，上下文只写 `keel/NOW.md` | active | [0001-adopt-keel-single-writeback.md](0001-adopt-keel-single-writeback.md) |
| 0002 | `<Suspense>` fallback 暂缓：4 处耦合改动属设计项目，维持 `it.fails` 判据 | active | [0002-suspense-fallback-deferred.md](0002-suspense-fallback-deferred.md) |
| 0003 | 主 SSR 水合标记默认关：`hydrateMarkers` 可选开启，不改变既有输出 | active | [0003-ssr-hydrate-markers-default-off.md](0003-ssr-hydrate-markers-default-off.md) |
| 0004 | group v-model 剩余项暂缓：`min/max` 需子组件上报，机制走 provide/inject 注册表 | active | [0004-group-vmodel-collaboration-deferred.md](0004-group-vmodel-collaboration-deferred.md) |
