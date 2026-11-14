---
'@lytjs/core': patch
---

修复主入口与 `./runtime` 的跨入口状态分叉。

两个 dist 入口同进程加载时，全局配置管理器、`registerIntegrations` 注册表、
`useId` / CSS Modules 的实例 WeakMap 各持一份副本：主入口 `setGlobalConfig`
之后 `/runtime` 的 `getConfig` 读不到（dist 级探针实测 `undefined`）。

现在这些「进程内应当唯一」的状态统一挂 `globalThis` + `Symbol.for`
（`src/global-state.ts`）。实例级 WeakMap 仍以组件实例为键，不影响多 App 隔离。
