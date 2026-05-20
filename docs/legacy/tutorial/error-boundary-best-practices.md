# ErrorBoundary 实战案例

本文档展示 ErrorBoundary 在实际应用中的最佳实践。

## 目录

- [基础用法](#基础用法)
- [全局错误处理](#全局错误处理)
- [重试机制](#重试机制)
- [错误日志系统](#错误日志系统)
- [实际应用场景](#实际应用场景)

---

## 基础用法

### 1. 简单错误边界

```typescript
import { ErrorBoundary } from '@lytjs/core';
import { createApp, h } from '@lytjs/core';

function App() {
  return h(
    ErrorBoundary,
    {
      fallback: ({ error, reset }) =>
        h(
          'div',
          {
            class: 'error-fallback',
          },
          [
            h('h2', null, '出错了'),
            h('p', null, error.message),
            h(
              'button',
              {
                onClick: reset,
              },
              '重试',
            ),
          ],
        ),
    },
    [
      // 子组件
    ],
  );
}
```

### 2. 自定义降级组件

```typescript
import { ErrorBoundary, type FallbackProps } from '@lytjs/core';

function ErrorFallback(props: FallbackProps) {
  return h(
    'div',
    {
      class: 'error-boundary',
    },
    [
      h('h3', null, '组件加载失败'),
      h('p', null, `错误信息: ${props.error.message}`),
      h('p', null, `重试次数: ${props.retryCount}/${props.maxRetries}`),
      h('div', { class: 'actions' }, [
        props.hasRetries &&
          h(
            'button',
            {
              onClick: props.retry,
            },
            '重试',
          ),
        h(
          'button',
          {
            onClick: props.reset,
          },
          '重置',
        ),
      ]),
    ],
  );
}

function App() {
  return h(ErrorBoundary, {
    fallback: ErrorFallback,
    maxRetries: 3,
    retryDelay: 1000,
  });
}
```

---

## 全局错误处理

### 1. 设置全局错误报告器

```typescript
import {
  setGlobalErrorReporter,
  getGlobalErrorReporter,
  type ErrorReporter,
  type ErrorContext,
} from '@lytjs/core';

class CustomErrorReporter implements ErrorReporter {
  report(error: Error, context: ErrorContext) {
    console.log('[Error Reporter]', {
      message: error.message,
      stack: error.stack,
      context: {
        componentName: context.componentName,
        url: context.url,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
      },
    });

    // 可以发送到错误追踪服务
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          component: context,
        },
      });
    }
  }
}

setGlobalErrorReporter(new CustomErrorReporter());
```

### 2. 结合应用错误处理

```typescript
import { createApp, h } from '@lytjs/core';

const app = createApp({
  render() {
    return h(ErrorBoundary, {
      onError: (error, errorInfo) => {
        console.error('应用错误:', error);
        console.error('错误信息:', errorInfo);
      },
    });
  },
});

app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误处理器:', err);
  console.error('组件实例:', instance);
  console.error('错误信息:', info);
};

app.mount('#app');
```

---

## 重试机制

### 1. 自动重试组件

```typescript
import { ErrorBoundary, type ErrorBoundaryProps } from '@lytjs/core';

interface RetryableComponentProps {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (count: number) => void;
}

function RetryableComponent(props: RetryableComponentProps) {
  return h(ErrorBoundary, {
    maxRetries: props.maxRetries ?? 3,
    retryDelay: props.retryDelay ?? 1000,
    onRetry: (count) => {
      console.log(`重试次数: ${count}`);
      props.onRetry?.(count);
    },
    onMaxRetriesReached: (error) => {
      console.error('已达到最大重试次数:', error);
      // 可以发送告警通知
    },
  });
}
```

### 2. 条件重试

```typescript
function ConditionalRetryBoundary() {
  const maxRetries = signal(3);
  const currentRetry = signal(0);

  return h(ErrorBoundary, {
    maxRetries: maxRetry.value,
    retryDelay: 2000,
    onRetry: () => {
      currentRetry.value++;
      console.log(`当前重试: ${currentRetry.value}`);
    },
    fallback: ({ retryCount, maxRetries, retry }) => {
      const shouldAutoRetry = retryCount < maxRetries;

      return h('div', { class: 'retry-container' }, [
        shouldAutoRetry
          ? h('button', { onClick: retry }, `自动重试 (${retryCount}/${maxRetries})`)
          : h('div', null, '重试已达上限，请手动刷新页面'),
      ]);
    },
  });
}
```

---

## 错误日志系统

### 1. 使用错误日志管理器

```typescript
import { errorLogManager, type ErrorLog } from '@lytjs/core';

// 添加错误日志
function addErrorLog(error: Error, componentName: string) {
  errorLogManager.addLog({
    id: `err_${Date.now()}`,
    timestamp: new Date(),
    error: error,
    errorInfo: {
      componentStack: componentName,
      timestamp: new Date(),
    },
    context: {
      componentName: componentName,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date(),
    },
    retryCount: 0,
  });
}

// 获取错误统计
function getErrorStats() {
  const stats = errorLogManager.getErrorStats();

  return {
    总错误数: stats.totalErrors,
    错误类型分布: stats.errorTypes,
    最近错误: stats.recentErrors.map((log) => ({
      时间: log.timestamp,
      错误: log.error.message,
      类型: log.error.name,
    })),
  };
}

// 导出错误日志
function exportErrorLogs() {
  const logs = errorLogManager.exportLogs();

  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `error-logs-${new Date().toISOString()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

### 2. 错误日志面板

```typescript
import { errorLogManager, h } from '@lytjs/core';

function ErrorLogPanel() {
  const logs = errorLogManager.getLogs();
  const stats = errorLogManager.getErrorStats();

  return h('div', { class: 'error-log-panel' }, [
    h('h2', null, '错误日志面板'),
    h('div', { class: 'stats' }, [
      h('span', null, `总计: ${stats.totalErrors}`),
      h('span', null, `错误类型: ${Object.keys(stats.errorTypes).length}`),
    ]),
    h(
      'button',
      {
        onClick: () => errorLogManager.clearLogs(),
      },
      '清空日志',
    ),
    h(
      'button',
      {
        onClick: () => {
          const data = errorLogManager.exportLogs();
          console.log(data);
        },
      },
      '导出日志',
    ),
    h(
      'div',
      { class: 'log-list' },
      logs.map((log) =>
        h(
          'div',
          {
            class: 'log-item',
            key: log.id,
          },
          [
            h('span', { class: 'timestamp' }, log.timestamp.toLocaleString()),
            h('span', { class: 'error-type' }, log.error.name),
            h('span', { class: 'error-message' }, log.error.message),
          ],
        ),
      ),
    ),
  ]);
}
```

---

## 实际应用场景

### 1. 数据获取组件

```typescript
import { ErrorBoundary, h, signal } from '@lytjs/core';

interface DataFetcherProps {
  url: string;
  children: (data: any) => any;
}

function DataFetcher(props: DataFetcherProps) {
  const data = signal(null);
  const loading = signal(true);
  const error = signal<Error | null>(null);

  async function fetchData() {
    try {
      loading.value = true;
      const response = await fetch(props.url);
      data.value = await response.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return h(
    ErrorBoundary,
    {
      fallback: ({ retry }) =>
        h('div', { class: 'error-state' }, [
          h('p', null, '数据加载失败'),
          h('button', { onClick: retry }, '重试'),
          h('button', { onClick: fetchData }, '重新获取'),
        ]),
      onError: (err) => console.error('数据获取错误:', err),
    },
    [loading.value ? h('div', null, '加载中...') : error.value ? null : props.children(data.value)],
  );
}

// 使用示例
function UserProfile({ userId }: { userId: string }) {
  return h(DataFetcher, {
    url: `/api/users/${userId}`,
    children: (user) =>
      h('div', { class: 'user-profile' }, [h('h1', null, user.name), h('p', null, user.email)]),
  });
}
```

### 2. 表单组件

```typescript
import { ErrorBoundary, h } from '@lytjs/core';

interface FormSectionProps {
  title: string;
  children: any;
}

function FormSection(props: FormSectionProps) {
  return h(
    ErrorBoundary,
    {
      fallback: ({ error, reset }) =>
        h('div', { class: 'form-error' }, [
          h('strong', null, `表单 "${props.title}" 部分出错`),
          h('small', null, error.message),
          h('button', { onClick: reset }, '重置此部分'),
        ]),
    },
    [props.children],
  );
}

function RegistrationForm() {
  return h('form', { class: 'registration-form' }, [
    h(FormSection, {
      title: '基本信息',
      children: h('div', { class: 'form-section' }, [
        h('input', { name: 'username', placeholder: '用户名' }),
        h('input', { name: 'email', placeholder: '邮箱' }),
      ]),
    }),
    h(FormSection, {
      title: '详细信息',
      children: h('div', { class: 'form-section' }, [
        h('input', { name: 'phone', placeholder: '电话' }),
        h('textarea', { name: 'bio', placeholder: '简介' }),
      ]),
    }),
  ]);
}
```

### 3. 路由级别的错误边界

```typescript
import { ErrorBoundary, h } from '@lytjs/core';

interface RouteBoundaryProps {
  path: string;
  component: any;
}

function RouteBoundary(props: RouteBoundaryProps) {
  return h(
    ErrorBoundary,
    {
      fallback: ({ error, reset }) =>
        h('div', { class: 'route-error' }, [
          h('h2', null, '页面加载失败'),
          h('p', null, `路径: ${props.path}`),
          h('pre', null, error.message),
          h('div', { class: 'actions' }, [
            h('button', { onClick: reset }, '重试'),
            h('a', { href: '/' }, '返回首页'),
          ]),
        ]),
      maxRetries: 2,
      retryDelay: 1500,
    },
    [h(props.component)],
  );
}

// 路由配置
const routes = [
  { path: '/', component: HomePage },
  { path: '/users', component: UserListPage },
  { path: '/users/:id', component: UserDetailPage },
  { path: '/settings', component: SettingsPage },
];

function AppRouter() {
  return h(
    'div',
    { class: 'router' },
    routes.map((route) =>
      h(RouteBoundary, {
        key: route.path,
        path: route.path,
        component: route.component,
      }),
    ),
  );
}
```

### 4. 第三方组件包装

```typescript
import { ErrorBoundary, h } from '@lytjs/core';

interface SafeComponentProps {
  component: any;
  props: any;
  fallback?: any;
}

function SafeComponent(props: SafeComponentProps) {
  return h(
    ErrorBoundary,
    {
      fallback:
        props.fallback ??
        (({ error }) =>
          h('div', { class: 'component-error' }, [
            h('p', null, '组件渲染失败'),
            h('small', null, error.message),
          ])),
      onError: (error, info) => {
        console.error('第三方组件错误:', error);
        console.error('组件堆栈:', info.componentStack);
      },
    },
    [h(props.component, props.props)],
  );
}

// 使用示例
function ThirdPartyDemo() {
  return h('div', null, [
    h(SafeComponent, {
      component: UnstableChart,
      props: { data: chartData },
    }),
    h(SafeComponent, {
      component: ExternalWidget,
      props: { config: widgetConfig },
      fallback: ({ reset }) => h('div', ['组件加载失败', h('button', { onClick: reset }, '重试')]),
    }),
  ]);
}
```

---

## 最佳实践

### 1. 错误边界粒度

```typescript
// ✅ 好的实践：细粒度错误边界
function FineGrainedExample() {
  return h('div', null, [
    h(ErrorBoundary, { key: 'header' }, [h(Header)]),
    h(ErrorBoundary, { key: 'sidebar' }, [h(Sidebar)]),
    h(ErrorBoundary, { key: 'main' }, [h(MainContent)]),
    h(ErrorBoundary, { key: 'footer' }, [h(Footer)]),
  ]);
}

// ❌ 不好的实践：粗粒度错误边界
function CoarseGrainedExample() {
  return h(ErrorBoundary, null, [
    // 整个应用只有一个错误边界
    h(Header),
    h(Sidebar),
    h(MainContent),
    h(Footer),
  ]);
}
```

### 2. 不要捕获的错误

```typescript
// 以下情况不应该使用错误边界
// 1. 事件处理器中的错误
// 2. 异步代码中的错误（使用 try/catch）
// 3. 服务端渲染错误
// 4. 错误边界自身的错误

function EventHandlerExample() {
  function handleClick() {
    // ✅ 在事件处理器中使用 try/catch
    try {
      throw new Error('点击事件错误');
    } catch (e) {
      console.error(e);
    }
  }

  return h('button', { onClick: handleClick }, '点击');
}
```

### 3. 错误恢复策略

```typescript
function RecoveryStrategy() {
  const recoveryState = signal<'idle' | 'retrying' | 'failed'>('idle');

  return h(ErrorBoundary, {
    onRetry: () => {
      recoveryState.value = 'retrying';
    },
    onMaxRetriesReached: () => {
      recoveryState.value = 'failed';
    },
    fallback: ({ error, retry }) => {
      if (recoveryState.value === 'failed') {
        return h('div', null, [h('p', null, '无法恢复'), h('a', { href: '/' }, '返回首页')]);
      }

      return h('div', null, [h('p', null, error.message), h('button', { onClick: retry }, '重试')]);
    },
  });
}
```

---

## 总结

ErrorBoundary 是 LytJS 提供的强大错误处理机制：

1. **组件级错误隔离** - 防止错误蔓延
2. **灵活的重试机制** - 支持自动重试和手动重试
3. **完整的日志系统** - 记录、统计、导出错误
4. **可定制的降级 UI** - 提供友好的错误展示
5. **全局错误报告** - 支持自定义错误收集服务

合理使用 ErrorBoundary 可以显著提升应用的健壮性和用户体验。
