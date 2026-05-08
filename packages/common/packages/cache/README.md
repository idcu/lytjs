# @lytjs/common-cache

缓存策略工具，提供 LRU 缓存、带过期时间的缓存和函数记忆化。

## 安装

```bash
pnpm add @lytjs/common-cache
```

## API

### `LRUCache<K, V>`

基于双向链表实现的 LRU（最近最少使用）缓存。

```typescript
import { LRUCache } from '@lytjs/common-cache';

const cache = new LRUCache<string, number>(100);
cache.set('key', 42);
cache.get('key'); // 42
```

### `ExpiringCache<K, V>`

带过期时间的缓存，条目在指定时间后失效。

```typescript
import { ExpiringCache } from '@lytjs/common-cache';

const cache = new ExpiringCache<string, number>(5000); // 5 秒过期
cache.set('key', 42);
cache.get('key'); // 42（5 秒内有效）
```

### `memoize<T>(fn: T, options?): MemoizedFn<T>`

函数记忆化，缓存函数调用结果以提高重复调用的性能。

```typescript
import { memoize } from '@lytjs/common-cache';

const fn = memoize((a: number, b: number) => a + b);
fn(1, 2); // 3（首次计算并缓存）
fn(1, 2); // 3（直接返回缓存结果）
fn.clear(); // 清空缓存
```

## 边界行为与已知限制

### `memoize()` 序列化限制

默认情况下，`memoize()` 使用 `JSON.stringify` 生成缓存 key。以下情况会导致缓存失效（每次调用都会重新执行原函数）：

| 限制                  | 说明                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| 循环引用              | `JSON.stringify` 遇到循环引用会抛出异常，被内部 `try/catch` 捕获后跳过缓存     |
| `undefined` 值        | `JSON.stringify` 会忽略对象中的 `undefined` 值，可能导致不同参数生成相同的 key |
| Symbol key            | `JSON.stringify` 会忽略 Symbol 类型的键                                        |
| `function` / `bigint` | `JSON.stringify` 会将函数转为 `undefined`，将 bigint 抛出异常                  |

**解决方案**：通过 `options.resolver` 提供自定义的 key 生成函数来处理上述情况。

```typescript
const fn = memoize(complexFn, {
  resolver: (arg) => customKeyGenerator(arg),
});
```

### `memoize()` maxSize 实际淘汰策略

当配置 `maxSize` 时，`memoize()` 的淘汰策略为 **FIFO（先进先出）**，而非 LRU。当缓存条目数超过 `maxSize` 时，会删除最早插入的条目（`Map.keys().next().value`），而不是最近最少使用的条目。

```typescript
const fn = memoize(myFn, { maxSize: 3 });
fn('a'); // 缓存: ['a']
fn('b'); // 缓存: ['a', 'b']
fn('c'); // 缓存: ['a', 'b', 'c']
fn('d'); // 缓存: ['b', 'c', 'd']（'a' 被淘汰，而非最少使用的条目）
```

### `ExpiringCache()` 无自动清理机制

`ExpiringCache` 不会主动扫描和清理过期条目。过期条目仅在以下时机被**被动清理**：

| 触发时机   | 行为                                   |
| ---------- | -------------------------------------- |
| `get(key)` | 如果条目已过期，删除并返回 `undefined` |
| `has(key)` | 如果条目已过期，删除并返回 `false`     |

这意味着如果大量条目过期后不再被访问，它们会一直占用内存。需要手动调用 `cleanup()` 方法来批量清理过期条目：

```typescript
const cleaned = cache.cleanup(); // 返回清理的条目数量
```

## License

MIT
