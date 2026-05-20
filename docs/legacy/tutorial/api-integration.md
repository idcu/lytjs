# API 集成

在现代 Web 应用中，与后端 API 进行交互是常见的需求。本教程将介绍如何在 LytJS 中进行 API 集成。

## 基础 Fetch 请求

### 简单 GET 请求

```typescript
import { defineComponent, signal, onMounted } from '@lytjs/core';

export default defineComponent({
  setup() {
    const data = signal<any>(null);
    const isLoading = signal(false);
    const error = signal<string | null>(null);

    const fetchData = async () => {
      isLoading(true);
      error(null);
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('请求失败');
        const json = await response.json();
        data(json);
      } catch (e) {
        error(e instanceof Error ? e.message : '请求出错');
      } finally {
        isLoading(false);
      }
    };

    onMounted(fetchData);

    return {
      data,
      isLoading,
      error,
      fetchData,
    };
  },

  template: `
    <div>
      <div v-if="isLoading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="data">
        <pre>{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
      <button @click="fetchData" :disabled="isLoading">
        重新加载
      </button>
    </div>
  `,
});
```

### POST 请求

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const username = signal('');
    const isSubmitting = signal(false);

    const submitForm = async () => {
      if (!username()) return;

      isSubmitting(true);
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username(),
          }),
        });

        const result = await response.json();
        console.log('创建用户成功:', result);
      } catch (e) {
        console.error('创建用户失败:', e);
      } finally {
        isSubmitting(false);
      }
    };

    return {
      username,
      isSubmitting,
      submitForm,
    };
  },

  template: `
    <form @submit.prevent="submitForm">
      <input 
        v-model="username" 
        placeholder="用户名"
      />
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? '提交中...' : '提交' }}
      </button>
    </form>
  `,
});
```

## 错误处理

### 统一错误处理

```typescript
import { signal, computed } from '@lytjs/reactivity';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function useApi() {
  const isLoading = signal(false);
  const error = signal<ApiError | null>(null);

  const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    isLoading(true);
    error(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new ApiError(`请求失败: ${response.status}`, response.status);
      }

      return await response.json();
    } catch (e) {
      error(e instanceof ApiError ? e : new ApiError('网络错误', 500));
      throw e;
    } finally {
      isLoading(false);
    }
  };

  return {
    isLoading: computed(() => isLoading()),
    error: computed(() => error()),
    request,
  };
}
```

## 数据缓存与重试

### 简单缓存机制

```typescript
import { signal } from '@lytjs/reactivity';

const cache = new Map<string, { data: any; timestamp: number }>();

export function useCachedApi() {
  const cacheDuration = 5 * 60 * 1000; // 5分钟

  const get = async <T>(url: string): Promise<T> => {
    const cached = cache.get(url);

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data as T;
    }

    const response = await fetch(url);
    const data = await response.json();

    cache.set(url, { data, timestamp: Date.now() });

    return data as T;
  };

  return { get };
}
```

### 请求重试

```typescript
async function requestWithRetry(
  url: string,
  retries: number = 3,
  delay: number = 1000,
): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('请求失败');
    return response.json();
  } catch (e) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return requestWithRetry(url, retries - 1, delay * 2);
    }
    throw e;
  }
}
```

## API 集成最佳实践

### ✅ 推荐做法

```typescript
// 1. 抽取公共逻辑到 composable
import { signal, computed, effect } from '@lytjs/reactivity';

export function useFetch<T>(url: string) {
  const data = signal<T | null>(null);
  const isLoading = signal(false);
  const error = signal<string | null>(null);

  const fetchData = async () => {
    isLoading(true);
    error(null);
    try {
      const res = await fetch(url);
      data(await res.json());
    } catch (e) {
      error(e instanceof Error ? e.message : '请求失败');
    } finally {
      isLoading(false);
    }
  };

  return {
    data: computed(() => data()),
    isLoading: computed(() => isLoading()),
    error: computed(() => error()),
    fetchData,
  };
}

// 2. 使用 TypeScript 定义 API 类型
interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

// 3. 分离 API 配置
const API_BASE = '/api';
const API_ENDPOINTS = {
  USERS: `${API_BASE}/users`,
  POSTS: `${API_BASE}/posts`,
};
```

### ❌ 避免做法

```typescript
// 避免：在组件中直接硬编码 API 路径
fetch('/api/some-endpoint');
// 更好的方式：使用配置常量

// 避免：不处理 loading 和 error 状态
// 更好的方式：始终提供 loading 和 error 状态
```

## 下一步

- 学习 [性能优化](./performance.md)
- 查看 [状态管理](./state-management.md)
- 阅读 [架构文档](../development/ARCHITECTURE.md)
