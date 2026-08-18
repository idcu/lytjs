# @lytjs/api

API 路由引擎

## 目录

- [DEFAULT_OPTIONS](#default-options)
- [createApiRouter](#createapirouter)
- [ApiRouteConfig](#apirouteconfig)
- [ApiRouterOptions](#apirouteroptions)
- [ApiRequestContext](#apirequestcontext)
- [ApiResponse](#apiresponse)
- [ApiHandler](#apihandler)
- [ApiMiddleware](#apimiddleware)
- [ApiMatch](#apimatch)
- [ApiRouter](#apirouter)
- [isDirectory](#isdirectory)
- [isFile](#isfile)
- [HTTP_METHODS](#http-methods)
- [extractHttpMethods](#extracthttpmethods)
- [filePathToApiPath](#filepathtoapipath)
- [extractDynamicParams](#extractdynamicparams)
- [scanApiDirectory](#scanapidirectory)

## DEFAULT_OPTIONS

**Variable**

默认配置选项

## createApiRouter

**Function**

创建 API 路由器

### 签名

```typescript
createApiRouter: ApiRouter;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `ApiRouterOptions` |      | 是   | -      |

### 返回值

**类型:** `ApiRouter`

## ApiRouteConfig

**Interface**

API 路由配置

### 成员

| 名称            | 类型           | 描述           | 可选 |
| --------------- | -------------- | -------------- | ---- |
| path            | `string`       | 路由路径       | 否   |
| methods         | `HttpMethod[]` | HTTP 方法      | 否   |
| handlerPath     | `string`       | 处理函数路径   | 否   |
| isDynamic       | `boolean`      | 是否为动态路由 | 否   |
| params          | `string[]`     | 动态路由参数名 | 是   |
| middlewarePaths | `string[]`     | 中间件路径     | 是   |

## ApiRouterOptions

**Interface**

API 路由器配置选项

### 成员

| 名称              | 类型       | 描述               | 可选 |
| ----------------- | ---------- | ------------------ | ---- |
| apiDir            | `string`   | API 目录路径       | 否   |
| extensions        | `string[]` | API 处理函数扩展名 | 是   |
| middlewarePattern | `string`   | 中间件文件名称模式 | 是   |
| ignorePatterns    | `string[]` | 忽略文件模式       | 是   |
| strictMode        | `boolean`  | 是否启用严格模式   | 是   |

## ApiRequestContext

**Interface**

API 请求上下文

### 成员

| 名称    | 类型                     | 描述       | 可选     |
| ------- | ------------------------ | ---------- | -------- | --- |
| method  | `HttpMethod`             | 请求方法   | 否       |
| path    | `string`                 | 请求路径   | 否       |
| headers | `Record<string, string>` | 请求头     | 否       |
| params  | `Record<string, string>` | 请求参数   | 否       |
| query   | `Record<string, string   | string[]>` | 查询参数 | 否  |
| body    | `unknown`                | 请求体     | 是       |

## ApiResponse

**Interface**

API 响应对象

### 成员

| 名称    | 类型                     | 描述   | 可选 |
| ------- | ------------------------ | ------ | ---- |
| status  | `number`                 | 状态码 | 否   |
| headers | `Record<string, string>` | 响应头 | 否   |
| body    | `unknown`                | 响应体 | 是   |

## ApiHandler

**Type**

API 处理函数

### 签名

```typescript
ApiHandler: (context: ApiRequestContext) => Promise<ApiResponse> | ApiResponse;
```

## ApiMiddleware

**Type**

API 中间件函数

### 签名

```typescript
ApiMiddleware: (context: ApiRequestContext, next: () => Promise<ApiResponse>) =>
  Promise<ApiResponse>;
```

## ApiMatch

**Interface**

API 匹配结果

### 成员

| 名称   | 类型                     | 描述           | 可选 |
| ------ | ------------------------ | -------------- | ---- |
| route  | `ApiRouteConfig`         | 匹配的路由配置 | 否   |
| method | `HttpMethod`             | 请求方法       | 否   |
| params | `Record<string, string>` | 路由参数       | 否   |
| path   | `string`                 | 请求路径       | 否   |

## ApiRouter

**Interface**

API 路由器接口

### 成员

| 名称          | 类型 | 描述                  | 可选 |
| ------------- | ---- | --------------------- | ---- |
| getRoutes     | -    | 获取所有 API 路由配置 | 否   |
| match         | -    | 匹配 API 路由         | 否   |
| addRoute      | -    | 添加 API 路由         | 否   |
| removeRoute   | -    | 移除 API 路由         | 否   |
| clearRoutes   | -    | 清除所有 API 路由     | 否   |
| refresh       | -    | 重新扫描文件系统      | 否   |
| handleRequest | -    | 处理 API 请求         | 否   |

## isDirectory

**Function**

检查是否为目录

### 签名

```typescript
isDirectory: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## isFile

**Function**

检查是否为文件

### 签名

```typescript
isFile: boolean;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| path | `string` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## HTTP_METHODS

**Variable**

HTTP 请求方法列表

## extractHttpMethods

**Function**

从文件名中提取 HTTP 方法

### 签名

```typescript
extractHttpMethods: HttpMethod[]
```

### 参数

| 参数     | 类型     | 描述 | 可选 | 默认值 |
| -------- | -------- | ---- | ---- | ------ |
| filename | `string` |      | 否   | -      |

### 返回值

**类型:** `HttpMethod[]`

## filePathToApiPath

**Function**

转换文件路径到 API 路径

### 签名

```typescript
filePathToApiPath: string;
```

### 参数

| 参数       | 类型       | 描述 | 可选 | 默认值 |
| ---------- | ---------- | ---- | ---- | ------ |
| filePath   | `string`   |      | 否   | -      |
| baseDir    | `string`   |      | 否   | -      |
| extensions | `string[]` |      | 否   | -      |

### 返回值

**类型:** `string`

## extractDynamicParams

**Function**

提取动态路由参数名

### 签名

```typescript
extractDynamicParams: string[]
```

### 参数

| 参数    | 类型     | 描述 | 可选 | 默认值 |
| ------- | -------- | ---- | ---- | ------ |
| apiPath | `string` |      | 否   | -      |

### 返回值

**类型:** `string[]`

## scanApiDirectory

**Function**

递归扫描目录收集 API 路由文件

### 签名

```typescript
scanApiDirectory: ApiRouteConfig[]
```

### 参数

| 参数           | 类型       | 描述 | 可选 | 默认值 |
| -------------- | ---------- | ---- | ---- | ------ |
| dir            | `string`   |      | 否   | -      |
| baseDir        | `string`   |      | 否   | -      |
| extensions     | `string[]` |      | 否   | -      |
| ignorePatterns | `string[]` |      | 否   | -      |

### 返回值

**类型:** `ApiRouteConfig[]`
