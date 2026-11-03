# @lytjs/http-server

> LytJS HTTP 服务器。

[![npm version](https://img.shields.io/npm/v/@lytjs/http-server.svg)](https://www.npmjs.com/package/@lytjs/http-server)
[![license](https://img.shields.io/npm/l/@lytjs/http-server.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/http-server` 是 LytJS 框架的 HTTP 服务器，支持路由、中间件、请求体解析与统一的错误兜底。

### 核心特性

- **路由**：静态 / 参数（`:id`）/ 可选（`:id?`）/ 通配（`*`）/ 多段（`:rest...`），按**段**优先级匹配
- **中间件**：Koa 风格洋葱圈，**注册顺序即执行顺序**；同时兼容 `(request, ctx, next)` 三参签名
- **请求体解析**：JSON / urlencoded / 文本，带体积上限（默认 1 MiB，超限 413）
- **协议细节**：`HEAD` 自动回落 `GET`、方法不匹配返回 `405 + Allow`、多值响应头（`Set-Cookie`）逐条发出、无体状态码不带体
- **错误契约**：`HttpError` 按其状态码返回，其余 500 且不泄漏内部信息；错误响应保留中间件已写的头（CORS / request-id）

> 静态文件服务不在本包内（请使用 `@lytjs/middleware` 或宿主侧实现）。

## 用法

```ts
import { createServer, HttpError } from '@lytjs/http-server';

const app = createServer({ bodyLimit: 2 * 1024 * 1024 });

app.use(async (ctx, next) => {
  ctx.response.headers['access-control-allow-origin'] = '*';
  await next();
});

app.get('/users/:id', (ctx) => {
  // params 已做百分号解码：`/users/%E4%B8%AD%E6%96%87` → `中文`
  ctx.response.body = { id: ctx.request.params.id };
});

app.post('/users', (ctx) => {
  if (!ctx.request.body) throw new HttpError(400, '缺少请求体');
  ctx.response.status = 201;
  ctx.response.body = { created: true };
});

await app.listen(3000);
```

### 路由优先级（逐段比较，不是分数求和）

同一路径命中多条路由时，从左到右逐段比较：

```
静态(3) > 参数(2) > 可选参数(1) > 通配符(0)
```

因此 `/a/b/*` 会胜过 `/a/:x/:y`，`/users/me` 会胜过 `/users/:id`，`/exact` 会胜过 `/exact/*`。

## 安装

```bash
npm install @lytjs/http-server
```

或使用 pnpm：

```bash
pnpm add @lytjs/http-server
```

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
