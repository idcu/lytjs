# @lytjs/http-server

HTTP 服务器

## 目录

- [TokenStatic](#tokenstatic)
- [TokenParam](#tokenparam)
- [TokenWildcard](#tokenwildcard)
- [PathToken](#pathtoken)
- [tokenizePath](#tokenizepath)
- [scoreRoute](#scoreroute)
- [PathMatchResult](#pathmatchresult)
- [matchPath](#matchpath)
- [Router](#router)
- [createRouter](#createrouter)
- [DEFAULT_BODY_LIMIT](#default-body-limit)
- [HttpError](#httperror)
- [ServerOptions](#serveroptions)
- [readRequestBody](#readrequestbody)
- [Server](#server)
- [createServer](#createserver)
- [HttpMethod](#httpmethod)
- [Context](#context)
- [Request](#request)
- [Response](#response)
- [Route](#route)
- [Handler](#handler)

## TokenStatic

**Interface**

### 成员

| 名称  | 类型       | 描述 | 可选 |
| ----- | ---------- | ---- | ---- |
| type  | `'static'` |      | 否   |
| value | `string`   |      | 否   |

## TokenParam

**Interface**

### 成员

| 名称       | 类型      | 描述 | 可选 |
| ---------- | --------- | ---- | ---- |
| type       | `'param'` |      | 否   |
| name       | `string`  |      | 否   |
| repeatable | `boolean` |      | 否   |
| optional   | `boolean` |      | 否   |

## TokenWildcard

**Interface**

### 成员

| 名称  | 类型         | 描述 | 可选 |
| ----- | ------------ | ---- | ---- |
| type  | `'wildcard'` |      | 否   |
| value | `string`     |      | 否   |

## PathToken

**Type**

### 签名

```typescript
PathToken: TokenStatic | TokenParam | TokenWildcard;
```

## tokenizePath

**Function**

Tokenize a path segment string into tokens

### 签名

```typescript
tokenizePath: PathToken[]
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `PathToken[]`

## scoreRoute

**Function**

Score a route record for ranking (higher = more specific)

### 签名

```typescript
scoreRoute: number;
```

### 参数

| 参数   | 类型          | 描述 | 可选 | 默认值 |
| ------ | ------------- | ---- | ---- | ------ |
| tokens | `PathToken[]` |      | 否   | -      |

### 返回值

**类型:** `number`

## PathMatchResult

**Interface**

### 成员

| 名称    | 类型                                 | 描述 | 可选 |
| ------- | ------------------------------------ | ---- | ---- |
| matched | `boolean`                            |      | 否   |
| params  | `Record<string, string \| string[]>` |      | 否   |
| path    | `string`                             |      | 否   |
| score   | `number`                             |      | 否   |

## matchPath

**Function**

Match a pathname against a tokenized route

### 签名

```typescript
matchPath: PathMatchResult;
```

### 参数

| 参数     | 类型          | 描述 | 可选 | 默认值  |
| -------- | ------------- | ---- | ---- | ------- |
| pathname | `string`      |      | 否   | -       |
| tokens   | `PathToken[]` |      | 否   | -       |
| strict   | `boolean`     |      | 是   | `false` |

### 返回值

**类型:** `PathMatchResult`

## Router

**Class**

路由类

### 成员

| 名称   | 类型                                                                                                      | 描述             | 可选 |
| ------ | --------------------------------------------------------------------------------------------------------- | ---------------- | ---- |
| routes | `Array<{ method: HttpMethod; path: string; tokens: ReturnType<typeof tokenizePath>; handler: Handler; }>` | 路由列表         | 否   |
| on     | -                                                                                                         | 添加路由         | 否   |
| get    | -                                                                                                         | 添加 GET 路由    | 否   |
| post   | -                                                                                                         | 添加 POST 路由   | 否   |
| put    | -                                                                                                         | 添加 PUT 路由    | 否   |
| patch  | -                                                                                                         | 添加 PATCH 路由  | 否   |
| delete | -                                                                                                         | 添加 DELETE 路由 | 否   |
| match  | -                                                                                                         | 匹配路由         | 否   |

## createRouter

**Function**

创建路由

### 签名

```typescript
createRouter: Router;
```

### 返回值

**类型:** `Router`

路由实例

## DEFAULT_BODY_LIMIT

**Variable**

默认请求体上限：1 MiB

## HttpError

**Class**

可预期的 HTTP 错误（会被按其状态码返回给客户端）

### 成员

| 名称   | 类型     | 描述 | 可选 |
| ------ | -------- | ---- | ---- |
| status | `number` |      | 否   |

## ServerOptions

**Interface**

### 成员

| 名称      | 类型     | 描述                                         | 可选 |
| --------- | -------- | -------------------------------------------- | ---- |
| bodyLimit | `number` | 请求体上限（字节），默认 1 MiB。超限返回 413 | 是   |

## readRequestBody

**Function**

读取请求体（带上限），并按 content-type 解析

### 签名

```typescript
readRequestBody: Promise<{ raw: string; parsed: unknown } | undefined>;
```

### 参数

| 参数  | 类型              | 描述 | 可选 | 默认值 |
| ----- | ----------------- | ---- | ---- | ------ |
| req   | `IncomingMessage` |      | 否   | -      |
| limit | `number`          |      | 否   | -      |

### 返回值

**类型:** `Promise<{ raw: string; parsed: unknown } | undefined>`

## Server

**Class**

HTTP 服务器类

### 成员

| 名称          | 类型                                                                | 描述                                                                       | 可选 |
| ------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---- |
| router        | `Router`                                                            | 路由实例                                                                   | 否   |
| middlewares   | `Array<(ctx: Context, next: () => Promise<void>) => Promise<void>>` | 中间件列表（**按注册顺序执行**）                                           | 否   |
| server        | `NodeServer`                                                        | Node.js 服务器实例                                                         | 是   |
| bodyLimit     | `number`                                                            | 请求体上限                                                                 | 否   |
| use           | -                                                                   | 添加中间件 ⚠️ 执行顺序 = **注册顺序**（与 Koa / Express / Fastify 一致）。 | 否   |
| on            | -                                                                   | 添加路由                                                                   | 否   |
| get           | -                                                                   | 添加 GET 路由                                                              | 否   |
| post          | -                                                                   | 添加 POST 路由                                                             | 否   |
| put           | -                                                                   | 添加 PUT 路由                                                              | 否   |
| patch         | -                                                                   | 添加 PATCH 路由                                                            | 否   |
| delete        | -                                                                   | 添加 DELETE 路由                                                           | 否   |
| listen        | -                                                                   | 启动服务器监听                                                             | 否   |
| close         | -                                                                   | 关闭服务器                                                                 | 否   |
| handleRequest | -                                                                   | 处理请求（统一错误兜底）                                                   | 否   |
| dispatch      | -                                                                   | 实际分发逻辑                                                               | 否   |
| sendError     | -                                                                   | 统一错误响应：`HttpError` 按状态码返回；其余记 500 且不泄漏内部信息        | 否   |
| sendResponse  | -                                                                   | 发送响应                                                                   | 否   |

## createServer

**Function**

创建 HTTP 服务器

### 签名

```typescript
createServer: Server;
```

### 参数

| 参数    | 类型            | 描述 | 可选 | 默认值 |
| ------- | --------------- | ---- | ---- | ------ |
| options | `ServerOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `Server`

服务器实例

## HttpMethod

**Type**

### 签名

```typescript
HttpMethod: SharedHttpMethod;
```

## Context

**Interface**

### 成员

| 名称     | 类型       | 描述 | 可选 |
| -------- | ---------- | ---- | ---- |
| request  | `Request`  |      | 否   |
| response | `Response` |      | 否   |

## Request

**Interface**

### 成员

| 名称    | 类型                                              | 描述                                                                                                                                                                                                              | 可选 |
| ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| method  | `HttpMethod`                                      |                                                                                                                                                                                                                   | 否   |
| url     | `string`                                          |                                                                                                                                                                                                                   | 否   |
| path    | `string`                                          |                                                                                                                                                                                                                   | 否   |
| headers | `Record<string, string \| string[] \| undefined>` |                                                                                                                                                                                                                   | 否   |
| query   | `Record<string, string \| string[]>`              |                                                                                                                                                                                                                   | 否   |
| params  | `Record<string, string>`                          |                                                                                                                                                                                                                   | 否   |
| ip      | `string`                                          |                                                                                                                                                                                                                   | 是   |
| body    | `unknown`                                         | 解析后的请求体（按 `content-type` 决定形态）： - `application/json` ⇒ 解析后的对象 - `application/x-www-form-urlencoded` ⇒ 键值对象 - 其它（含 `text/*`）⇒ 原始字符串 - GET / HEAD / OPTIONS 或空体 ⇒ `undefined` | 是   |
| rawBody | `string`                                          | 未解析的原始请求体字符串                                                                                                                                                                                          | 是   |

## Response

**Interface**

### 成员

| 名称    | 类型                                              | 描述 | 可选 |
| ------- | ------------------------------------------------- | ---- | ---- |
| status  | `number`                                          |      | 否   |
| headers | `Record<string, string \| string[] \| undefined>` |      | 否   |
| body    | `unknown`                                         |      | 是   |

## Route

**Type**

### 签名

```typescript
Route: unknown;
```

## Handler

**Type**

请求处理器函数

### 签名

```typescript
Handler: (ctx: Context) => Promise<void> | void
```
