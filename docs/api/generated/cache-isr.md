# @lytjs/cache-isr

增量静态再生成（ISR）缓存

## 目录

- [ExtendedCacheEntry](#extendedcacheentry)
- [ISRCache](#isrcache)
- [ISRRevaluator](#isrrevaluator)
- [ISRCacheConfig](#isrcacheconfig)
- [ISRCacheEntry](#isrcacheentry)

## ExtendedCacheEntry

**Interface**

### 成员

| 名称         | 类型     | 描述 | 可选 |
| ------------ | -------- | ---- | ---- |
| value        | `V`      |      | 否   |
| expiry       | `number` |      | 否   |
| revalidateAt | `number` |      | 是   |
| createdAt    | `number` |      | 否   |

## ISRCache

**Class**

### 成员

| 名称          | 类型                                       | 描述 | 可选 |
| ------------- | ------------------------------------------ | ---- | ---- |
| cache         | `Map<string, ExtendedCacheEntry<unknown>>` |      | 否   |
| defaultMaxAge | `number`                                   |      | 否   |
| get           | -                                          |      | 否   |
| set           | -                                          |      | 否   |
| has           | -                                          |      | 否   |
| delete        | -                                          |      | 否   |
| clear         | -                                          |      | 否   |
| isStale       | -                                          |      | 否   |

## ISRRevaluator

**Class**

### 成员

| 名称              | 类型 | 描述 | 可选 |
| ----------------- | ---- | ---- | ---- |
| revalidate        | -    |      | 否   |
| revalidateIfStale | -    |      | 否   |

## ISRCacheConfig

**Interface**

### 成员

| 名称                 | 类型     | 描述 | 可选 |
| -------------------- | -------- | ---- | ---- |
| maxAge               | `number` |      | 是   |
| revalidate           | `number` |      | 是   |
| staleWhileRevalidate | `number` |      | 是   |

## ISRCacheEntry

**Interface**

### 成员

| 名称         | 类型     | 描述 | 可选 |
| ------------ | -------- | ---- | ---- |
| key          | `string` |      | 否   |
| value        | `T`      |      | 否   |
| createdAt    | `number` |      | 否   |
| expiresAt    | `number` |      | 否   |
| revalidateAt | `number` |      | 是   |
