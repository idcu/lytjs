# @lytjs/middleware-rate-limit

速率限制中间件

## 目录

- [createRateLimitMiddleware](#createratelimitmiddleware)
- [RateLimitOptions](#ratelimitoptions)
- [RateLimitInfo](#ratelimitinfo)

## createRateLimitMiddleware

**Function**

创建限流中间件

### 签名

```typescript
createRateLimitMiddleware: Middleware;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `RateLimitOptions` |      | 否   | -      |

### 返回值

**类型:** `Middleware`

限流中间件函数

## RateLimitOptions

**Interface**

限流中间件配置选项

### 成员

| 名称         | 类型                                         | 描述                         | 可选 |
| ------------ | -------------------------------------------- | ---------------------------- | ---- |
| windowMs     | `number`                                     | 时间窗口大小（毫秒）         | 否   |
| max          | `number`                                     | 时间窗口内最大请求数         | 否   |
| keyGenerator | `(request: unknown, ctx: unknown) => string` | 键生成函数，用于标识请求来源 | 是   |

## RateLimitInfo

**Interface**

限流信息

### 成员

| 名称      | 类型     | 描述               | 可选 |
| --------- | -------- | ------------------ | ---- |
| remaining | `number` | 剩余请求数         | 否   |
| reset     | `number` | 重置时间戳（毫秒） | 否   |
| limit     | `number` | 限制总数           | 否   |
