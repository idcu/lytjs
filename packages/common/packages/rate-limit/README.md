# @lytjs/common-rate-limit

限流策略工具，提供滑动窗口、固定窗口和令牌桶三种限流算法。

## 安装

```bash
pnpm add @lytjs/common-rate-limit
```

## 使用示例

```typescript
import {
  createRateLimiter,
  createFixedWindowLimiter,
  createTokenBucketLimiter,
} from '@lytjs/common-rate-limit';

// 滑动窗口（默认）：每分钟最多 100 次
const limiter = createRateLimiter({ max: 100, windowMs: 60_000 });
const result = limiter.check('user-1');
if (result.allowed) {
  // 处理请求
} else {
  // 触发限流，result.reset 为下一个窗口重置时间
}
```

## API 说明

### 三种限流器

| 限流器                 | 说明                                         | 工厂函数                            |
| ---------------------- | -------------------------------------------- | ----------------------------------- |
| `SlidingWindowLimiter` | 滑动窗口，窗口边界平滑                       | `createRateLimiter(options)`        |
| `FixedWindowLimiter`   | 固定窗口，实现更简单但有窗口边界问题         | `createFixedWindowLimiter(options)` |
| `TokenBucketLimiter`   | 令牌桶，限流更平滑灵活（按固定速率补充令牌） | `createTokenBucketLimiter(options)` |

三个类提供一致的接口：

| 方法         | 说明                        |
| ------------ | --------------------------- |
| `check(key)` | 检查某个 key 是否被允许通过 |
| `reset(key)` | 重置某个 key 的限流状态     |
| `clear()`    | 清空全部限流状态            |

### 通用类型

`RateLimitOptions`（滑动窗口 / 固定窗口所需）：

| 字段       | 说明               |
| ---------- | ------------------ |
| `max`      | 窗口内的最大请求数 |
| `windowMs` | 时间窗口（毫秒）   |

`RateLimitResult` 为 `check()` 的返回值：

| 字段        | 说明                   |
| ----------- | ---------------------- |
| `allowed`   | 请求是否被允许         |
| `remaining` | 当前窗口内剩余可请求数 |
| `reset`     | 下次重置的时间戳       |
| `limit`     | 总限额                 |

### 令牌桶参数

`TokenBucketLimiter` 使用 `{ capacity, refillRate, refillTime }` 配置：

| 字段         | 说明             |
| ------------ | ---------------- |
| `capacity`   | 桶的最大令牌数   |
| `refillRate` | 每次补充的令牌数 |
| `refillTime` | 补充周期（毫秒） |

```typescript
// 每 1000ms 补充 1 个令牌，桶容量 5
const limiter = createTokenBucketLimiter({ capacity: 5, refillRate: 1, refillTime: 1000 });
```

## 相关包

本包为 [`@lytjs/common`](../common/) 聚合包的成员。

## 许可证

[MIT](../../../../LICENSE)
