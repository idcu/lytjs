# LytJS SSR 使用指南

本文档介绍如何使用 LytJS 的服务端渲染（SSR）功能，包括流式渲染和服务端组件。

## 目录

- [基础用法](#基础用法)
- [流式渲染](#流式渲染)
- [错误处理与超时](#错误处理与超时)
- [服务端组件](#服务端组件)
- [SSG 静态生成](#ssg-静态生成)

---

## 基础用法

### 简单的 SSR 渲染

```typescript
import { renderToString } from '@lytjs/ssr';
import type { VNode } from '@lytjs/vdom';

// 渲染 VNode 为字符串
const app = createApp();
const html = await renderToString(app);
```

---

## 流式渲染

### 基础流式渲染

```typescript
import { renderToStream } from '@lytjs/ssr';

const stream = renderToStream(app, {
  chunkSize: 4096, // 每个分块大小
  onShellReady: () => console.log('Shell 已发送'),
  onError: (err) => console.error('渲染出错', err),
});

// 在 Node.js 中发送响应
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const stream = renderToStream(MyApp);

  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.end();
});
```

### 高级配置（超时与流控制）

```typescript
import { renderToStream } from '@lytjs/ssr';

const stream = renderToStream(MyApp, {
  chunkSize: 8192,
  // 30秒超时
  timeout: 30000,
  // 超时时的回退内容
  fallbackHtml: '<div>正在加载中...</div>',
  // 启用错误恢复
  errorRecovery: true,
  // 流速率控制：最多每秒 1MB
  maxBytesPerSecond: 1024 * 1024,
  onError: (err) => {
    console.error('渲染错误', err);
  },
});
```

### Suspense 边界与 Shell 首屏

```typescript
import { renderToStream } from '@lytjs/ssr';

const stream = renderToStream(
  <Suspense fallback={<Loading />}>
    <App />
  </Suspense>,
  {
    onShellReady: () => {
      console.log('Shell 已发送，用户可以看到首屏内容');
    }
  }
);
```

---

## 错误处理与超时

### 完整错误恢复策略

```typescript
import { renderToStream } from '@lytjs/ssr';

try {
  const stream = renderToStream(MyApp, {
    timeout: 30000,
    errorRecovery: true,
    fallbackHtml: `
      <div style="padding: 40px; text-align: center;">
        <h2>页面加载中</h2>
        <p>请稍后重试</p>
      </div>
    `,
    onError: (err) => {
      // 记录错误到监控系统
      logToMonitoring(err);
    },
  });

  // 发送响应
  for await (const chunk of stream) {
    res.write(chunk);
  }
} catch (err) {
  // 灾难性错误
  res.statusCode = 500;
  res.end('服务器错误');
}
```

---

## 服务端组件

### 数据预取

```typescript
import type { PrefetchableComponent, DataPrefetchContext } from '@lytjs/ssr';

// 声明可预取数据的组件
const UserProfile: PrefetchableComponent = {
  prefetch: async (context: DataPrefetchContext) => {
    const userId = context.params?.id;
    const userData = await fetchUserData(userId);

    return {
      data: { user: userData },
      ttl: 60000, // 1分钟过期
    };
  },
};

// 增强型流式渲染
import { renderToStreamEnhanced } from '@lytjs/ssr';

const result = await renderToStreamEnhanced(MyApp, {
  prefetchContext: {
    path: '/profile/123',
    params: { id: '123' },
  },
  onDataPrefetched: (data) => {
    console.log('数据预取完成:', data);
  },
  onShellReady: () => console.log('Shell 已发送'),
});

// result.stream 是流式响应
// result.dehydratedState 包含预取的数据用于客户端水合
```

---

## SSG 静态生成

```typescript
import { generateStaticPages, writeStaticFiles } from '@lytjs/ssr';

// 生成静态页面
const pages = await generateStaticPages(['/', '/about', '/products/[id]'], {
  // 动态路由参数
  getStaticParams: (path) => {
    if (path === '/products/[id]') {
      return [{ id: '1' }, { id: '2' }];
    }
    return [];
  },
});

// 写入到文件系统
await writeStaticPages(pages, './out');
```

---

## 性能优化提示

1. **使用流式渲染**：优先使用 `renderToStream` 而非 `renderToString`
2. **合理的分块大小**：对于大型页面，分块大小设为 4096-8192 字节
3. **数据预取**：使用 `renderToStreamEnhanced` 实现数据预加载
4. **监控性能**：监控 TTFB (Time To First Byte) 和完全加载时间
