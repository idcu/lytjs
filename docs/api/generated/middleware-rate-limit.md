# @lytjs/middleware-rate-limit

速率限制中间件

## 目录

- [readHeader](#readheader)
- [createDefaultKeyGenerator](#createdefaultkeygenerator)
- [createRateLimitMiddleware](#createratelimitmiddleware)
- [RateLimitOptions](#ratelimitoptions)
- [RateLimitInfo](#ratelimitinfo)

## readHeader

**Function**

从 Fetch `Headers` 或普通对象里取一个头（两种形态都支持）

### 签名

```typescript
readHeader: string | undefined;
```

### 参数

| 参数    | 类型      | 描述 | 可选 | 默认值 |
| ------- | --------- | ---- | ---- | ------ |
| request | `unknown` |      | 否   | -      |
| name    | `string`  |      | 否   | -      |

### 返回值

**类型:** `string | undefined`

## createDefaultKeyGenerator

**Function**

默认键生成：只认**不可由客户端伪造**的来源。

顺序：`ctx.clientIp` → `ctx.ip` → `ctx.socket.remoteAddress` →
（仅当 `trustProxy`）`x-forwarded-for` / `x-real-ip` → 抛错。

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

| 名称         | 类型                                         | 描述                                                                                                                                                                                 | 可选 |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| windowMs     | `number`                                     | 时间窗口大小（毫秒）                                                                                                                                                                 | 否   |
| max          | `number`                                     | 时间窗口内最大请求数                                                                                                                                                                 | 否   |
| keyGenerator | `(request: unknown, ctx: unknown) => string` | 键生成函数，用于标识请求来源。 不传时使用默认实现：`ctx.clientIp` → `ctx.ip` → `ctx.socket.remoteAddress` →（仅当 `trustProxy`）转发头 → **抛错**。                                  | 是   |
| trustProxy   | `boolean`                                    | 是否信任 `x-forwarded-for` / `x-real-ip` 等**客户端可伪造**的转发头。 默认 `false`。只有在反向代理之后、且该代理会**覆写**这些头时才应开启 —— 否则客户端随手换个假 IP 即可绕过限流。 | 是   |
| maxKeys      | `number`                                     | 最多保留多少个客户端键（超出按 LRU 淘汰）。默认 `10000`。 不设上限时，伪造海量 key 可撑爆内存。                                                                                      | 是   |

## RateLimitInfo

**Interface**

限流信息

### 成员

| 名称      | 类型     | 描述               | 可选 |
| --------- | -------- | ------------------ | ---- |
| remaining | `number` | 剩余请求数         | 否   |
| reset     | `number` | 重置时间戳（毫秒） | 否   |
| limit     | `number` | 限制总数           | 否   |
