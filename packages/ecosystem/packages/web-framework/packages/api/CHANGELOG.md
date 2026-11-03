# @lytjs/api 更新日志

## [未发布] - 2026-11-03

### 🐞 修复（6 个，共同点是「静默 404 / 静默不鉴权」）

- **`_middleware.ts` 从未执行**：`middlewarePattern` 选项、`ApiRouteConfig.middlewarePaths`、
  `ApiMiddleware` 类型全都在，实现里**一次都没用过**。用户按 README 放一个鉴权中间件，
  匿名请求照样 200。现在按 Next.js 语义实现：目录内的中间件作用于该目录及其子目录，
  执行顺序 root → leaf，可短路；根中间件对**所有**请求生效（含 404）。
- **`_middleware.ts` 被注册成路由**：`GET /_middleware` 会命中它本身。
- **忽略规则子串匹配**：默认忽略项 `dist` 会把 `distribution.ts` / `disk-status.ts`
  一并跳过 ⇒ 接口静默 404。改为**路径段**比较（并支持 `['_middleware']` 命中 `_middleware.ts`）。
- **文件名无方法词时只登记 GET**：`posts.ts` 里 `export const POST` 从未生效
  （POST 404、GET 500「找不到 handler」）。现在区分「文件名方法」与「模块导出方法」，
  后者在加载模块后判定，方法不符时返回 405 + `Allow`。
- **首次扫描不等待**：`createApiRouter()` 同步返回而扫描是异步的 ⇒ 服务刚起来头几个请求 404，
  过一会儿又「自己好了」。新增 `ready()`，`handleRequest` 内部先 await。
- **500 回传 `error.message`**：内部错误信息（文件路径 / SQL / 堆栈首行）泄漏给调用方。
  现在只在服务端留痕，客户端拿到 `{ error: 'Internal Server Error' }`。

### ✨ 行为变更

- 静态路径优先于动态路径：`/users/create`（只有 POST）的 GET 返回 **405**，
  不再被 `/users/:id` 接走（此前返回 200 和一份「id 是 create 的用户」）。
- 路径参数百分号解码；`match()` 先剥离 `?query`（此前带 query 的路径匹配不到）。
- 路径存在但方法不对返回 405 + `Allow`（此前 404）。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 📝 文档完善

- 新增完整的 README 文档
- 保持完全向后兼容

### 📦 依赖

- 所有相关依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
