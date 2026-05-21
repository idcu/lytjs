# @lytjs/middleware-cors

> LytJS CORS 中间件。

## 简介

`@lytjs/middleware-cors` 是 LytJS 框架的 CORS 中间件，用于处理跨域资源共享。

### 核心特性

- **灵活的源配置**：支持字符串、数组、正则表达式
- **自动预检处理**：自动响应 OPTIONS 预检请求
- **自定义头部**：可自定义允许和暴露的头部
- **凭证支持**：支持携带凭证的跨域请求
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/middleware-cors
```

或使用 pnpm：

```bash
pnpm add @lytjs/middleware-cors
```

## 快速开始

### 基本用法

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';
import { createCorsMiddleware } from '@lytjs/middleware-cors';

const chain = createMiddlewareChain();

// 允许所有源
chain.use(createCorsMiddleware());

// 或者只允许特定源
chain.use(
  createCorsMiddleware({
    origin: 'https://example.com',
  }),
);
```

### 配置 CORS

```typescript
import { createCorsMiddleware } from '@lytjs/middleware-cors';

// 允许多个源
const cors = createCorsMiddleware({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Custom-Header'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
```

### 使用正则表达式

```typescript
const cors = createCorsMiddleware({
  origin: /\.example\.com$/,
  credentials: true,
});
```

### 使用函数自定义

```typescript
const cors = createCorsMiddleware({
  origin: (requestOrigin) => {
    const allowedOrigins = ['https://a.com', 'https://b.com'];
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return false;
  },
});
```

## 主要 API

### `createCorsMiddleware(options)`

创建 CORS 中间件。

```typescript
import { createCorsMiddleware } from '@lytjs/middleware-cors';

const cors = createCorsMiddleware({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: false,
  maxAge: 86400,
});
```

#### 选项说明

| 选项             | 类型                                                                                     | 默认值                                                              | 说明                   |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| `origin`         | string \| string[] \| RegExp \| boolean \| (origin: string \| null) => boolean \| string | `'*'`                                                               | 允许的来源             |
| `methods`        | string \| string[]                                                                       | `['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']`                 | 允许的 HTTP 方法       |
| `allowedHeaders` | string \| string[]                                                                       | `['Accept', 'Accept-Language', 'Content-Language', 'Content-Type']` | 允许的请求头部         |
| `exposedHeaders` | string \| string[]                                                                       |                                                                     | 暴露的响应头部         |
| `credentials`    | boolean                                                                                  | `false`                                                             | 是否允许携带凭证       |
| `maxAge`         | number                                                                                   |                                                                     | 预检请求缓存时间（秒） |

## 许可证

MIT License
