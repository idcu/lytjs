---
'@lytjs/shared-types': minor
'@lytjs/api': minor
'@lytjs/web-framework': minor
'@lytjs/web-framework-api': minor
'@lytjs/web-framework-http-server': minor
'@lytjs/web-framework-metadata': minor
'@lytjs/web-framework-middleware': minor
'@lytjs/web-framework-middleware-cors': minor
'@lytjs/web-framework-middleware-auth': minor
'@lytjs/web-framework-middleware-rate-limit': minor
'@lytjs/web-framework-router': minor
'@lytjs/web-framework-router-fs': minor
---

feat: v6.6.0 web-framework 功能域发布

新增 @lytjs/shared-types web 通用类型定义：

- HttpMethod, Metadata, HttpContext, HttpRequest, HttpResponse, HttpRoute
- 支持元数据管理（OpenGraph、Twitter 等）

新增 web-framework 功能域，包含：

- @lytjs/web-framework - 功能域入口包
- @lytjs/web-framework-api - API 工具包
- @lytjs/web-framework-http-server - HTTP 服务器
- @lytjs/web-framework-metadata - 元数据管理
- @lytjs/web-framework-middleware - 中间件核心（洋葱模型）
- @lytjs/web-framework-middleware-cors - CORS 中间件
- @lytjs/web-framework-middleware-auth - Auth 中间件
- @lytjs/web-framework-middleware-rate-limit - Rate Limit 中间件
- @lytjs/web-framework-router - 路由管理
- @lytjs/web-framework-router-fs - 文件系统路由

向后兼容：

- 现有包名和 API 保持不变
- 统一注释风格为中文
- 类型安全优先
