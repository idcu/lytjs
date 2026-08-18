# @lytjs/plugin-data-fetch

官方数据请求插件，支持缓存与响应式数据

## 目录

- [DefaultCacheStorage](#defaultcachestorage)
- [generateCacheKey](#generatecachekey)
- [delay](#delay)
- [createFetchError](#createfetcherror)
- [createFetch](#createfetch)
- [createFetchManager](#createfetchmanager)
- [RequestOptions](#requestoptions)
- [FetchError](#fetcherror)
- [CacheEntry](#cacheentry)
- [CacheStorage](#cachestorage)
- [Interceptor](#interceptor)
- [FetchState](#fetchstate)
- [FetchInstance](#fetchinstance)
- [FetchPluginOptions](#fetchpluginoptions)
- [RequestInterceptor](#requestinterceptor)
- [ResponseInterceptor](#responseinterceptor)
- [ErrorInterceptor](#errorinterceptor)

## DefaultCacheStorage

**Class**

默认内存缓存实现

### 成员

| 名称   | 类型 | 描述 | 可选 |
| ------ | ---- | ---- | ---- |
| cache  | -    |      | 否   |
| get    | -    |      | 否   |
| set    | -    |      | 否   |
| delete | -    |      | 否   |
| clear  | -    |      | 否   |
| has    | -    |      | 否   |

## generateCacheKey

**Function**

生成缓存键

### 签名

```typescript
generateCacheKey: string;
```

### 参数

| 参数    | 类型             | 描述 | 可选 | 默认值 |
| ------- | ---------------- | ---- | ---- | ------ |
| url     | `string`         |      | 否   | -      |
| options | `RequestOptions` |      | 是   | {}     |

### 返回值

**类型:** `string`

## delay

**Function**

延迟函数

### 签名

```typescript
delay: Promise<void>;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| ms   | `number` |      | 否   | -      |

### 返回值

**类型:** `Promise<void>`

## createFetchError

**Function**

创建 Fetch 错误

### 签名

```typescript
createFetchError: FetchError;
```

### 参数

| 参数          | 类型             | 描述 | 可选 | 默认值 |
| ------------- | ---------------- | ---- | ---- | ------ |
| message       | `string`         |      | 否   | -      |
| config        | `RequestOptions` |      | 是   | -      |
| response      | `Response`       |      | 是   | -      |
| originalError | `Error`          |      | 是   | -      |

### 返回值

**类型:** `FetchError`

## createFetch

**Function**

创建数据获取实例

### 签名

```typescript
createFetch: FetchInstance<T>;
```

### 参数

| 参数          | 类型                 | 描述 | 可选 | 默认值 |
| ------------- | -------------------- | ---- | ---- | ------ |
| url           | `string`             |      | 否   | -      |
| options       | `RequestOptions`     |      | 是   | {}     |
| globalOptions | `FetchPluginOptions` |      | 是   | {}     |

### 返回值

**类型:** `FetchInstance<T>`

## createFetchManager

**Function**

创建 Fetch 管理器

## RequestOptions

**Interface**

### 成员

| 名称            | 类型                         | 描述                     | 可选            |
| --------------- | ---------------------------- | ------------------------ | --------------- | ------------- | -------- | --- |
| baseUrl         | `string`                     | 基础 URL                 | 是              |
| timeout         | `number`                     | 超时时间（毫秒）         | 是              |
| retries         | `number`                     | 重试次数                 | 是              |
| retryDelay      | `number`                     | 重试延迟（毫秒）         | 是              |
| cacheStrategy   | `'no-cache'                  | 'cache-first'            | 'network-first' | 'cache-only'` | 缓存策略 | 是  |
| cacheTime       | `number`                     | 缓存时间（毫秒）         | 是              |
| requestKey      | `string`                     | 请求标识，用于缓存键生成 | 是              |
| cancelDuplicate | `boolean`                    | 是否取消重复请求         | 是              |
| onError         | `(error: FetchError) => void | Promise<void>`           | 自定义错误处理  | 是            |

## FetchError

**Interface**

### 成员

| 名称          | 类型             | 描述        | 可选 |
| ------------- | ---------------- | ----------- | ---- |
| status        | `number`         | HTTP 状态码 | 是   |
| response      | `Response`       | 原始响应    | 是   |
| originalError | `Error`          | 原始错误    | 是   |
| config        | `RequestOptions` | 请求配置    | 是   |

## CacheEntry

**Interface**

### 成员

| 名称      | 类型     | 描述     | 可选 |
| --------- | -------- | -------- | ---- |
| data      | `T`      | 缓存数据 | 否   |
| expiresAt | `number` | 过期时间 | 否   |
| createdAt | `number` | 创建时间 | 否   |

## CacheStorage

**Interface**

### 成员

| 名称   | 类型 | 描述                   | 可选 |
| ------ | ---- | ---------------------- | ---- |
| get    | -    | 获取缓存               | 否   |
| set    | -    | 设置缓存               | 否   |
| delete | -    | 删除缓存               | 否   |
| clear  | -    | 清空缓存               | 否   |
| has    | -    | 检查缓存是否存在且有效 | 否   |

## Interceptor

**Interface**

### 成员

| 名称     | 类型                                        | 描述                     | 可选       |
| -------- | ------------------------------------------- | ------------------------ | ---------- | --- |
| request  | `(config: RequestOptions) => RequestOptions | Promise<RequestOptions>` | 请求拦截器 | 是  |
| response | `(response: T) => T                         | Promise<T>`              | 响应拦截器 | 是  |
| error    | `(error: FetchError) => FetchError          | Promise<FetchError>`     | 错误拦截器 | 是  |

## FetchState

**Interface**

### 成员

| 名称         | 类型        | 描述       | 可选     |
| ------------ | ----------- | ---------- | -------- | --- |
| data         | `T          | null`      | 请求数据 | 否  |
| isLoading    | `boolean`   | 加载状态   | 否       |
| error        | `FetchError | null`      | 错误状态 | 否  |
| isSuccess    | `boolean`   | 是否已完成 | 否       |
| isError      | `boolean`   | 是否失败   | 否       |
| refetchCount | `number`    | 请求次数   | 否       |

## FetchInstance

**Interface**

### 成员

| 名称     | 类型                      | 描述         | 可选 |
| -------- | ------------------------- | ------------ | ---- |
| state    | `Readonly<FetchState<T>>` | 当前状态     | 否   |
| fetch    | -                         | 发起请求     | 否   |
| refetch  | -                         | 重新请求     | 否   |
| cancel   | -                         | 取消请求     | 否   |
| setData  | -                         | 手动更新数据 | 否   |
| setError | -                         | 手动更新错误 | 否   |
| reset    | -                         | 清空状态     | 否   |

## FetchPluginOptions

**Interface**

### 成员

| 名称                 | 类型                              | 描述           | 可选 |
| -------------------- | --------------------------------- | -------------- | ---- |
| baseUrl              | `string`                          | 基础 URL       | 是   |
| timeout              | `number`                          | 默认超时时间   | 是   |
| retries              | `number`                          | 默认重试次数   | 是   |
| retryDelay           | `number`                          | 默认重试延迟   | 是   |
| defaultCacheStrategy | `RequestOptions['cacheStrategy']` | 默认缓存策略   | 是   |
| defaultCacheTime     | `number`                          | 默认缓存时间   | 是   |
| requestInterceptors  | `Interceptor['request'][]`        | 请求拦截器     | 是   |
| responseInterceptors | `Interceptor['response'][]`       | 响应拦截器     | 是   |
| errorInterceptors    | `Interceptor['error'][]`          | 错误拦截器     | 是   |
| cacheStorage         | `CacheStorage`                    | 自定义缓存存储 | 是   |

## RequestInterceptor

**Interface**

## ResponseInterceptor

**Interface**

## ErrorInterceptor

**Interface**
