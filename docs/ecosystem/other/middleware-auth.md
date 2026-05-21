# @lytjs/middleware-auth

> LytJS 认证中间件。

## 简介

`@lytjs/middleware-auth` 是 LytJS 框架的认证中间件，提供用户认证和权限验证功能。

### 核心特性

- **多种认证策略**：支持 JWT、Bearer Token 等
- **权限验证**：支持基于角色的访问控制
- **自定义验证**：可自定义验证逻辑
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/middleware-auth
```

或使用 pnpm：

```bash
pnpm add @lytjs/middleware-auth
```

## 快速开始

### 基本用法

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';
import { createAuthMiddleware } from '@lytjs/middleware-auth';

const chain = createMiddlewareChain();

// 添加认证中间件
chain.use(
  createAuthMiddleware({
    verifyToken: (token) => {
      // 验证 token 并返回用户信息
      if (token === 'valid-token') {
        return { id: '123', name: 'Test User' };
      }
      return null;
    },
  }),
);
```

### Bearer Token 认证

```typescript
import { createAuthMiddleware } from '@lytjs/middleware-auth';

const auth = createAuthMiddleware({
  header: 'Authorization',
  prefix: 'Bearer ',
  verifyToken: async (token) => {
    // 验证 JWT 或其他 token
    try {
      const payload = verifyJWT(token);
      return payload;
    } catch {
      return null;
    }
  },
  onUnauthorized: () => new Response('Unauthorized', { status: 401 }),
});
```

### 权限验证

```typescript
import { createAuthMiddleware, requireRole } from '@lytjs/middleware-auth';

const chain = createMiddlewareChain();

chain.use(
  createAuthMiddleware({
    verifyToken: (token) => {
      /* ... */
    },
  }),
);

// 要求特定角色
chain.use(requireRole('admin'));

// 要求多个角色之一
chain.use(requireRole(['admin', 'editor']));
```

## 主要 API

### `createAuthMiddleware(options)`

创建认证中间件。

```typescript
import { createAuthMiddleware } from '@lytjs/middleware-auth';

const auth = createAuthMiddleware({
  header: 'Authorization',
  prefix: 'Bearer ',
  verifyToken: async (token) => {
    // 验证 token 并返回用户对象
  },
  onUnauthorized: () => new Response('Unauthorized', { status: 401 }),
});
```

### `requireRole(role | roles)`

创建角色验证中间件。

```typescript
import { requireRole } from '@lytjs/middleware-auth';

const requireAdmin = requireRole('admin');
const requireEditorOrAdmin = requireRole(['editor', 'admin']);
```

## 许可证

MIT License
