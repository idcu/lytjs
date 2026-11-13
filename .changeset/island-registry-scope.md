---
'@lytjs/renderer': minor
---

新增 `createIslandRegistry()`：请求作用域的 Island 注册表，含 `register` / `get` / `clear`，SSR 每请求一个实例即可避免 Island 注册跨请求可见。

模块级注册表（`registerIslandComponent` / `getIslandComponent` 使用的默认实例）保留，仅客户端 / 单测可用，**v8 将移除模块级单例。**
