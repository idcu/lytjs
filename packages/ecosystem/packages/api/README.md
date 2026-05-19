# @lytjs/api

LytJS API 路由引擎，文件系统驱动的 API 路由解决方案。

## 安装

```bash
pnpm add @lytjs/api
```

## 快速开始

```typescript
import { createApiRouter } from '@lytjs/api';

const apiRouter = createApiRouter({
  apiDir: './src/api',
});

// 处理请求
const response = await apiRouter.handle({
  url: 'http://localhost/api/users',
  method: 'GET',
  headers: {},
});
```

## 特性

- 文件系统 API 路由
- RESTful API 规范
- 支持中间件
- 零外部依赖

## API

### createApiRouter(options)

创建 API 路由引擎实例。

```typescript
import { createApiRouter } from '@lytjs/api';

const router = createApiRouter({
  apiDir: './src/api',
});
```

### router.addRoute(route)

添加 API 路由。

### router.match(request)

匹配 API 路由。

### router.handle(request, context)

处理 API 请求。

## 文件结构约定

```
src/
└── api/
    ├── index.ts      # GET /api
    └── users/
        ├── index.ts  # GET /api/users, POST /api/users
        └── [id].ts   # GET /api/users/:id, PUT /api/users/:id, etc.
```

## 许可证

MIT
