# @lytjs/middleware

> LytJS 中间件核心系统，支持洋葱圈模型。

[![npm version](https://img.shields.io/npm/v/@lytjs/middleware.svg)](https://www.npmjs.com/package/@lytjs/middleware)
[![license](https://img.shields.io/npm/l/@lytjs/middleware.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/middleware` 是 LytJS 框架的中间件核心系统，提供了洋葱圈模型的中间件处理机制。

### 核心特性

- **洋葱圈模型**：标准的中间件执行模式
- **类型安全**：完整的 TypeScript 类型支持
- **零依赖**：不引入任何外部依赖
- **灵活的上下文**：支持自定义中间件共享数据
- **中间件组合**：支持链式调用和组合

## 安装

```bash
npm install @lytjs/middleware
```

或使用 pnpm：

```bash
pnpm add @lytjs/middleware
```

## 快速开始

### 创建中间件链

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';

const chain = createMiddlewareChain();

// 添加中间件
chain.use(async (req, ctx, next) => {
  console.log('Before 1');
  const response = await next();
  console.log('After 1');
  return response;
});

chain.use(async (req, ctx, next) => {
  console.log('Before 2');
  const response = await next();
  console.log('After 2');
  return response;
});

// 执行
const response = await chain.execute(
  new Request('https://example.com'),
  { params: {}, query: new URLSearchParams() },
  (req, ctx) => {
    return new Response('Hello, World!');
  },
);
```

### 中间件函数

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';

const chain = createMiddlewareChain();

// 日志中间件
chain.use((req, ctx, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  return next();
});

// 认证中间件
chain.use((req, ctx, next) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
  ctx.user = { id: '123', name: 'Test' };
  return next();
});

// 错误处理中间件
chain.use(async (req, ctx, next) => {
  try {
    return await next();
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});
```

## 主要 API

### `createMiddlewareChain()`

创建中间件链实例。

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';

const chain = createMiddlewareChain();
```

### `MiddlewareChain` 方法

#### `use(middleware | middlewares)`

添加中间件到链。

```typescript
chain.use((req, ctx, next) => {
  // 中间件逻辑
  return next();
});

// 或者添加多个
chain.use([middleware1, middleware2, middleware3]);
```

#### `execute(request, context, finalHandler)`

执行中间件链。

```typescript
const response = await chain.execute(request, context, (req, ctx) => {
  return new Response('Final response');
});
```

#### `size`

获取中间件数量。

```typescript
console.log(chain.size);
```

#### `clear()`

清空中间件链。

```typescript
chain.clear();
```

## 类型定义

### 中间件函数

```typescript
type MiddlewareFunction = (
  request: Request,
  context: MiddlewareContext,
  next: () => Promise<Response | null | undefined>,
) => Response | null | undefined | Promise<Response | null | undefined>;
```

### 中间件上下文

```typescript
interface MiddlewareContext {
  params: Record<string, string>;
  query: URLSearchParams;
  [key: string]: any;
}
```

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
