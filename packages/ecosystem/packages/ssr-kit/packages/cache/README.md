# @lytjs/cache

LytJS 统一缓存系统，提供多层缓存支持（Memory → Redis → HTTP）。

## 功能特性

- 🚀 内存缓存，高性能
- 🏷️ 缓存标签支持
- ⏱️ TTL 过期控制
- 📊 缓存统计信息
- 📦 多层缓存架构

## 安装

```bash
pnpm add @lytjs/cache
```

## 使用示例

```typescript
import { createCache } from '@lytjs/cache';

// 创建内存缓存
const cache = createCache();

// 设置缓存
await cache.set('key', 'value', {
  ttl: 3600000, // 1 小时
  tags: ['user', 'profile'],
});

// 获取缓存
const value = await cache.get('key');

// 按标签无效化
await cache.invalidateTag('user');

// 获取统计信息
const stats = await cache.getStats();
console.log(stats.hitRate);
```

## 多层缓存

```typescript
import { createCache, type Cache } from '@lytjs/cache';

// 自定义远程层：只要实现 Cache 接口即可（Redis / 文件 / 分布式缓存……）
class MyRedisCache implements Cache {
  // get / set / delete / has / clear / invalidateTag / invalidateTags / getStats
}

const cache = createCache({
  type: 'multi',
  config: {
    memory: { ttl: 300000 }, // 5 分钟
    extraLayers: [new MyRedisCache()],
  },
});
```

> **2026-10-10 订正（P1-7）**：此前这里写的是 `redis: { host, port }`，
> 但 `MultiLayerCache` 里的 redis 分支是**空实现** —— 配了也只会得到纯内存缓存，
> 且没有任何提示。现已改为 `extraLayers`：本包不内置 Redis 客户端，
> 而是让你把**自己封装的层**插进来（多层读写与回写逻辑是真实生效的）。

## API

### `createCache(options)`

创建缓存实例

### `Cache` 接口

- `get<T>(key): Promise<T | undefined>`
- `set<T>(key, value, options?): Promise<void>`
- `delete(key): Promise<boolean>`
- `has(key): Promise<boolean>`
- `clear(): Promise<void>`
- `invalidateTag(tag): Promise<void>`
- `invalidateTags(tags): Promise<void>`
- `getStats(): Promise<CacheStats>`

## License

MIT
