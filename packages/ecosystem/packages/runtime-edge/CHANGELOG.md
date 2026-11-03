# @lytjs/runtime-edge 更新日志

## [未发布] - 2026-11-03

### 🐞 修复（7 个，均为「本地单测全绿、线上直接失败」）

- **404 / 500 返回鸭子类型对象**：不是 `Response`、且**没有 body**。Workers / Deno / Vercel
  只接受真正的 `Response` ⇒ 线上 `TypeError` 或把响应序列化成 `{}`。
  同一缺陷族此前修过两次（10-31 的 json/text/html、11-02 的 redirect），**路由分支被漏掉**。
- **`handle()` 原样透传 handler 的返回值**：handler 写 `return { status, headers, body }`
  （类型允许）时，鸭子类型对象直接泄漏给运行时。现在统一归一化（`toResponse`）。
- **相对 URL 抛未捕获 `TypeError`**：`new URL(request.url)` 在 try/catch 之外，
  `handle({url:'/api/x'})` 直接 reject。现在用占位 base 兜底，畸形 URL 回 `400`。
- **`basePath` 不归一化**：`'/api/'` + `'/users'` 拼成 `/api//users` ⇒ 该路由**永远命中不了**。
- **不支持 `:param` / `*`**：`/users/1` 打 `'/users/:id'` 恒 404。现在支持参数（百分号解码）
  与通配符，并逐段比较优先级（静态 > 参数 > 通配符）。
- **不容忍尾斜杠 / 重复斜杠**：`/users/` 打 `'/users'` 404。
- **缓存无上限**：长活 isolate 里按用户维度做 key 时内存只增不减 ⇒ OOM。新增
  `maxSize`（默认 1000，淘汰最旧）与 `size()`。

### ✨ 新增

- 方法不匹配返回 `405` + `Allow`（`GET` 隐含 `HEAD`）；`HEAD` 回落 `GET`。
- `textResponse` 支持 `extraHeaders` 第三参。
- 导出 `toResponse` / `normalizePath`，便于宿主侧自行归一化。
- `match()` 返回的 `params` 是**副本** ⇒ 并发请求不会互相覆盖 `:id`。

### 🩹 类型

- `EdgeResponse` 改为 `Response`（此前声明为结构体、实现却是 `Response`，
  用户按类型写 `response.headers['content-type']` 恒为 `undefined`）。
- `EdgeRequest.headers` 放宽为 `Record<string,string> | Headers` ——
  真实 `Request` 可直接传给 `handle()`（此前文档示例**通不过类型检查**）。
- 新增 `EdgePlainResponse` / `EdgeHandlerResult` / `EdgeCacheConfig`；
  `EdgeHandler` 第三参为路径参数。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
