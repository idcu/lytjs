# @lytjs/api

LytJS API 路由引擎，提供文件系统路由和动态 API 处理功能。

## 安装

```bash
pnpm add @lytjs/api
```

## 特性

- 基于文件系统的路由约定
- 支持动态路由参数
- 内置中间件支持
- 与 @lytjs/common-http 集成

## 快速开始

```typescript
import { createApiRouter } from '@lytjs/api';

const router = createApiRouter({
  apiDir: './src/api',
  extensions: ['.ts', '.js'],
});

// 匹配路由
const match = router.match('GET', '/users/123');
if (match) {
  console.log('找到路由:', match.route);
}

// 处理请求
const response = await router.handleRequest('GET', '/users', {
  method: 'GET',
  path: '/users',
  headers: {},
  params: {},
  query: {},
});

console.log('响应状态:', response.status);
```

## 目录结构

```
src/api/
├── _middleware.ts      # 全局中间件
├── users/
│   ├── index.ts        # GET /users, POST /users
│   ├── [id].ts         # GET /users/:id, PUT /users/:id, DELETE /users/:id
│   └── _middleware.ts  # users 路由专用中间件
└── posts/
    └── index.ts        # GET /posts, POST /posts
```

## API

### `createApiRouter(options: ApiRouterOptions): ApiRouter`

创建一个新的 API 路由器实例。

### ApiRouter 接口

```typescript
interface ApiRouter {
  getRoutes(): ApiRouteConfig[];
  match(method: HttpMethod, path: string): ApiMatch | null;
  addRoute(route: ApiRouteConfig): void;
  removeRoute(path: string): void;
  clearRoutes(): void;
  refresh(): Promise<void>;
  handleRequest(method: HttpMethod, path: string, context: ApiRequestContext): Promise<ApiResponse>;
}
```

## License

MIT
