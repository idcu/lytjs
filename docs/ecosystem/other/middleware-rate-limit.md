# @lytjs/middleware-rate-limit

LytJS 限流中间件。

## 简介

`@lytjs/middleware-rate-limit` 是 LytJS 框架的限流中间件，用于控制 API 请求频率。

### 核心特性

- 多种限流策略：支持固定窗口、滑动窗口等
- 灵活的键生成：可自定义限流键
- 内存存储：内置内存存储，支持扩展
- 零依赖：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/middleware-rate-limit
```

或使用 pnpm：

```bash
pnpm add @lytjs/middleware-rate-limit
```

## 快速开始

### 基本用法

```typescript
import { createMiddlewareChain } from '@lytjs/middleware';
import { createRateLimitMiddleware } from '@lytjs/middleware-rate-limit';

const chain = createMiddlewareChain();

chain.use(
  createRateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 100,
  }),
);
```

### 配置选项

```typescript
import { createRateLimitMiddleware } from '@lytjs/middleware-rate-limit';

const rateLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    return ip;
  },
  handler: (req, ctx) => {
    return new Response('Too many requests', { status: 429 });
  },
  headers: true,
});
```

### 使用不同的时间窗口

```typescript
const dailyLimit = createRateLimitMiddleware({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1000,
});

const perSecondLimit = createRateLimitMiddleware({
  windowMs: 1000,
  max: 10,
});
```

## 主要 API

### createRateLimitMiddleware(options)

创建限流中间件。

```typescript
import { createRateLimitMiddleware } from '@lytjs/middleware-rate-limit';

const rateLimit = createRateLimitMiddleware({
  windowMs: 60000,
  max: 100,
});
```

#### 选项说明

| 选项         | 类型                                                 | 默认值        | 说明                     |
| ------------ | ---------------------------------------------------- | ------------- | ------------------------ |
| windowMs     | number                                               | 60000         | 时间窗口（毫秒）         |
| max          | number                                               | 100           | 窗口内最大请求数         |
| keyGenerator | (req, ctx) =&gt; string                              | 基于 IP 生成  | 生成限流键的函数         |
| handler      | (req, ctx) =&gt; Response \| Promise&lt;Response&gt; | 返回 429 响应 | 限流时的响应处理         |
| headers      | boolean                                              | true          | 是否添加限流相关的响应头 |
| store        | RateLimitStore                                       | 内存存储      | 自定义存储实现           |

## 许可证

MIT License
