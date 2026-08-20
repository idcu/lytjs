# @lytjs/plugin-data-fetch

LytJS 官方数据请求插件，支持缓存、重试与拦截器等增强能力。

## 简介·独立声明

LytJS 官方数据请求插件，支持缓存、重试与拦截器等增强能力。

> **框架无关性说明**：本插件为框架生态包，零第三方依赖，仅构建于 LytJS 核心之上（仅依赖 `@lytjs/core` 与 `@lytjs/reactivity`，均实际使用）。按 v6.12 路线图规划，所有 @lytjs/plugin-\* 插件将统一迁出为独立仓库 lytjs-plugins，保持 API 兼容并提供迁移指南。

## 安装

```bash
pnpm add @lytjs/plugin-data-fetch
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginDataFetch from '@lytjs/plugin-data-fetch';

const app = createApp();
app.use(pluginDataFetch, {
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 2,
  defaultCacheStrategy: 'cache-first',
});
```

安装后可通过 `$fetch` / `$http`（或 provide 注入的 `lyt-fetch`）使用：

```typescript
// 创建可复用请求实例
const users = $fetch.createFetch('/users');
const { data, isLoading } = users.state;
await users.fetch();
await users.refetch();
users.cancel();
users.reset();

// 简洁请求方法
const user = await $fetch.get<User>('/users/1');
await $fetch.post('/users', { name: 'Tom' });
await $fetch.put('/users/1', { name: 'Jerry' });
await $fetch.delete('/users/1');
```

### 独立使用

```typescript
import { createFetch } from '@lytjs/plugin-data-fetch';

const instance = createFetch('/users', {
  cacheStrategy: 'ttl',
  cacheTime: 60000,
});
const data = await instance.fetch();
```

## 特性

- 多种缓存策略（`no-cache`、`cache-only`、`cache-first`、`network-first`）
- 请求重试与超时控制
- 请求 / 响应 / 错误拦截器
- 重复请求取消
- 响应式状态（`FetchState`）

## API

### 创建实例

| 导出                                        | 说明                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `createFetch(url, options, globalOptions?)` | 创建请求实例                                                                             |
| `createFetchManager(globalOptions?)`        | 创建请求管理器（含 `createFetch`、`get`、`post`、`put`、`delete`、拦截器注册、缓存管理） |
| `DefaultCacheStorage`                       | 默认内存缓存实现                                                                         |
| `generateCacheKey(url, options)`            | 生成缓存键                                                                               |

### FetchInstance

`state`（`FetchState`，含 `data`、`isLoading`、`error`、`isSuccess`、`isError`、`refetchCount`），以及 `fetch()`、`refetch()`、`cancel()`、`setData()`、`setError()`、`reset()`。

### 类型

`RequestOptions`、`FetchError`、`CacheEntry`、`CacheStorage`、`Interceptor`、`FetchState`、`FetchInstance`、`FetchPluginOptions`、`RequestInterceptor`、`ResponseInterceptor`、`ErrorInterceptor`。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。
- [@lytjs/reactivity](../../../reactivity)：响应式信号机制。
- [@lytjs/plugin-data](../plugin-data)：基于本插件的增强版数据获取插件。

## 许可证

[MIT](../../../../LICENSE)
