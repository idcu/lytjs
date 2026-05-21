# @lytjs/http-server

> LytJS HTTP 服务器。

## 简介

`@lytjs/http-server` 是 LytJS 框架的 HTTP 服务器，支持路由、中间件、静态文件服务等功能。

### 核心特性

- **RESTful 路由**：支持动态路由和路径参数
- **中间件支持**：完整的中间件系统
- **静态文件服务**：支持静态资源服务
- **Fetch API 兼容**：使用标准的 Request/Response API
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/http-server
```

或使用 pnpm：

```bash
pnpm add @lytjs/http-server
```

## 快速开始

### 基础用法

```typescript
import { createHttpServer } from '@lytjs/http-server';

const server = createHttpServer({
  port: 3000,
});

// 启动服务器
await server.listen();
console.log('Server running on http://localhost:3000');
```

### 添加路由

```typescript
import { createHttpServer } from '@lytjs/http-server';

const server = createHttpServer({ port: 3000 });

// GET 请求
server.get('/hello', (req) => {
  return new Response('Hello, World!');
});

// POST 请求
server.post('/api/users', async (req) => {
  const body = await req.json();
  return new Response(JSON.stringify({ received: body }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// 动态路由
server.get('/users/:id', (req, { params }) => {
  return new Response(`User ID: ${params.id}`);
});

await server.listen();
```

### 使用中间件

```typescript
import { createHttpServer } from '@lytjs/http-server';
import { createCorsMiddleware } from '@lytjs/middleware-cors';

const server = createHttpServer({ port: 3000 });

// 添加 CORS 中间件
server.use(createCorsMiddleware({ origin: '*' }));

// 添加日志中间件
server.use((req, ctx, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  return next();
});

await server.listen();
```

## 主要 API

### `createHttpServer(options)`

创建 HTTP 服务器实例。

```typescript
import { createHttpServer } from '@lytjs/http-server';

const server = createHttpServer({
  port: 3000,
  host: '0.0.0.0',
});
```

### `HttpServer` 方法

#### `get(path, handler)`

注册 GET 路由。

```typescript
server.get('/api/users', (req, ctx) => {
  return new Response('Users');
});
```

#### `post(path, handler)`

注册 POST 路由。

#### `put(path, handler)`

注册 PUT 路由。

#### `patch(path, handler)`

注册 PATCH 路由。

#### `delete(path, handler)`

注册 DELETE 路由。

#### `use(middleware)`

添加中间件。

```typescript
server.use((req, ctx, next) => {
  console.log('Middleware before');
  const response = next();
  console.log('Middleware after');
  return response;
});
```

#### `listen(port?)`

启动服务器。

```typescript
await server.listen(3000);
```

#### `close()`

关闭服务器。

```typescript
await server.close();
```

## 许可证

MIT License
