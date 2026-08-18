# LytJS SSR/SSG 使用指南

## 概述

LytJS 提供完整的服务端渲染 (SSR) 和静态站点生成 (SSG) 解决方案，支持：

- 基础 HTML 字符串渲染
- 流式渲染 (Streaming SSR)
- 静态站点生成 (SSG)
- 水合 (Hydration) 支持
- Suspense 边界支持
- 数据预取 (Data Prefetching)
- 渐进式水合

## 安装

```bash
npm install @lytjs/ssr
# 或
pnpm add @lytjs/ssr
# 或
yarn add @lytjs/ssr
```

---

## 基础用法

### 渲染到字符串

使用 `renderToString` 将 VNode 渲染为 HTML 字符串：

```typescript
import { h } from '@lytjs/core';
import { renderToString } from '@lytjs/ssr';

const App = h('div', { class: 'app' }, [
  h('h1', 'Hello LytJS SSR'),
  h('p', '这是一段服务端渲染的内容'),
]);

const html = renderToString(App);
console.log(html); // 输出: <div class="app"><h1>Hello LytJS SSR</h1><p>这是一段服务端渲染的内容</p></div>
```

### 渲染到完整 HTML 页面

使用 `renderToHtml` 生成完整的 HTML 文档：

```typescript
import { h } from '@lytjs/core';
import { renderToHtml } from '@lytjs/ssr';

const App = h('div', { class: 'app' }, [h('h1', '我的网站'), h('p', '欢迎访问')]);

const html = renderToHtml(App, {
  title: '我的网站',
  lang: 'zh-CN',
  head: `
    <meta name="description" content="这是我的网站">
    <link rel="stylesheet" href="/style.css">
  `,
  bodyAttrs: { class: 'dark-mode' },
});

console.log(html);
```

---

## 流式渲染 (Streaming SSR)

### 基础流式渲染

```typescript
import { h } from '@lytjs/core';
import { renderToStream } from '@lytjs/ssr';

const App = h('div', { class: 'app' }, [
  h('header', [h('h1', '我的应用')]),
  h('main', [h('p', '主要内容')]),
  h('footer', [h('p', '底部信息')]),
]);

const stream = renderToStream(App, {
  chunkSize: 2048, // 每个分块的最大字节数
  onShellReady: () => {
    console.log('Shell 已发送，可开始发送响应头');
  },
  onError: (error) => {
    console.error('渲染错误:', error);
  },
});

// 在服务器响应中使用
async function handleRequest(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  for await (const chunk of stream) {
    res.write(chunk);
  }

  res.end();
}
```

### 增强型流式渲染（带数据预取）

```typescript
import { h } from '@lytjs/core';
import { renderToStreamEnhanced } from '@lytjs/ssr';

// 定义带预取功能的组件
const PostList = {
  prefetch: async (context) => {
    const posts = await fetchPosts(context.params?.category);
    return { data: { posts }, ttl: 300000 }; // 缓存 5 分钟
  },
  // ... 组件实现
};

const App = h('div', [h(PostList)]);

const { stream, dehydratedState } = await renderToStreamEnhanced(App, {
  prefetchContext: {
    path: '/posts',
    params: { category: 'technology' },
  },
  onDataPrefetched: (data) => {
    console.log('数据预取完成:', data);
  },
  progressiveHydration: true,
});

// 在响应中发送脱水状态
// 可以用于客户端水合
```

---

## 静态站点生成 (SSG)

### 基础 SSG 配置

```typescript
import { h } from '@lytjs/core';
import { writeStaticFiles } from '@lytjs/ssr';

const pages = [
  {
    path: '/',
    component: h('div', [h('h1', '首页'), h('p', '欢迎访问')]),
    head: {
      title: '我的网站 - 首页',
      meta: {
        description: '这是我的网站的首页',
        keywords: 'LytJS, SSR, SSG',
      },
    },
  },
  {
    path: '/about',
    component: h('div', [h('h1', '关于我们'), h('p', '关于我们的信息')]),
    head: { title: '我的网站 - 关于' },
  },
  {
    path: '/blog/post-1',
    component: h('article', [h('h1', '博客文章 1'), h('p', '这是文章内容')]),
  },
];

// 生成静态文件
await writeStaticFiles(pages, {
  baseUrl: 'https://example.com',
  outDir: 'dist',
  defaultTitle: '我的网站',
  generateSitemap: true,
  siteName: '我的网站',
  globalScripts: ['<script src="/main.js" defer></script>'],
  globalStyles: ['<link rel="stylesheet" href="/style.css">'],
});
```

### 生成但不写入文件

如果你需要先处理生成的内容：

```typescript
import { h } from '@lytjs/core';
import { generateStaticPages, generateRouteManifest } from '@lytjs/ssr';

const pages = [
  /* ... */
];

const results = generateStaticPages(pages, {
  baseUrl: 'https://example.com',
  defaultTitle: '我的网站',
});

// 处理结果
for (const [filePath, html] of results) {
  console.log(filePath);
  // 自定义处理
}

// 生成路由清单
const manifest = generateRouteManifest(pages, 'https://example.com');
console.log(manifest);
```

### 验证页面配置

```typescript
import { validatePages } from '@lytjs/ssr';

const pages = [
  /* ... */
];
const errors = validatePages(pages);

if (errors.length > 0) {
  console.error('页面配置错误:');
  errors.forEach((error) => console.error('  -', error));
}
```

---

## 完整服务器示例

### Express + SSR

```typescript
import express from 'express';
import { h } from '@lytjs/core';
import { renderToHtml, renderToStream } from '@lytjs/ssr';

const app = express();
const port = 3000;

// 定义应用组件
const App = (props: { page: string }) =>
  h('div', { class: 'app' }, [
    h('header', [h('h1', '我的应用')]),
    h('main', [h('p', `当前页面: ${props.page}`)]),
    h('footer', [h('p', '底部信息')]),
  ]);

// 传统 SSR - 完整字符串
app.get('/', (req, res) => {
  const html = renderToHtml(h(App, { page: '首页' }), {
    title: '首页',
  });

  res.send(html);
});

// 流式 SSR
app.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const stream = renderToStream(h(App, { page: '流式渲染' }), {
    onShellReady: () => {
      console.log('Shell 已发送');
    },
  });

  for await (const chunk of stream) {
    res.write(chunk);
  }

  res.end();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

### 完整 SSG 构建脚本

```typescript
// build-ssg.ts
import { h } from '@lytjs/core';
import { writeStaticFiles } from '@lytjs/ssr';

// 页面组件
const Home = h('div', [h('h1', '首页'), h('p', '欢迎访问')]);

const About = h('div', [h('h1', '关于我们'), h('p', '我们的使命是...')]);

// 定义页面
const pages = [
  {
    path: '/',
    component: Home,
    head: { title: '首页' },
  },
  {
    path: '/about',
    component: About,
    head: { title: '关于我们' },
  },
];

// 生成静态文件
async function build() {
  console.log('开始生成静态站点...');

  await writeStaticFiles(pages, {
    outDir: 'dist',
    defaultTitle: '我的网站',
    generateSitemap: true,
    baseUrl: 'https://example.com',
    siteName: '我的网站',
  });

  console.log('静态站点生成完成!');
  console.log('输出目录: dist/');
}

build().catch(console.error);
```

---

## 水合 (Hydration)

### 客户端水合设置

```typescript
// client-entry.ts
import { createApp, h } from '@lytjs/core';

// 与服务端相同的组件
const App = () => h('div', { class: 'app' }, [h('h1', 'Hello LytJS')]);

// 水合到服务端渲染的 DOM
const app = createApp(App);
app.mount('#app', true); // 第二个参数表示启用水合模式
```

### 使用脱水状态

```typescript
// 从服务端接收脱水状态
import { createApp, h } from '@lytjs/core';

const App = (props: { dehydratedState?: any }) => {
  // 使用脱水状态恢复组件数据
  const data = props.dehydratedState?.prefetchData || {};

  return h('div', [h('h1', 'Hello LytJS'), h('pre', JSON.stringify(data, null, 2))]);
};

// 获取页面中的脱水状态
const dehydratedState = window.__LYTJS_STATE__ || {};

createApp(App).mount('#app', true);
```

### 水合标记工具

```typescript
import {
  createHydrationMarkers,
  getHydrationStrategy,
  serializeHydrationState,
  createDehydratedState,
} from '@lytjs/ssr';

// 在服务端创建脱水状态
const dehydratedState = createDehydratedState({
  prefetchData: { user: { name: '张三' } },
});

// 序列化用于客户端
const serializedState = serializeHydrationState(dehydratedState);

// 在 HTML 中插入
const html = renderToHtml(App, {
  head: `
    <script>
      window.__LYTJS_STATE__ = ${serializedState};
    </script>
  `,
});
```

---

## API 参考

### renderToString

```typescript
renderToString(vnode: VNode | VNode[] | string | number | null | undefined): string
```

将 VNode 渲染为 HTML 字符串。

### renderToHtml

```typescript
renderToHtml(
  vnode: VNode | VNode[],
  options?: {
    title?: string;
    lang?: string;
    head?: string;
    bodyAttrs?: Record<string, string>;
  }
): string
```

将 VNode 渲染为完整的 HTML 文档。

### renderToStream

```typescript
renderToStream(
  vnode: VNode,
  options?: StreamRenderOptions
): ReadableStream<Uint8Array>
```

将 VNode 渲染为 ReadableStream。

**选项:**

- `chunkSize?: number` - 每个分块的最大字节数，默认 4096
- `onShellReady?: () => void` - Shell 就绪回调
- `onError?: (error: Error) => void` - 错误回调

### renderToStreamAsync

```typescript
renderToStreamAsync(
  vnode: VNode,
  options?: EnhancedStreamRenderOptions
): ReadableStream<Uint8Array>
```

异步流式渲染，支持数据预取。

### renderToStreamEnhanced

```typescript
renderToStreamEnhanced(
  vnode: VNode,
  options?: EnhancedStreamRenderOptions
): Promise<{
  stream: ReadableStream<Uint8Array>;
  dehydratedState: Record<string, any>;
}>
```

增强型流式渲染，返回流式和脱水状态。

### writeStaticFiles

```typescript
writeStaticFiles(
  pages: SSGPage[],
  options?: SSGOptions
): Promise<void>
```

生成静态文件到文件系统。

### generateStaticPages

```typescript
generateStaticPages(
  pages: SSGPage[],
  options?: SSGOptions
): Map<string, string>
```

生成静态页面内容但不写入文件。

### generateRouteManifest

```typescript
generateRouteManifest(
  pages: SSGPage[],
  baseUrl?: string
): Array<{ path: string; filePath: string; title?: string }>
```

生成路由清单。

### validatePages

```typescript
validatePages(pages: SSGPage[]): string[]
```

验证页面配置的合法性。

---

## 最佳实践

1. **流式渲染优先** - 对于大页面使用流式渲染，提升首屏加载体验
2. **数据预取** - 在组件中实现 prefetch 方法，预加载数据
3. **合理使用 SSG** - 内容不频繁变化的页面使用 SSG
4. **SEO 优化** - 使用 renderToHtml 配置正确的 meta 标签
5. **渐进式水合** - 使用渐进式水合提升交互响应速度

---

## 故障排除

### 常见问题

1. **客户端水合不匹配** - 确保服务端和客户端渲染的内容一致
2. **流式渲染卡住** - 检查 onShellReady 是否被正确调用
3. **SSG 路径问题** - 确保所有页面 path 以 / 开头

---

## 下一步

- 查看 [实战案例](./ssr-example.md) - 完整的 SSR/SSG 示例应用
- 了解 [官方插件](./official-plugins.md) - 使用官方插件增强功能
- 学习 [核心概念](./index.md) - LytJS 的核心概念
