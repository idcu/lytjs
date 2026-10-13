# @lytjs/middleware-cors

CORS 跨域中间件

## 目录

- [Middleware](#middleware)
- [MiddlewareContext](#middlewarecontext)
- [assertCredentialsSafe](#assertcredentialssafe)
- [resolveAllowOrigin](#resolvealloworigin)
- [createCorsMiddleware](#createcorsmiddleware)
- [corsMiddleware](#corsmiddleware)
- [CorsConfig](#corsconfig)

## Middleware

**Type**

### 签名

```typescript
Middleware: unknown;
```

## MiddlewareContext

**Type**

### 签名

```typescript
MiddlewareContext: Record<string, unknown>;
```

## assertCredentialsSafe

**Function**

构造期校验：拦住「允许凭证 + 任意源」这一必然出错的组合。

为什么是抛错而不是警告：该组合**不可能**按用户预期工作 ——
浏览器会拒绝 `ACAC:true` 搭配 `ACAO:*`；而若实现改为反射请求源，
就变成把带凭证的响应开放给任意站点。两种结局都不可接受 ⇒ 快速失败。

### 签名

```typescript
assertCredentialsSafe: void
```

### 参数

| 参数        | 类型                   | 描述 | 可选 | 默认值 |
| ----------- | ---------------------- | ---- | ---- | ------ |
| origin      | `CorsConfig['origin']` |      | 否   | -      |
| credentials | `boolean`              |      | 否   | -      |

### 返回值

**类型:** `void`

## resolveAllowOrigin

**Function**

解析本次请求应返回的 `Access-Control-Allow-Origin` 值

### 签名

```typescript
resolveAllowOrigin: {
  value: string | null;
  varies: boolean;
}
```

### 参数

| 参数   | 类型                   | 描述 | 可选 | 默认值 |
| ------ | ---------------------- | ---- | ---- | ------ |
| allow  | `CorsConfig['origin']` |      | 否   | -      |
| origin | `string \| null`       |      | 否   | -      |

### 返回值

**类型:** `{ value: string | null; varies: boolean }`

## createCorsMiddleware

**Function**

创建 CORS 中间件

### 签名

```typescript
createCorsMiddleware: Middleware;
```

### 参数

| 参数   | 类型         | 描述 | 可选 | 默认值 |
| ------ | ------------ | ---- | ---- | ------ |
| config | `CorsConfig` |      | 是   | `{}`   |

### 返回值

**类型:** `Middleware`

## corsMiddleware

**Variable**

默认 CORS 中间件

## CorsConfig

**Interface**

CORS 中间件类型

### 成员

| 名称            | 类型                                                             | 描述                                                                                                                                                                                                                                                      | 可选 |
| --------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| origin          | `string \| string[] \| boolean \| ((origin: string) => boolean)` | 允许的源： - 字符串（`'https://a.com'`）或数组（白名单） - `'*'`：任意源。**不可与 `credentials: true` 共用**（构造时抛错） - `true`：镜像请求的 `Origin`。**不可与 `credentials: true` 共用**（构造时抛错） - 判定函数 `(origin) => boolean`：动态白名单 | 是   |
| methods         | `string[]`                                                       | 允许的方法                                                                                                                                                                                                                                                | 是   |
| allowedHeaders  | `string[]`                                                       | 允许的请求头                                                                                                                                                                                                                                              | 是   |
| exposedHeaders  | `string[]`                                                       | 暴露的响应头                                                                                                                                                                                                                                              | 是   |
| credentials     | `boolean`                                                        | 允许携带凭证（Cookie / Authorization）。 ⚠️ 开启时必须配**显式白名单**（字符串 / 数组 / 判定函数）； 搭配 `origin: '*'` 或 `origin: true` 会在创建中间件时抛错。                                                                                          | 是   |
| maxAge          | `number`                                                         | 预检请求的最大缓存时间                                                                                                                                                                                                                                    | 是   |
| preflightStatus | `number`                                                         | 预检响应的状态码                                                                                                                                                                                                                                          | 是   |
