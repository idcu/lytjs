# 自定义插件

LytJS 提供强大的插件系统，允许你扩展框架功能。本文详细介绍如何创建、注册和使用自定义插件。

## 插件系统概述

LytJS 插件是一个包含安装函数的对象，可以在应用启动时注册：

```typescript
import type { Plugin } from '@lytjs/core';

const myPlugin: Plugin = {
  install(app, options) {
    // 插件安装逻辑
  },
};

app.use(myPlugin, { /* 插件选项 */ });
```

## 插件基础

### 创建简单插件

```typescript
import { defineComponent, type Plugin } from '@lytjs/core';

// 创建计数器插件
export const counterPlugin: Plugin = {
  install(app) {
    const counters = new Map<string, number>();

    app.provide('counter', {
      get: (name: string) => counters.get(name) || 0,
      increment: (name: string) => {
        const current = counters.get(name) || 0;
        counters.set(name, current + 1);
      },
      reset: (name: string) => counters.delete(name),
    });
  },
};

// 使用插件
app.use(counterPlugin);
```

### 插件选项

插件可以接收配置选项：

```typescript
interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}

const loggerPlugin: Plugin<LoggerOptions> = {
  install(app, options) {
    const { level = 'info', prefix = '[App]' } = options || {};

    const log = (message: string, ...args: any[]) => {
      console.log(`${prefix} ${message}`, ...args);
    };

    app.provide('logger', {
      debug: (msg: string, ...args: any[]) => log(`[DEBUG] ${msg}`, ...args),
      info: (msg: string, ...args: any[]) => log(`[INFO] ${msg}`, ...args),
      warn: (msg: string, ...args: any[]) => log(`[WARN] ${msg}`, ...args),
      error: (msg: string, ...args: any[]) => log(`[ERROR] ${msg}`, ...args),
    });
  },
};

// 使用带选项的插件
app.use(loggerPlugin, { level: 'debug', prefix: '[MyApp]' });
```

## 插件 API

### 全局属性

插件可以添加全局属性：

```typescript
const globalPlugin: Plugin = {
  install(app) {
    // 添加全局属性
    app.config.globalProperties.$myPlugin = {
      getVersion: () => '1.0.0',
      getTimestamp: () => Date.now(),
    };

    // 添加全局方法
    app.config.globalProperties.$formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('zh-CN').format(date);
    };
  },
};
```

### 依赖注入

使用 provide/inject 在插件中共享数据：

```typescript
const configPlugin: Plugin = {
  install(app) {
    const config = {
      apiBaseUrl: 'https://api.example.com',
      timeout: 5000,
      retryCount: 3,
    };

    app.provide('appConfig', config);
  },
};

// 在组件中使用
import { inject } from '@lytjs/core';

const MyComponent = defineComponent({
  setup() {
    const config = inject('appConfig');

    const fetchData = async () => {
      const response = await fetch(`${config.apiBaseUrl}/data`, {
        timeout: config.timeout,
      });
      return response.json();
    };

    return { config, fetchData };
  },
});
```

### 组合式函数插件

创建可复用的组合式函数：

```typescript
// composables/useTheme.ts
import { signal, computed } from '@lytjs/reactivity';

export type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const theme = signal<Theme>('auto');
  const resolvedTheme = computed(() => {
    if (theme() === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return theme();
  });

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}

// theme-plugin.ts
import type { Plugin } from '@lytjs/core';
import { useTheme } from './composables/useTheme';

export const themePlugin: Plugin = {
  install(app) {
    const theme = useTheme();
    app.provide('theme', theme);
  },
};
```

## 官方插件兼容

### 使用 definePlugin

官方插件使用 definePlugin API：

```typescript
import { definePlugin } from '@lytjs/core';

const myPlugin = definePlugin({
  name: 'my-plugin',
  setup() {
    // 插件逻辑
    return {
      // 导出的 API
      someMethod: () => {},
    };
  },
});
```

### 插件配置 Schema

使用 JSON Schema 验证插件配置：

```typescript
import { definePlugin } from '@lytjs/core';

const myPlugin = definePlugin({
  name: 'my-plugin',
  configSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      debug: { type: 'boolean', default: false },
    },
    required: ['apiKey'],
  },
  setup(options) {
    // options.apiKey 和 options.debug
  },
});
```

## 实战示例

### API 请求插件

```typescript
import type { Plugin } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';

interface RequestOptions {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface RequestPlugin {
  get: <T>(url: string, options?: RequestInit) => Promise<T>;
  post: <T>(url: string, data: any, options?: RequestInit) => Promise<T>;
  put: <T>(url: string, data: any, options?: RequestInit) => Promise<T>;
  delete: <T>(url: string, options?: RequestInit) => Promise<T>;
}

const requestPlugin: Plugin<RequestOptions> = {
  name: 'request',
  install(app, options) {
    const { baseUrl, timeout = 10000, headers = {} } = options;

    const isLoading = signal(false);

    const request = async <T>(
      method: string,
      url: string,
      data?: any,
      extraOptions?: RequestInit
    ): Promise<T> => {
      isLoading.value = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}${url}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
          ...extraOptions,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      } finally {
        isLoading.value = false;
      }
    };

    const requestAPI: RequestPlugin = {
      get: <T>(url: string, options?: RequestInit) =>
        request<T>('GET', url, undefined, options),
      post: <T>(url: string, data: any, options?: RequestInit) =>
        request<T>('POST', url, data, options),
      put: <T>(url: string, data: any, options?: RequestInit) =>
        request<T>('PUT', url, data, options),
      delete: <T>(url: string, options?: RequestInit) =>
        request<T>('DELETE', url, undefined, options),
    };

    app.provide('request', requestAPI);
    app.provide('requestLoading', isLoading);
  },
};

// 使用插件
app.use(requestPlugin, {
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  headers: {
    Authorization: 'Bearer token',
  },
});
```

### 权限控制插件

```typescript
import type { Plugin } from '@lytjs/core';
import { signal, computed } from '@lytjs/reactivity';

interface Permission {
  resource: string;
  actions: string[];
}

interface AuthPlugin {
  user: ReturnType<typeof signal<any>>;
  permissions: ReturnType<typeof signal<Permission[]>>;
  isAuthenticated: ReturnType<typeof computed<boolean>>;
  hasPermission: (resource: string, action: string) => boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const authPlugin: Plugin = {
  name: 'auth',
  install(app) {
    const user = signal<any>(null);
    const permissions = signal<Permission[]>([]);

    const isAuthenticated = computed(() => user.value !== null);

    const hasPermission = (resource: string, action: string) => {
      if (isAuthenticated.value === false) return false;
      return permissions().some(
        (p) => p.resource === resource && p.actions.includes(action)
      );
    };

    const login = async (credentials: any) => {
      // 实现登录逻辑
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      user.value = data.user;
      permissions.value = data.permissions;
    };

    const logout = () => {
      user.value = null;
      permissions.value = [];
    };

    app.provide('auth', {
      user,
      permissions,
      isAuthenticated,
      hasPermission,
      login,
      logout,
    });
  },
};

app.use(authPlugin);
```

## 插件测试

### 单元测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '@lytjs/core';
import { counterPlugin } from '../src/plugins/counter';

describe('counterPlugin', () => {
  let app: any;

  beforeEach(() => {
    app = {
      provide: vi.fn(),
      config: { globalProperties: {} },
    };
  });

  it('should install successfully', () => {
    counterPlugin.install(app);

    expect(app.provide).toHaveBeenCalledWith(
      'counter',
      expect.objectContaining({
        get: expect.any(Function),
        increment: expect.any(Function),
        reset: expect.any(Function),
      })
    );
  });

  it('should handle counter operations', () => {
    counterPlugin.install(app);
    const [key, counterAPI] = app.provide.mock.calls[0];

    expect(key).toBe('counter');

    // 测试 get
    expect(counterAPI.get('test')).toBe(0);

    // 测试 increment
    counterAPI.increment('test');
    expect(counterAPI.get('test')).toBe(1);

    // 测试 reset
    counterAPI.reset('test');
    expect(counterAPI.get('test')).toBe(0);
  });
});
```

### 集成测试

```typescript
import { describe, it, expect } from 'vitest';
import { createApp } from '@lytjs/core';
import { counterPlugin } from '../src/plugins/counter';

describe('counterPlugin integration', () => {
  it('should work with app.use', () => {
    const app = createApp({});

    expect(() => {
      app.use(counterPlugin);
    }).not.toThrow();
  });
});
```

## 发布插件

### 包结构

```
my-lytjs-plugin/
├── src/
│   ├── index.ts          # 入口文件
│   ├── plugin.ts         # 插件实现
│   └── composables/      # 组合式函数
├── package.json
├── tsconfig.json
└── README.md
```

### package.json 配置

```json
{
  "name": "@lytjscommunity/my-plugin",
  "version": "1.0.0",
  "description": "A LytJS plugin",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "keywords": [
    "lytjs",
    "plugin"
  ],
  "peerDependencies": {
    "@lytjs/core": ">=6.0.0"
  }
}
```

### 入口文件

```typescript
// src/index.ts
export { myPlugin } from './plugin';
export type { MyPluginOptions } from './types';
```

## 最佳实践

### 命名规范

- 使用清晰的插件名称
- 添加 `lytjs-plugin-` 前缀（npm 包名）
- 避免与官方插件重名

### 类型安全

- 始终定义完整的 TypeScript 类型
- 提供插件选项的 Schema 验证
- 导出清晰的 API 接口

### 错误处理

```typescript
const robustPlugin: Plugin = {
  install(app, options) {
    try {
      // 插件逻辑
    } catch (error) {
      console.error(`[${pluginName}] Installation failed:`, error);
      throw error;
    }
  },
};
```

### 文档完善

- 提供清晰的 README
- 包含使用示例
- 说明 API 和选项
- 提供 TypeScript 类型文档

## 常见问题

### Q: 如何调试插件？

A: 在插件中添加 console.log 或使用 debugger 语句。也可以在浏览器 DevTools 中查看 LytJS 面板。

### Q: 插件加载顺序重要吗？

A: 是的。后面加载的插件可以访问前面插件提供的功能。

### Q: 如何让插件支持 SSR？

A: 确保插件不依赖浏览器特定 API，使用 process.client 或 window 进行条件判断。

### Q: 如何处理插件依赖？

A: 在插件文档中说明依赖关系，让用户按正确顺序加载。

## 总结

插件系统是 LytJS 扩展能力的关键。通过遵循本文的最佳实践，你可以创建高质量、可复用的插件，为社区贡献价值。
