---
'@lytjs/renderer': minor
---

新增 `createServerComponentRegistry()`：请求作用域的服务端组件注册表（`registerComponent` / `registerFunction` / `getComponent` / `getFunction` / `clear`）。`handleServerAction()`、`createServerActionHandler()`、`renderServerComponent()` 新增可选注册表参数，SSR 每请求一个实例即可避免注册与分发跨请求可见。

`handleServerAction()` 明确**不做身份认证/授权**，鉴权由 HTTP 框架层负责。模块级注册表保留（仅客户端 / 单测可用），**v8 将移除模块级单例。**
