# @lytjs/cache-isr

> LytJS ISR 缓存系统。

## 简介

`@lytjs/cache-isr` 是 LytJS 框架的增量静态再生成缓存系统，支持灵活的缓存管理和重新验证。

### 核心特性

- **自定义存储**：支持自定义存储后端
- **增量重新验证**：支持增量更新缓存
- **ETag 支持**：内置 ETag 支持
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/cache-isr
```

或使用 pnpm：

```bash
pnpm add @lytjs/cache-isr
```

## 快速开始

### 基本使用

```typescript
import { createISRCache } from '@lytjs/cache-isr';

const cache = createISRCache({
  revalidate: 60, // 60 秒后重新验证
});

// 缓存内容
await cache.set('page-home', {
  html: '<html>...</html>',
  timestamp: Date.now(),
});

// 获取缓存
const cached = await cache.get('page-home');
if (cached) {
  // 使用缓存
}
```

### 自定义存储

```typescript
import { createISRCache, type ISRStorage } from '@lytjs/cache-isr';

// 自定义 Redis 存储
const redisStorage: ISRStorage = {
  async get(key) {
    return await redis.get(key);
  },
  async set(key, value) {
    await redis.setex(key, 3600, JSON.stringify(value));
  },
  async delete(key) {
    await redis.del(key);
  },
};

const cache = createISRCache({
  storage: redisStorage,
});
```

### ETag 支持

```typescript
import { createISRCache, generateETag } from '@lytjs/cache-isr';

const cache = createISRCache();

// 生成 ETag
const etag = generateETag(htmlContent);

// 设置带 ETag 的缓存
await cache.set('page-id', {
  html,
  etag,
});
```

## 主要 API

### `createISRCache(options)`

创建 ISR 缓存实例。

```typescript
import { createISRCache } from '@lytjs/cache-isr';

const cache = createISRCache({
  revalidate: 300, // 重新验证时间（秒）
  storage: customStorage, // 自定义存储
});
```

### `cache.get(key)`

获取缓存内容。

```typescript
const data = await cache.get('page-home');
```

### `cache.set(key, value, options?)`

设置缓存内容。

```typescript
await cache.set(
  'page-about',
  {
    html: '<html>...</html>',
    timestamp: Date.now(),
  },
  {
    revalidate: 600, // 覆盖默认的重新验证时间
  },
);
```

### `cache.revalidate(key)`

重新验证缓存。

```typescript
await cache.revalidate('page-data');
```

### `generateETag(content)`

生成内容的 ETag。

```typescript
const etag = generateETag(htmlContent);
```

## 许可证

MIT License
