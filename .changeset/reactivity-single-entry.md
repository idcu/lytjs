---
'@lytjs/reactivity': major
---

合并为单入口：删除 `/signal`、`/signal-component`、`/scope`、`/async` 四个子路径。

原因：tsup `splitting: false` 会把同一批模块逐入口内联，`effect` / `signal` 的追踪全局状态
（`activeEffect`、`targetMap`、`activeSubscriber`、批处理深度等）在每个入口各有一份副本。
`@lytjs/reactivity/scope` + 主入口 `effect` 同时加载时，跨入口订阅会静默失效
（dist 级探针实测 `runs=1`，期望 2）。四个子路径仓内零真实 import 消费方，且都只是
同一批模块的再转出，因此直接合并入口，从结构上消除该分叉。

迁移：

- `@lytjs/reactivity/scope` → `@lytjs/reactivity`（`effectScope` / `getCurrentScope` / `onScopeDispose`）
- `@lytjs/reactivity/async` → `@lytjs/reactivity`（`asyncComputed` / `useAsyncState`）
- `@lytjs/reactivity/signal` → `@lytjs/reactivity`（signal API 原本已由主入口导出）
- `@lytjs/reactivity/signal-component` 删除（`extractSignals` / `createSignalBinding` / `signalToProps`，仓内零消费方）
