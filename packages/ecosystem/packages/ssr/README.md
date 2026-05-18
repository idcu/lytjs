# @lytjs/ssr

> LytJS 服务端渲染（SSR）支持，提供同构渲染、流式 SSR、静态站点生成等功能。

[![npm version](https://img.shields.io/npm/v/@lytjs/ssr.svg)](https://www.npmjs.com/package/@lytjs/ssr)
[![license](https://img.shields.io/npm/l/@lytjs/ssr.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/ssr` 是 LytJS 框架的服务端渲染扩展包，提供了完整的 SSR 支持能力。它允许开发者使用 LytJS 构建同构应用，同时享受服务端渲染的性能优势和客户端渲染的开发体验。

### 核心特性

- **同构渲染**：一份代码，同时运行在服务端和客户端
- **流式 SSR**：支持流式渲染，提升首屏加载速度
- **静态站点生成（SSG）**：预渲染静态页面，适合内容型网站
- **增量静态再生成（ISR）**：按需重新生成特定页面
- **数据预取**：服务端组件数据预取和脱水/水合
- **水合优化**：智能水合策略，减少 hydration 开销
- **组件虚拟列表**：服务端友好的虚拟列表实现

## 安装

```bash
npm install @lytjs/ssr
```

或使用 pnpm：

```bash
pnpm add @lytjs/ssr
```

## 依赖关系

`@lytjs/ssr` 依赖以下 LytJS 核心包：

- `@lytjs/reactivity` - 响应式系统
- `@lytjs/component` - 组件系统
- `@lytjs/vdom` - 虚拟 DOM
- `@lytjs/common-is` - 工具函数
- `@lytjs/common-env` - 环境检测
- `@lytjs/common-dom` - DOM 工具函数

## 快速开始

### 服务端渲染基础

```typescript
import { renderToString } from '@lytjs/ssr';
import { createApp } from './app';

async function render(url: string) {
  const app = createApp({
    url,
    context: { url }
  });

  const html = await renderToString(app);
  return html;
}
```

### 获取完整的 HTML

```typescript
import { renderToHtml } from '@lytjs/ssr';
import { createApp } from './app';

async function renderPage(url: string) {
  const app = createApp({ url });

  const { html, state } = await renderToHtml(app, {
    title: 'LytJS SSR App',
    baseUrl: 'https://example.com'
  });

  return html;
}
```

## 主要 API

### 渲染函数

#### `renderToString(app)`

将应用渲染为 HTML 字符串。

```typescript
import { renderToString } from '@lytjs/ssr';
import { createSSRApp } from 'lytjs';

const app = createSSRApp(App, { props: { initialData } });
const html = await renderToString(app);
```

#### `renderToHtml(app, options)`

获取完整的 HTML 页面，包含 DOCTYPE、head 和 body。

```typescript
import { renderToHtml } from '@lytjs/ssr';

const { html, state } = await renderToHtml(app, {
  title: '我的应用',
  lang: 'zh-CN',
  baseUrl: 'https://example.com',
  scripts: ['/client.js'],
  styles: ['/styles.css']
});
```

### 流式渲染

#### `renderToStream(app, options)`

流式渲染，边生成边输出。

```typescript
import { renderToStream } from '@lytjs/ssr';

const stream = await renderToStream(app, {
  onShellReady() {
    response.setHeader('Content-Type', 'text/html');
  }
});

stream.pipe(response);
```

#### `renderToStreamAsync(app, options)`

带异步数据预取的流式渲染。

```typescript
import { renderToStreamAsync } from '@lytjs/ssr';

const stream = await renderToStreamAsync(app, {
  context: { data: await fetchInitialData() },
  onAllReady() {
    response.setHeader('Content-Type', 'text/html');
  }
});
```

#### `renderToStreamEnhanced(app, options)`

增强型流式渲染，支持 Suspense 边界。

```typescript
import { renderToStreamEnhanced } from '@lytjs/ssr';

const enhancedStream = await renderToStreamEnhanced(app, {
  onComplete() {
    console.log('渲染完成');
  },
  onError(error) {
    console.error('渲染错误:', error);
  }
});
```

### 流式渲染选项

```typescript
interface StreamRenderOptions {
  context?: Record<string, any>;
  onShellReady?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface EnhancedStreamRenderOptions extends StreamRenderOptions {
  timeout?: number;
  streamOptions?: {
    flush?: 'sync' | 'async' | 'deferred';
  };
}
```

## 静态站点生成（SSG）

### 静态页面生成

```typescript
import { generateStaticPages } from '@lytjs/ssr';
import { createApp } from './app';
import { getAllRoutes } from './routes';

async function buildStaticSite() {
  const routes = await getAllRoutes();

  await generateStaticPages(routes, {
    outputDir: './dist',
    render: async (url) => {
      const app = createApp({ url });
      return renderToHtml(app, { title: 'My Site' });
    }
  });
}
```

### 生成路由清单

```typescript
import { generateRouteManifest } from '@lytjs/ssr';

const manifest = await generateRouteManifest(routes, {
  basePath: '/pages',
  includePatterns: ['*.html'],
  excludePatterns: ['**/404.html']
});

console.log(manifest);
// { routes: [...], total: 100, generated: Date }
```

### 验证静态页面

```typescript
import { validatePages } from '@lytjs/ssr';

const results = await validatePages('./dist', {
  checkLinks: true,
  checkImages: true,
  checkScripts: true
});

if (results.errors.length > 0) {
  console.error('页面验证失败:', results.errors);
}
```

### 写入静态文件

```typescript
import { writeStaticFiles } from '@lytjs/ssr';

await writeStaticFiles('./dist', {
  manifest: { /* 路由清单 */ },
  copyAssets: ['./public/**/*'],
  minify: true,
  sitemap: true
});
```

## 增量静态再生成（ISR）

### 创建 ISR 中间件

```typescript
import { createISRMiddleware } from '@lytjs/ssr';

const isr = createISRMiddleware({
  revalidate: '/blog/:slug',
  revalidateInterval: 60,
  maxRetries: 3
});

app.use(isr);
```

### 按需重新验证

```typescript
import { revalidateOnDemand } from '@lytjs/ssr';

await revalidateOnDemand('/blog/my-post', {
  secret: process.env.REVALIDATE_SECRET
});
```

### ISR 缓存管理

```typescript
import { getISRCacheStats, clearISRCache } from '@lytjs/ssr';

const stats = getISRCacheStats();
console.log(stats);
// { pages: 100, size: '2.5MB', lastUpdate: Date }

await clearISRCache();
```

## 服务端组件

### 注册服务端组件

```typescript
import { registerServerComponent } from '@lytjs/ssr';

registerServerComponent('UserProfile', {
  fetchData: async (context) => {
    return await api.getUser(context.params.id);
  },
  serverOnly: true
});
```

### 收集预取组件

```typescript
import { collectPrefetchComponents } from '@lytjs/ssr';

const components = await collectPrefetchComponents(app);
console.log(components);
// ['UserProfile', 'ProductList', 'CommentSection']
```

### 预取所有组件

```typescript
import { prefetchAllComponents } from '@lytjs/ssr';

await prefetchAllComponents(components, {
  context: { userId: '123' }
});
```

### 构建脱水状态

```typescript
import { buildDehydratedState } from '@lytjs/ssr';

const state = buildDehydratedState(app);
const serialized = safeSerializeState(state);
```

### 安全序列化

```typescript
import { safeSerializeState, safeDeserializeState } from '@lytjs/ssr';

const serialized = safeSerializeState(data);
const deserialized = safeDeserializeState(serialized);
```

## 水合优化

### 创建水合标记

```typescript
import { createHydrationMarkers } from '@lytjs/ssr';

const markers = createHydrationMarkers(app, {
  includeTimestamps: true,
  includeVersions: true
});
```

### 获取水合策略

```typescript
import { getHydrationStrategy } from '@lytjs/ssr';

const strategy = getHydrationStrategy(app, {
  mode: 'eager',
  delay: 100
});
```

### 序列化水合状态

```typescript
import { serializeHydrationState } from '@lytjs/ssr';

const state = serializeHydrationState(markers);
```

### 创建脱水状态

```typescript
import { createDehydratedState } from '@lytjs/ssr';

const dehydrated = createDehydratedState(app, {
  includeSignals: true,
  includeComponents: true
});
```

## 虚拟列表

### VirtualList 组件

```typescript
import { VirtualList } from '@lytjs/ssr';

export function ProductList({ products }) {
  return () => (
    <VirtualList
      items={products}
      itemHeight={80}
      overscan={3}
      renderItem={(product) => (
        <div class="product-item">
          <img src={product.image} />
          <span>{product.name}</span>
        </div>
      )}
    />
  );
}
```

## 服务端渲染集成

### Express 集成

```typescript
import express from 'express';
import { renderToHtml } from '@lytjs/ssr';
import { createSSRApp } from 'lytjs';
import { createRouter, createMemoryHistory } from '@lytjs/router';
import App from './App';

const app = express();

app.get('*', async (req, res) => {
  const router = createRouter({
    history: createMemoryHistory(req.url),
    routes: getRoutes()
  });

  const lytApp = createSSRApp(App, { router });

  const html = await renderToHtml(lytApp, {
    title: 'LytJS SSR',
    lang: 'zh-CN'
  });

  res.send(html);
});

app.listen(3000);
```

### Koa 集成

```typescript
import Koa from 'koa';
import { renderToStream } from '@lytjs/ssr';
import { createSSRApp } from 'lytjs';
import { createRouter, createMemoryHistory } from '@lytjs/router';
import App from './App';

const app = new Koa();

app.use(async (ctx) => {
  const router = createRouter({
    history: createMemoryHistory(ctx.url),
    routes: getRoutes()
  });

  const lytApp = createSSRApp(App, { router });
  const stream = await renderToStream(lytApp);

  ctx.type = 'text/html';
  ctx.body = stream;
});

app.listen(3000);
```

## 类型定义

### SSG 配置

```typescript
interface SSGPage {
  url: string;
  outputPath: string;
  content: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

interface SSGOptions {
  outputDir?: string;
  basePath?: string;
  concurrency?: number;
  onProgress?: (current: number, total: number) => void;
}
```

### 数据预取上下文

```typescript
interface DataPrefetchContext {
  request: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  cookies: Record<string, string>;
}

interface PrefetchResult<T = any> {
  data: T;
  ttl?: number;
  tags?: string[];
}
```

## 最佳实践

### 服务端渲染优化

```typescript
import { renderToStream } from '@lytjs/ssr';

const stream = await renderToStream(app, {
  onShellReady() {
    response.setHeader('Content-Type', 'text/html');
    response.setHeader('Transfer-Encoding', 'chunked');
  }
});

stream.pipe(response);
```

### 数据缓存策略

```typescript
import { registerServerComponent } from '@lytjs/ssr';

registerServerComponent('ProductList', {
  fetchData: async (context) => {
    const cacheKey = `products:${context.query.category}`;
    const cached = await cache.get(cacheKey);

    if (cached) return cached;

    const data = await api.getProducts(context.query);
    await cache.set(cacheKey, data, { ttl: 300 });

    return data;
  }
});
```

### 水合性能优化

```typescript
import { getHydrationStrategy } from '@lytjs/ssr';

const strategy = getHydrationStrategy(app, {
  mode: 'lazy',
  threshold: 0.1,
  priority: ['above-fold', 'critical']
});
```

## 常见问题

### 如何处理客户端专有 API？

```typescript
import { isClient } from '@lytjs/common-env';

if (isClient) {
  localStorage.setItem('key', 'value');
}
```

### 如何在 SSR 中使用 window 对象？

```typescript
import { isServer } from '@lytjs/common-env';

if (!isServer) {
  window.addEventListener('resize', handleResize);
}
```

## 浏览器兼容性

服务端渲染无需考虑浏览器兼容性。客户端水合代码支持所有现代浏览器。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
