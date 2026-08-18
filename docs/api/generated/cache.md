# @lytjs/cache

统一缓存系统（内存缓存）

## 目录

- [CacheEntry](#cacheentry)
- [CacheOptions](#cacheoptions)
- [Cache](#cache)
- [CacheStats](#cachestats)
- [MultiLayerCacheConfig](#multilayercacheconfig)
- [PrefetchContext](#prefetchcontext)
- [PrefetchResult](#prefetchresult)
- [MemoryCache](#memorycache)
- [MultiLayerCache](#multilayercache)
- [createCache](#createcache)
- [getDefaultCache](#getdefaultcache)

## CacheEntry

**Interface**

缓存条目接口

### 成员

| 名称      | 类型       | 描述             | 可选 |
| --------- | ---------- | ---------------- | ---- |
| value     | `T`        | 缓存值           | 否   |
| createdAt | `number`   | 创建时间戳       | 否   |
| expiresAt | `number`   | 过期时间戳       | 否   |
| tags      | `string[]` | 缓存标签         | 否   |
| size      | `number`   | 数据大小（字节） | 是   |

## CacheOptions

**Interface**

缓存配置选项

### 成员

| 名称       | 类型       | 描述                 | 可选 |
| ---------- | ---------- | -------------------- | ---- |
| ttl        | `number`   | 生存时间（毫秒）     | 是   |
| tags       | `string[]` | 缓存标签             | 是   |
| revalidate | `number`   | 重新验证时间（毫秒） | 是   |
| maxSize    | `number`   | 最大大小（字节）     | 是   |

## Cache

**Interface**

统一缓存接口

### 成员

| 名称           | 类型 | 描述                 | 可选 |
| -------------- | ---- | -------------------- | ---- |
| get            | -    | 获取缓存值           | 否   |
| set            | -    | 设置缓存值           | 否   |
| delete         | -    | 删除缓存值           | 否   |
| has            | -    | 检查缓存是否存在     | 否   |
| clear          | -    | 清除所有缓存         | 否   |
| invalidateTag  | -    | 按标签无效化缓存     | 否   |
| invalidateTags | -    | 批量按标签无效化缓存 | 否   |
| getStats       | -    | 获取缓存统计信息     | 否   |

## CacheStats

**Interface**

缓存统计信息

### 成员

| 名称      | 类型     | 描述           | 可选 |
| --------- | -------- | -------------- | ---- |
| size      | `number` | 键的数量       | 否   |
| totalSize | `number` | 总大小（字节） | 否   |
| hits      | `number` | 命中次数       | 否   |
| misses    | `number` | 未命中次数     | 否   |
| hitRate   | `number` | 命中率         | 否   |

## MultiLayerCacheConfig

**Interface**

多层缓存配置

### 成员

| 名称   | 类型                                                                               | 描述           | 可选 |
| ------ | ---------------------------------------------------------------------------------- | -------------- | ---- |
| memory | `CacheOptions \| boolean`                                                          | 内存缓存配置   | 是   |
| redis  | `CacheOptions & { host?: string; port?: number; password?: string; db?: number; }` | Redis 缓存配置 | 是   |
| http   | `CacheOptions & { baseUrl?: string; headers?: Record<string, string>; }`           | HTTP 缓存配置  | 是   |

## PrefetchContext

**Interface**

数据预取上下文

### 成员

| 名称   | 类型                     | 描述     | 可选 |
| ------ | ------------------------ | -------- | ---- |
| path   | `string`                 | 路径     | 是   |
| params | `Record<string, string>` | 参数     | 是   |
| query  | `Record<string, string>` | 查询参数 | 是   |

## PrefetchResult

**Interface**

预取结果

### 成员

| 名称      | 类型       | 描述       | 可选 |
| --------- | ---------- | ---------- | ---- |
| data      | `T`        | 预取的数据 | 否   |
| expiresAt | `number`   | 过期时间戳 | 是   |
| tags      | `string[]` | 缓存标签   | 是   |

## MemoryCache

**Class**

内存缓存实现

### 成员

| 名称           | 类型                       | 描述                 | 可选 |
| -------------- | -------------------------- | -------------------- | ---- |
| cache          | `Map<string, CacheEntry>`  |                      | 否   |
| tagIndex       | `Map<string, Set<string>>` |                      | 否   |
| stats          | `CacheStats`               |                      | 否   |
| defaultTTL     | `number`                   |                      | 否   |
| maxSize        | `number`                   |                      | 否   |
| get            | -                          |                      | 否   |
| set            | -                          |                      | 否   |
| delete         | -                          |                      | 否   |
| has            | -                          |                      | 否   |
| clear          | -                          |                      | 否   |
| invalidateTag  | -                          |                      | 否   |
| invalidateTags | -                          |                      | 否   |
| getStats       | -                          |                      | 否   |
| calculateSize  | -                          | 计算值的大小（字节） | 否   |
| evictOldest    | -                          | 淘汰最旧的条目       | 否   |
| updateHitRate  | -                          | 更新命中率           | 否   |

## MultiLayerCache

**Class**

多层缓存实现（Memory → Redis → HTTP）

### 成员

| 名称           | 类型      | 描述 | 可选 |
| -------------- | --------- | ---- | ---- |
| layers         | `Cache[]` |      | 否   |
| get            | -         |      | 否   |
| set            | -         |      | 否   |
| delete         | -         |      | 否   |
| has            | -         |      | 否   |
| clear          | -         |      | 否   |
| invalidateTag  | -         |      | 否   |
| invalidateTags | -         |      | 否   |
| getStats       | -         |      | 否   |

## createCache

**Function**

创建默认缓存实例

## getDefaultCache

**Function**
