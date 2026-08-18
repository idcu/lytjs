# @lytjs/plugin-data

官方增强数据插件

## 目录

- [LRUEntry](#lruentry)
- [LRUCache](#lrucache)
- [TTLCache](#ttlcache)
- [pendingRequests](#pendingrequests)
- [activeInstances](#activeinstances)
- [createData](#createdata)
- [createDataManager](#createdatamanager)
- [pluginData](#plugindata)
- [RequestOptions](#requestoptions)
- [DataPluginOptions](#datapluginoptions)
- [DataManager](#datamanager)
- [DataInstance](#datainstance)
- [DedupeEntry](#dedupeentry)

## LRUEntry

**Interface**

### 成员

| 名称         | 类型     | 描述 | 可选 |
| ------------ | -------- | ---- | ---- |
| lastAccessed | `number` |      | 否   |

## LRUCache

**Class**

### 成员

| 名称       | 类型     | 描述             | 可选 |
| ---------- | -------- | ---------------- | ---- |
| cache      | -        |                  | 否   |
| maxSize    | `number` |                  | 否   |
| get        | -        |                  | 否   |
| set        | -        |                  | 否   |
| delete     | -        |                  | 否   |
| clear      | -        |                  | 否   |
| has        | -        |                  | 否   |
| evict      | -        |                  | 否   |
| size       | -        | 获取缓存大小     | 否   |
| getMaxSize | -        | 获取最大缓存大小 | 否   |

## TTLCache

**Class**

### 成员

| 名称   | 类型 | 描述           | 可选 |
| ------ | ---- | -------------- | ---- |
| cache  | -    |                | 否   |
| get    | -    |                | 否   |
| set    | -    |                | 否   |
| delete | -    |                | 否   |
| clear  | -    |                | 否   |
| has    | -    |                | 否   |
| size   | -    | 获取缓存大小   | 否   |
| keys   | -    | 获取所有缓存键 | 否   |

## pendingRequests

**Variable**

请求去重映射表

## activeInstances

**Variable**

活跃的数据实例集合

## createData

**Function**

创建数据实例

### 签名

```typescript
createData: DataInstance<T>;
```

### 参数

| 参数          | 类型                | 描述 | 可选 | 默认值 |
| ------------- | ------------------- | ---- | ---- | ------ |
| url           | `string`            |      | 否   | -      |
| options       | `RequestOptions`    |      | 是   | `{}`   |
| globalOptions | `DataPluginOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `DataInstance<T>`

## createDataManager

**Function**

创建数据管理器

### 签名

```typescript
createDataManager: DataManager;
```

### 参数

| 参数          | 类型                | 描述 | 可选 | 默认值 |
| ------------- | ------------------- | ---- | ---- | ------ |
| globalOptions | `DataPluginOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `DataManager`

## pluginData

**Variable**

定义插件

## RequestOptions

**Interface**

### 成员

| 名称           | 类型      | 描述             | 可选 |
| -------------- | --------- | ---------------- | ---- |
| dedupe         | `boolean` | 是否启用请求去重 | 是   |
| optimisticData | `unknown` | 乐观更新数据     | 是   |
| prefetch       | `boolean` | 预取相关配置     | 是   |

## DataPluginOptions

**Interface**

### 成员

| 名称             | 类型                                                                                                                                                  | 描述                | 可选 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---- |
| defaultDedupe    | `boolean`                                                                                                                                             | 默认去重设置        | 是   |
| offlineMode      | `boolean`                                                                                                                                             | 离线模式            | 是   |
| storeIntegration | `{ /** 数据同步时的钩子 */ onSync?: (key: string, data: unknown) => void; /** 数据更新时的钩子 */ onUpdate?: (key: string, data: unknown) => void; }` | 与 store 的集成配置 | 是   |

## DataManager

**Interface**

### 成员

| 名称                   | 类型 | 描述                 | 可选 |
| ---------------------- | ---- | -------------------- | ---- |
| createData             | -    | 创建数据实例         | 否   |
| get                    | -    | 执行简单 GET 请求    | 否   |
| post                   | -    | 执行简单 POST 请求   | 否   |
| put                    | -    | 执行简单 PUT 请求    | 否   |
| delete                 | -    | 执行简单 DELETE 请求 | 否   |
| addRequestInterceptor  | -    | 添加请求拦截器       | 否   |
| addResponseInterceptor | -    | 添加响应拦截器       | 否   |
| addErrorInterceptor    | -    | 添加错误拦截器       | 否   |
| getCacheStorage        | -    | 获取缓存存储         | 否   |
| clearCache             | -    | 清空缓存             | 否   |
| invalidateCache        | -    | 清除特定缓存         | 否   |
| prefetch               | -    | 预取数据             | 否   |
| getPendingRequests     | -    | 获取当前的请求队列   | 否   |
| cancelAllRequests      | -    | 取消所有请求         | 否   |

## DataInstance

**Interface**

### 成员

| 名称               | 类型      | 描述         | 可选 |
| ------------------ | --------- | ------------ | ---- |
| optimisticUpdate   | -         | 乐观更新数据 | 否   |
| rollbackOptimistic | -         | 回滚乐观更新 | 否   |
| isPrefetching      | `boolean` | 获取预取状态 | 否   |

## DedupeEntry

**Interface**

### 成员

| 名称      | 类型               | 描述 | 可选 |
| --------- | ------------------ | ---- | ---- |
| promise   | `Promise<unknown>` |      | 否   |
| timestamp | `number`           |      | 否   |
