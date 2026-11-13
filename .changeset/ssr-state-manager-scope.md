---
'@lytjs/ssr': minor
---

新增 `createStateManager()`，返回请求作用域的服务端组件状态管理器；`collectPrefetchComponents()` / `prefetchAllComponents()` 新增可选 `manager` 参数。

模块级 `stateManager` 单例保留（仅客户端 / 单测可用，SSR 每请求必须使用实例），**v8 将移除模块级单例。**
