# @lytjs/api

LytJS API 路由引擎，提供文件系统路由和动态 API 处理功能。

## 安装

```bash
pnpm add @lytjs/api
```

## 特性

- 基于文件系统的路由约定
- 支持动态路由参数（`[id].ts` → `:id`，参数自动百分号解码）
- 中间件：`_middleware.ts` 作用于**所在目录及其子目录**，执行顺序 root → leaf，
  可以短路（返回响应）或改写响应
- 方法来源两种写法都支持：文件名（`users.get.ts`）或模块导出（`export const POST`）
- 路径存在但方法不对时返回 `405 + Allow`
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
  /** 等待首次扫描完成（`handleRequest` 内部会等；手动调 `match()` 前请先 await） */
  ready(): Promise<void>;
  handleRequest(method: HttpMethod, path: string, context: ApiRequestContext): Promise<ApiResponse>;
}
```

### 中间件

```typescript
// src/api/_middleware.ts —— 作用于所有请求（含未命中路由的 404）
export default async (ctx, next) => {
  if (!ctx.headers.authorization) {
    return { status: 401, headers: {}, body: { error: 'unauthorized' } };
  }
  return next();
};
```

⚠️ 中间件**不会**被注册成路由（`GET /_middleware` 是 404）。

### 方法与响应

```typescript
// 写法 A：文件名带方法 —— 只登记该方法的这条路由
// src/api/users/create.post.ts
export const POST = () => ({ created: true });

// 写法 B：文件名不带方法 —— 方法由模块导出决定
// src/api/posts.ts
export const POST = () => ({ created: true });
// GET /posts ⇒ 405 + Allow: POST
```

handler 可以返回普通对象（当作 200 JSON），也可以返回 `{ status, headers, body }`；
抛 `ApiError(status, message, details)` 表达 4xx。**未预期的异常一律 500，且不回传内部消息**。

## License

MIT
