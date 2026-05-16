# ErrorBoundary 错误边界组件

> LytJS 官方错误处理和恢复机制

## 目录

- [简介](#简介)
- [基础用法](#基础用法)
- [降级策略](#降级策略)
- [重试机制](#重试机制)
- [错误报告](#错误报告)
- [错误日志](#错误日志)
- [API 参考](#api-参考)
- [最佳实践](#最佳实践)

---

## 简介

ErrorBoundary 是 LytJS 提供的错误处理组件，用于捕获子组件树中的 JavaScript 错误，显示降级 UI，而不是让整个组件树崩溃。

### 特性

- ✅ **声明式错误处理** - 使用 JSX 风格的组件
- ✅ **灵活的降级策略** - 支持组件、内联、回调等多种方式
- ✅ **自动重试机制** - 可配置重试次数和延迟
- ✅ **错误报告系统** - 支持自定义错误报告器
- ✅ **错误日志管理** - 完整的错误日志记录和导出
- ✅ **零依赖** - 遵循 LytJS 零第三方依赖原则

---

## 基础用法

### 最简单的用法

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 默认降级 UI

当子组件抛出错误时，ErrorBoundary 会显示默认的错误提示：

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

默认显示：
- 错误消息
- 重试按钮
- 重置按钮

---

## 降级策略

### 1. 使用 fallback 属性

```typescript
import { ErrorBoundary } from '@lytjs/core';

function ErrorFallback(props: FallbackProps) {
  return (
    <div style={{ padding: 20, background: '#fee' }}>
      <h2>出错了</h2>
      <p>{props.error.message}</p>
      <button onClick={props.reset}>重置</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 2. 使用 fallbackRender 回调

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary
      fallbackRender={(error, errorInfo, reset) => (
        <div className="error-container">
          <h2>加载失败</h2>
          <p>{error.message}</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {error.stack}
          </details>
          <button onClick={reset}>重试</button>
        </div>
      )}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 3. 自定义降级样式

```typescript
function CustomErrorFallback(props: FallbackProps) {
  return (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>😕</h1>
      <h2 style={{ marginBottom: '20px' }}>抱歉，页面出错了</h2>
      <p style={{ opacity: 0.9, marginBottom: '30px' }}>
        {props.error.message}
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={props.retry}
        >
          重试
        </button>
        <button
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid white',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={props.reset}
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
```

---

## 重试机制

### 基本重试配置

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary
      maxRetries={3}
      retryDelay={1000}
    >
      <DataFetcher />
    </ErrorBoundary>
  );
}
```

### 重试回调

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary
      maxRetries={3}
      retryDelay={2000}
      onRetry={(retryCount) => {
        console.log(`正在第 ${retryCount} 次重试...`);
      }}
      onMaxRetriesReached={(error) => {
        console.error('已达到最大重试次数', error);
        // 发送错误报告
        errorReporter.report(error);
      }}
    >
      <DataFetcher />
    </ErrorBoundary>
  );
}
```

### FallbackProps 中的重试

```typescript
function ErrorFallback(props: FallbackProps) {
  return (
    <div>
      <h2>出错了</h2>
      <p>错误: {props.error.message}</p>

      <p>重试进度: {props.retryCount} / {props.maxRetries}</p>

      {props.hasRetries && (
        <button onClick={props.retry}>
          重新尝试
        </button>
      )}

      <button onClick={props.reset}>
        重置
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      maxRetries={5}
      fallback={ErrorFallback}
    >
      <NetworkComponent />
    </ErrorBoundary>
  );
}
```

### 指数退避重试

```typescript
import { ErrorBoundary } from '@lytjs/core';

// 使用指数退避策略
function App() {
  const retryDelay = 1000; // 基础延迟 1 秒

  return (
    <ErrorBoundary
      maxRetries={5}
      retryDelay={retryDelay}
      onRetry={(retryCount) => {
        // 指数退避：1s, 2s, 4s, 8s, 16s
        console.log(`第 ${retryCount} 次重试，延迟 ${retryDelay * Math.pow(2, retryCount - 1)}ms`);
      }}
    >
      <NetworkComponent />
    </ErrorBoundary>
  );
}
```

---

## 错误报告

### 使用内置控制台报告器

默认情况下，ErrorBoundary 会将错误输出到控制台：

```typescript
import { ErrorBoundary } from '@lytjs/core';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('组件树错误:', error);
        console.error('错误详情:', errorInfo);
      }}
    >
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 自定义错误报告器

```typescript
import {
  ErrorBoundary,
  setGlobalErrorReporter,
  type ErrorReporter,
  type ErrorContext
} from '@lytjs/core';

// 自定义错误报告器
class CustomErrorReporter implements ErrorReporter {
  report(error: Error, context: ErrorContext) {
    // 发送到错误追踪服务
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context: {
          url: context.url,
          userAgent: context.userAgent,
          timestamp: context.timestamp,
        }
      })
    });

    // 同时输出到控制台
    console.error('[ErrorReporter]', error, context);
  }
}

// 设置全局错误报告器
setGlobalErrorReporter(new CustomErrorReporter());

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

### 获取全局报告器

```typescript
import { getGlobalErrorReporter } from '@lytjs/core';

const reporter = getGlobalErrorReporter();
```

---

## 错误日志

### 基本用法

```typescript
import { errorLogManager } from '@lytjs/core';

function ErrorLogsViewer() {
  const logs = errorLogManager.getLogs();

  return (
    <div>
      <h2>错误日志</h2>
      <button onClick={() => errorLogManager.clearLogs()}>
        清除日志
      </button>
      <button onClick={() => {
        const json = errorLogManager.exportLogs();
        console.log(json);
      }}>
        导出日志
      </button>

      <ul>
        {logs.map(log => (
          <li key={log.id}>
            <strong>{log.error.message}</strong>
            <span>{log.timestamp.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 错误统计

```typescript
import { errorLogManager } from '@lytjs/core';

// 获取错误统计
const stats = errorLogManager.getErrorStats();

console.log('总错误数:', stats.totalErrors);
console.log('错误类型统计:', stats.errorTypes);
console.log('最近错误:', stats.recentErrors);
```

### 按类型过滤

```typescript
import { errorLogManager } from '@lytjs/core';

// 获取特定类型的错误
const typeErrors = errorLogManager.getLogsByErrorType('TypeError');

// 按日期范围过滤
const now = new Date();
const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const recentErrors = errorLogManager.getLogsByDateRange(hourAgo, now);
```

### 获取单个日志

```typescript
import { errorLogManager } from '@lytjs/core';

// 通过 ID 获取单个错误日志
const log = errorLogManager.getLogById('err_1234567890_abc123');
if (log) {
  console.log('错误:', log.error);
  console.log('上下文:', log.context);
  console.log('时间:', log.timestamp);
}
```

---

## API 参考

### ErrorBoundary Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fallback` | `Component<FallbackProps>` | 内置组件 | 降级组件 |
| `fallbackRender` | `(error, errorInfo, reset) => VNode` | - | 降级渲染函数 |
| `onError` | `(error, errorInfo) => void` | - | 错误回调 |
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `retryDelay` | `number` | `1000` | 重试延迟（毫秒） |
| `onRetry` | `(retryCount) => void` | - | 重试回调 |
| `onMaxRetriesReached` | `(error) => void` | - | 达到最大重试次数回调 |

### FallbackProps

| 属性 | 类型 | 说明 |
|------|------|------|
| `error` | `Error` | 捕获的错误对象 |
| `errorInfo` | `ErrorInfo` | 错误详情信息 |
| `reset` | `() => void` | 重置函数 |
| `retry` | `() => void` | 重试函数 |
| `retryCount` | `number` | 当前重试次数 |
| `maxRetries` | `number` | 最大重试次数 |
| `hasRetries` | `boolean` | 是否还有重试机会 |

### ErrorInfo

| 属性 | 类型 | 说明 |
|------|------|------|
| `componentStack` | `string` | 组件堆栈信息 |
| `timestamp` | `Date` | 错误发生时间 |

### 错误报告 API

```typescript
// 设置全局错误报告器
setGlobalErrorReporter(reporter: ErrorReporter): void;

// 获取全局错误报告器
getGlobalErrorReporter(): ErrorReporter;
```

### 错误日志 API

```typescript
// 获取所有错误日志
errorLogManager.getLogs(): ErrorLog[];

// 清除所有日志
errorLogManager.clearLogs(): void;

// 导出日志为 JSON
errorLogManager.exportLogs(): string;

// 通过 ID 获取日志
errorLogManager.getLogById(id: string): ErrorLog | undefined;

// 按错误类型过滤
errorLogManager.getLogsByErrorType(errorType: string): ErrorLog[];

// 按日期范围过滤
errorLogManager.getLogsByDateRange(start: Date, end: Date): ErrorLog[];

// 获取错误统计
errorLogManager.getErrorStats(): {
  totalErrors: number;
  errorTypes: Record<string, number>;
  recentErrors: ErrorLog[];
};
```

---

## 最佳实践

### 1. 分层错误边界

```typescript
function App() {
  return (
    <ErrorBoundary fallback={<GlobalErrorFallback />}>
      <Header />
      <ErrorBoundary fallback={<ContentErrorFallback />}>
        <MainContent />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  );
}
```

### 2. 组件级别的错误处理

```typescript
// 对于不稳定的组件使用错误边界
function UserProfile({ userId }) {
  return (
    <ErrorBoundary fallback={<UserProfileError />}>
      <UserInfo userId={userId} />
      <UserPosts userId={userId} />
      <UserComments userId={userId} />
    </ErrorBoundary>
  );
}
```

### 3. 网络请求错误处理

```typescript
function DataFetcher({ url }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError);
  }, [url]);

  if (error) {
    throw error; // 抛出错误，让 ErrorBoundary 处理
  }

  return <div>{JSON.stringify(data)}</div>;
}

function App() {
  return (
    <ErrorBoundary
      maxRetries={3}
      retryDelay={2000}
      fallbackRender={(error) => (
        <div>
          <p>加载失败: {error.message}</p>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      )}
    >
      <DataFetcher url="/api/data" />
    </ErrorBoundary>
  );
}
```

### 4. 结合性能监控

```typescript
import { errorLogManager } from '@lytjs/core';
import { performanceMonitor } from './monitor';

function App() {
  // 定期检查错误率
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = errorLogManager.getErrorStats();
      if (stats.totalErrors > 10) {
        // 发送告警
        performanceMonitor.alert('错误率过高');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
```

### 5. 生产环境与开发环境

```typescript
const isDev = process.env.NODE_ENV === 'development';

function App() {
  return (
    <ErrorBoundary
      fallbackRender={isDev
        ? (error, info) => (
            <div style={{ padding: 20, background: '#fee' }}>
              <h2>开发模式错误详情</h2>
              <pre>{error.stack}</pre>
              <pre>{info.componentStack}</pre>
            </div>
          )
        : <ProductionErrorFallback />
      }
    >
      <AppContent />
    </ErrorBoundary>
  );
}
```

### 6. 错误恢复建议

```typescript
function SmartErrorFallback(props: FallbackProps) {
  const isNetworkError = props.error.message.includes('network');
  const isAuthError = props.error.message.includes('401');

  return (
    <div style={{ padding: 20 }}>
      {isNetworkError && (
        <>
          <p>网络连接失败</p>
          <button onClick={props.retry}>重新连接</button>
        </>
      )}

      {isAuthError && (
        <>
          <p>认证失败，请重新登录</p>
          <button onClick={() => navigate('/login')}>
            前往登录
          </button>
        </>
      )}

      {!isNetworkError && !isAuthError && (
        <>
          <p>发生未知错误</p>
          <button onClick={props.reset}>重置</button>
        </>
      )}
    </div>
  );
}
```

---

## 相关文档

- [React 错误边界](https://react.dev/learn/handling-errors)
- [@lytjs/core 核心 API](../api/core.md)
- [最佳实践指南](../guides/best-practices.md)
