# @lytjs/middleware-auth

认证中间件

## 目录

- [Middleware](#middleware)
- [MiddlewareContext](#middlewarecontext)
- [createAuthMiddleware](#createauthmiddleware)
- [AuthUser](#authuser)
- [AuthOptions](#authoptions)

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

## createAuthMiddleware

**Function**

创建认证中间件

### 签名

```typescript
createAuthMiddleware: Middleware;
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| options | `AuthOptions` |      | 否   | -      |

### 返回值

**类型:** `Middleware`

认证中间件函数

## AuthUser

**Interface**

认证用户类型

### 成员

| 名称 | 类型               | 描述    | 可选 |
| ---- | ------------------ | ------- | ---- |
| id   | `string \| number` | 用户 ID | 否   |

## AuthOptions

**Interface**

认证中间件配置选项

### 成员

| 名称         | 类型                                           | 描述                                     | 可选 |
| ------------ | ---------------------------------------------- | ---------------------------------------- | ---- |
| authenticate | `(token: string) => Promise<AuthUser \| null>` | 认证函数，接收 token 返回用户信息或 null | 否   |
| headerName   | `string`                                       | 认证头名称，默认为 Authorization         | 是   |
