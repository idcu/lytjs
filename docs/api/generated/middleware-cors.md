# @lytjs/middleware-cors

CORS 跨域中间件

## 目录

- [Middleware](#middleware)
- [MiddlewareContext](#middlewarecontext)
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

| 名称            | 类型                            | 描述                                            | 可选 |
| --------------- | ------------------------------- | ----------------------------------------------- | ---- |
| origin          | `string \| string[] \| boolean` | 允许的源 - 字符串或数组，或 true 表示镜像请求源 | 是   |
| methods         | `string[]`                      | 允许的方法                                      | 是   |
| allowedHeaders  | `string[]`                      | 允许的请求头                                    | 是   |
| exposedHeaders  | `string[]`                      | 暴露的响应头                                    | 是   |
| credentials     | `boolean`                       | 允许凭证                                        | 是   |
| maxAge          | `number`                        | 预检请求的最大缓存时间                          | 是   |
| preflightStatus | `number`                        | 预检响应的状态码                                | 是   |
