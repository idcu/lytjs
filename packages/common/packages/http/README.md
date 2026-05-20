# @lytjs/common-http

基于原生 `fetch` API 的轻量级 HTTP 客户端，支持拦截器、超时、数组查询参数等功能。

## 安装

```bash
pnpm add @lytjs/common-http
```

## 快速开始

### 基础使用

```typescript
import { http, getJson, postJson } from '@lytjs/common-http';

// 使用默认 http 实例发送请求
const response = await http.get('/api/users');
console.log(response.data);

// 或使用便捷的 JSON 方法
const data = await getJson('/api/users');
```

### 创建自定义客户端

```typescript
import { createHttpClient } from '@lytjs/common-http';

const apiClient = createHttpClient({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

const users = await apiClient.get('/users');
```

## API

### 便捷方法

| 方法                                 | 说明                                 |
| ------------------------------------ | ------------------------------------ |
| `get<T>(url, options?)`              | 发送 GET 请求                        |
| `post<T>(url, data?, options?)`      | 发送 POST 请求                       |
| `put<T>(url, data?, options?)`       | 发送 PUT 请求                        |
| `patch<T>(url, data?, options?)`     | 发送 PATCH 请求                      |
| `del<T>(url, options?)`              | 发送 DELETE 请求                     |
| `getJson<T>(url, options?)`          | 发送 GET 请求并直接返回 JSON 数据    |
| `postJson<T>(url, data?, options?)`  | 发送 POST 请求并直接返回 JSON 数据   |
| `putJson<T>(url, data?, options?)`   | 发送 PUT 请求并直接返回 JSON 数据    |
| `patchJson<T>(url, data?, options?)` | 发送 PATCH 请求并直接返回 JSON 数据  |
| `deleteJson<T>(url, options?)`       | 发送 DELETE 请求并直接返回 JSON 数据 |

### HttpClient 类

```typescript
import { HttpClient, createHttpClient } from '@lytjs/common-http';

const client = new HttpClient({
  baseURL: 'https://api.example.com',
  headers: { 'X-API-Key': 'your-key' },
  timeout: 10000,
});

// 或者使用工厂函数
const client = createHttpClient({
  baseURL: 'https://api.example.com',
});
```

### 请求选项

```typescript
interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | Array<string | number | boolean>>;
  timeout?: number;
  signal?: AbortSignal;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}
```

### 响应格式

```typescript
interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  ok: boolean;
}
```

## 特性

### 1. 数组查询参数支持

```typescript
import { get } from '@lytjs/common-http';

// 数组参数会被正确地处理为多个相同键名的查询参数
await get('/api/users', {
  params: {
    ids: [1, 2, 3],
    tags: ['admin', 'user'],
  },
});
// 结果: /api/users?ids=1&ids=2&ids=3&tags=admin&tags=user
```

### 2. 拦截器

```typescript
import { http } from '@lytjs/common-http';

// 添加请求拦截器
http.use({
  request(config) {
    config.headers['X-Request-ID'] = Math.random().toString(36);
    return config;
  },
});

// 添加响应拦截器
http.use({
  response(response) {
    console.log('请求成功:', response.status);
    return response;
  },
  error(error) {
    console.error('请求失败:', error);
    throw error;
  },
});
```

### 3. 请求取消

```typescript
import { http } from '@lytjs/common-http';

const controller = new AbortController();

// 5 秒后取消请求
setTimeout(() => controller.abort(), 5000);

try {
  await http.get('/api/slow-endpoint', {
    signal: controller.signal,
  });
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

### 4. 超时控制

```typescript
import { http, createHttpClient } from '@lytjs/common-http';

// 单次请求超时
await http.get('/api/slow', { timeout: 3000 });

// 全局超时配置
const client = createHttpClient({ timeout: 5000 });
```

## 错误处理

```typescript
import { http, HttpError } from '@lytjs/common-http';

try {
  const response = await http.get('/api/users');
} catch (err) {
  if (err instanceof HttpError) {
    console.error('HTTP 错误:', err.status, err.message);
    if (err.response) {
      console.error('响应数据:', err.response.data);
    }
  } else {
    console.error('其他错误:', err);
  }
}
```

## 完整示例

```typescript
import { createHttpClient, getJson, postJson, HttpError } from '@lytjs/common-http';

// 创建 API 客户端
const api = createHttpClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加身份验证拦截器
api.use({
  request(config) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error(err) {
    if (err instanceof HttpError && err.status === 401) {
      // 处理未授权
      window.location.href = '/login';
    }
    throw err;
  },
});

// 使用 API 客户端
async function fetchUsers() {
  try {
    const users = await api.get('/users', {
      params: {
        status: 'active',
        page: 1,
      },
    });
    return users.data;
  } catch (err) {
    console.error('获取用户失败', err);
  }
}

// 使用便捷方法
async function createUser(data: any) {
  try {
    const user = await postJson('/users', data, {
      baseURL: 'https://api.example.com',
    });
    return user;
  } catch (err) {
    console.error('创建用户失败', err);
  }
}
```

## License

MIT
