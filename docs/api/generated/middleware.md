# @lytjs/middleware

中间件核心系统（洋葱模型）

## 目录

- [MiddlewareChain](#middlewarechain)
- [createMiddlewareChain](#createmiddlewarechain)
- [MiddlewareComposer](#middlewarecomposer)
- [createComposer](#createcomposer)
- [createContext](#createcontext)
- [mergeContext](#mergecontext)
- [createMiddleware](#createmiddleware)
- [combineMiddlewares](#combinemiddlewares)
- [conditionalMiddleware](#conditionalmiddleware)
- [Request](#request)
- [Response](#response)
- [MiddlewareContext](#middlewarecontext)
- [Middleware](#middleware)
- [MiddlewareFn](#middlewarefn)
- [FinalHandler](#finalhandler)
- [HandlerFn](#handlerfn)
- [ErrorHandlerFn](#errorhandlerfn)
- [MiddlewareComposerConfig](#middlewarecomposerconfig)

## MiddlewareChain

**Class**

中间件链类

### 成员

| 名称        | 类型           | 描述         | 可选 |
| ----------- | -------------- | ------------ | ---- |
| middlewares | `Middleware[]` |              | 否   |
| use         | -              | 添加中间件   | 否   |
| use         | -              |              | 否   |
| use         | -              |              | 否   |
| execute     | -              | 执行中间件链 | 否   |
| clear       | -              | 清空中间件链 | 否   |

## createMiddlewareChain

**Function**

创建中间件链

### 签名

```typescript
createMiddlewareChain: MiddlewareChain;
```

### 返回值

**类型:** `MiddlewareChain`

## MiddlewareComposer

**Class**

### 成员

| 名称        | 类型                                 | 描述                       | 可选 |
| ----------- | ------------------------------------ | -------------------------- | ---- |
| middlewares | `MiddlewareFn[]`                     |                            | 否   |
| config      | `Required<MiddlewareComposerConfig>` |                            | 否   |
| use         | -                                    | 向链中添加中间件           | 否   |
| useMany     | -                                    | 添加多个中间件             | 否   |
| compose     | -                                    | 使用最终处理器组合中间件链 | 否   |
| clear       | -                                    | 清除所有中间件             | 否   |

## createComposer

**Function**

创建新的中间件组合器

### 签名

```typescript
createComposer: MiddlewareComposer;
```

### 参数

| 参数   | 类型                       | 描述 | 可选 | 默认值 |
| ------ | -------------------------- | ---- | ---- | ------ |
| config | `MiddlewareComposerConfig` |      | 是   | -      |

### 返回值

**类型:** `MiddlewareComposer`

## createContext

**Function**

创建新的中间件上下文

### 签名

```typescript
createContext: MiddlewareContext;
```

### 参数

| 参数    | 类型                      | 描述 | 可选 | 默认值 |
| ------- | ------------------------- | ---- | ---- | ------ |
| request | `Request`                 |      | 否   | -      |
| extra   | `Record<string, unknown>` |      | 是   | -      |

### 返回值

**类型:** `MiddlewareContext`

## mergeContext

**Function**

将额外数据合并到上下文中

### 签名

```typescript
mergeContext: MiddlewareContext;
```

### 参数

| 参数 | 类型                      | 描述 | 可选 | 默认值 |
| ---- | ------------------------- | ---- | ---- | ------ |
| ctx  | `MiddlewareContext`       |      | 否   | -      |
| data | `Record<string, unknown>` |      | 否   | -      |

### 返回值

**类型:** `MiddlewareContext`

## createMiddleware

**Function**

创建中间件函数

### 签名

```typescript
createMiddleware: MiddlewareFn;
```

### 参数

| 参数 | 类型           | 描述 | 可选 | 默认值 |
| ---- | -------------- | ---- | ---- | ------ |
| fn   | `MiddlewareFn` |      | 否   | -      |

### 返回值

**类型:** `MiddlewareFn`

## combineMiddlewares

**Function**

将多个中间件合并为一个

### 签名

```typescript
combineMiddlewares: MiddlewareFn;
```

### 参数

| 参数        | 类型             | 描述 | 可选 | 默认值 |
| ----------- | ---------------- | ---- | ---- | ------ |
| middlewares | `MiddlewareFn[]` |      | 否   | -      |

### 返回值

**类型:** `MiddlewareFn`

## conditionalMiddleware

**Function**

条件中间件执行

### 签名

```typescript
conditionalMiddleware: MiddlewareFn;
```

### 参数

| 参数       | 类型                                  | 描述 | 可选 | 默认值 |
| ---------- | ------------------------------------- | ---- | ---- | ------ |
| condition  | `(ctx: MiddlewareContext) => boolean` |      | 否   | -      |
| middleware | `MiddlewareFn`                        |      | 否   | -      |
| fallback   | `MiddlewareFn`                        |      | 是   | -      |

### 返回值

**类型:** `MiddlewareFn`

## Request

**Type**

中间件类型定义

### 签名

```typescript
Request: unknown;
```

## Response

**Type**

### 签名

```typescript
Response: unknown;
```

## MiddlewareContext

**Interface**

中间件链中传递的请求上下文

### 成员

| 名称     | 类型       | 描述                                       | 可选 |
| -------- | ---------- | ------------------------------------------ | ---- |
| request  | `Request`  | 请求对象                                   | 否   |
| response | `Response` | 响应对象（初始为 undefined，由处理器设置） | 是   |

## Middleware

**Type**

中间件函数类型 - 传统的 (request, context, next) 签名

### 签名

```typescript
Middleware: (request: Request, context: MiddlewareContext, next: () => Promise<void>) =>
  Promise<Response | void | undefined>;
```

## MiddlewareFn

**Type**

中间件函数类型 - 洋葱圈模型签名

### 签名

```typescript
MiddlewareFn: (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void>;
```

## FinalHandler

**Type**

最终处理器函数

### 签名

```typescript
FinalHandler: (request: Request, context: MiddlewareContext) => Promise<Response>;
```

## HandlerFn

**Type**

中间件处理器函数

### 签名

```typescript
HandlerFn: (request: Request, ctx: Record<string, unknown>) => Promise<Response> | Response;
```

## ErrorHandlerFn

**Type**

错误处理函数

### 签名

```typescript
ErrorHandlerFn: (error: Error, ctx: MiddlewareContext) => Promise<Response> | Response;
```

## MiddlewareComposerConfig

**Interface**

中间件组合器配置

### 成员

| 名称         | 类型             | 描述                         | 可选 |
| ------------ | ---------------- | ---------------------------- | ---- |
| errorHandler | `ErrorHandlerFn` | 中间件链的错误处理器         | 是   |
| throwOnError | `boolean`        | 是否抛出错误或调用错误处理器 | 是   |
