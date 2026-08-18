# @lytjs/runtime-edge

边缘运行时支持（Serverless 适配）

## 目录

- [createEdgeCache](#createedgecache)
- [createEdgeRouter](#createedgerouter)
- [jsonResponse](#jsonresponse)
- [textResponse](#textresponse)
- [htmlResponse](#htmlresponse)
- [redirectResponse](#redirectresponse)
- [EdgeRequest](#edgerequest)
- [EdgeResponse](#edgeresponse)
- [EdgeContext](#edgecontext)
- [EdgeHandler](#edgehandler)
- [EdgeRouterOptions](#edgerouteroptions)
- [EdgeRoute](#edgeroute)
- [EdgeRouter](#edgerouter)
- [EdgeCacheOptions](#edgecacheoptions)
- [EdgeCacheEntry](#edgecacheentry)
- [EdgeCache](#edgecache)

## createEdgeCache

**Function**

创建内存边缘缓存

### 签名

```typescript
createEdgeCache: EdgeCache;
```

### 返回值

**类型:** `EdgeCache`

## createEdgeRouter

**Function**

创建边缘路由器

### 签名

```typescript
createEdgeRouter: EdgeRouter;
```

### 参数

| 参数    | 类型                | 描述 | 可选 | 默认值 |
| ------- | ------------------- | ---- | ---- | ------ |
| options | `EdgeRouterOptions` |      | 是   | {}     |

### 返回值

**类型:** `EdgeRouter`

## jsonResponse

**Function**

创建 JSON 响应

### 签名

```typescript
jsonResponse: EdgeResponse;
```

### 参数

| 参数   | 类型      | 描述 | 可选 | 默认值 |
| ------ | --------- | ---- | ---- | ------ |
| data   | `unknown` |      | 否   | -      |
| status | `any`     |      | 是   | 200    |

### 返回值

**类型:** `EdgeResponse`

## textResponse

**Function**

创建文本响应

### 签名

```typescript
textResponse: EdgeResponse;
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| text   | `string` |      | 否   | -      |
| status | `any`    |      | 是   | 200    |

### 返回值

**类型:** `EdgeResponse`

## htmlResponse

**Function**

创建 HTML 响应

### 签名

```typescript
htmlResponse: EdgeResponse;
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| html   | `string` |      | 否   | -      |
| status | `any`    |      | 是   | 200    |

### 返回值

**类型:** `EdgeResponse`

## redirectResponse

**Function**

创建重定向响应

### 签名

```typescript
redirectResponse: EdgeResponse;
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| location | `string` |      | 否   | -      |
| status   | `any`    |      | 是   | 302    |

### 返回值

**类型:** `EdgeResponse`

## EdgeRequest

**Interface**

### 成员

| 名称    | 类型                     | 描述 | 可选 |
| ------- | ------------------------ | ---- | ---- |
| url     | `string`                 |      | 否   |
| method  | `string`                 |      | 否   |
| headers | `Record<string, string>` |      | 否   |
| body    | `ReadableStream`         |      | 是   |
| signal  | `AbortSignal`            |      | 是   |

## EdgeResponse

**Interface**

### 成员

| 名称       | 类型                     | 描述 | 可选 |
| ---------- | ------------------------ | ---- | ---- |
| status     | `number`                 |      | 否   |
| statusText | `string`                 |      | 否   |
| headers    | `Record<string, string>` |      | 否   |
| body       | `ReadableStream`         |      | 是   |

## EdgeContext

**Interface**

### 成员

| 名称                   | 类型 | 描述 | 可选 |
| ---------------------- | ---- | ---- | ---- |
| waitUntil              | -    |      | 否   |
| passThroughOnException | -    |      | 否   |

## EdgeHandler

**Interface**

## EdgeRouterOptions

**Interface**

### 成员

| 名称     | 类型     | 描述 | 可选 |
| -------- | -------- | ---- | ---- |
| basePath | `string` |      | 是   |

## EdgeRoute

**Interface**

### 成员

| 名称    | 类型          | 描述 | 可选 |
| ------- | ------------- | ---- | ---- |
| path    | `string`      |      | 否   |
| handler | `EdgeHandler` |      | 否   |
| method  | `string`      |      | 否   |

## EdgeRouter

**Interface**

### 成员

| 名称   | 类型 | 描述 | 可选 |
| ------ | ---- | ---- | ---- |
| get    | -    |      | 否   |
| post   | -    |      | 否   |
| put    | -    |      | 否   |
| delete | -    |      | 否   |
| patch  | -    |      | 否   |
| match  | -    |      | 否   |
| handle | -    |      | 否   |

## EdgeCacheOptions

**Interface**

### 成员

| 名称                 | 类型      | 描述 | 可选 |
| -------------------- | --------- | ---- | ---- |
| ttl                  | `number`  |      | 是   |
| swr                  | `boolean` |      | 是   |
| staleWhileRevalidate | `number`  |      | 是   |

## EdgeCacheEntry

**Interface**

### 成员

| 名称    | 类型     | 描述 | 可选 |
| ------- | -------- | ---- | ---- |
| value   | `T`      |      | 否   |
| expires | `number` |      | 否   |

## EdgeCache

**Interface**

### 成员

| 名称   | 类型 | 描述 | 可选 |
| ------ | ---- | ---- | ---- |
| get    | -    |      | 否   |
| set    | -    |      | 否   |
| delete | -    |      | 否   |
| clear  | -    |      | 否   |
| has    | -    |      | 否   |
