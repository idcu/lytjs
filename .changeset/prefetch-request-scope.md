---
'@lytjs/renderer': minor
---

`createPrefetchManager()` 改为真正的请求作用域实例：每个实例持有独立的预取缓存与进行中请求表，SSR 每请求创建一个即可避免跨请求数据泄漏。

模块级默认存储保留（`useFetch` / `useAsyncData` / `injectPrefetchData` / `getPrefetchData` 仍基于它，仅客户端 / 单测可用，SSR 必须使用实例）。**v8 将移除模块级单例。**
