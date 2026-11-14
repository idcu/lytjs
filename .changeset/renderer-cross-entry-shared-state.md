---
'@lytjs/renderer': patch
---

修复 renderer 多入口之间的水合 / 注册表状态分叉。

主入口会内联 `client/server-components-client`、`ssr/ssr-stream`、`vapor/*` 的副本，
与 `/client`、`/ssr`、`/vapor` 入口同时加载时各持一份模块级状态：

- `/client` 的 `markHydrated` 与主入口 `isHydrated` 互不可见（dist 级探针实测 `false`）
- `defaultConfig` 分叉，`configureServerAction` 只对其中一个入口生效
- `suspenseIdCounter` 分叉，同文档混用两个入口会产生重复 id
- vapor 渲染器槽、HMR 组件注册表 / 计数器 / 监听器分叉

统一改为 `globalThis` + `Symbol.for` 槽（`src/shared/global-slot.ts`）。
按实例/文档隔离的数据不放槽内，多实例隔离不变。
