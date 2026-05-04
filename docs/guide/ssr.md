# SSR（服务端渲染）

LytJS 提供了完善的服务端渲染（SSR）支持，包括字符串渲染、流式渲染、Hydration 和 Island Architecture。

## renderToString

`renderToString` 将应用渲染为完整的 HTML 字符串，适合需要完整 HTML 输出的场景。

### 基本用法

```typescript
import { createSSRApp } from '@lytjs/core';
import { renderToString } from '@lytjs/core/ssr';
import App from './App';

const app = createSSRApp(App);

const html = await renderToString(app);
console.log(html);
// <div id="app" data-server-rendered="true"><h1>Hello LytJS</h1></div>
```

### 传递上下文

可以通过上下文对象在服务端和组件之间共享数据：

```typescript
import { createSSRApp } from '@lytjs/core';
import { renderToString } from '@lytjs/core/ssr';
import App from './App';

const app = createSSRApp(App);

const context = {
  url: '/home',
  user: { name: '张三' },
};

const html = await renderToString(app, context);
```

在组件中通过 `useSSRContext` 访问上下文：

```typescript
import { useSSRContext } from '@lytjs/core';

const UserProfile = {
  setup() {
    const ctx = useSSRContext();
    // ctx.url => '/home'
    // ctx.user => { name: '张三' }
  },
};
```

### Express 服务器示例

```typescript
import express from 'express';
import { createSSRApp } from '@lytjs/core';
import { renderToString } from '@lytjs/core/ssr';
import App from './App';

const server = express();

server.get('*', async (req, res) => {
  const app = createSSRApp(App);

  const context = {
    url: req.url,
  };

  try {
    const html = await renderToString(app, context);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LytJS SSR</title>
        </head>
        <body>
          <div id="app">${html}</div>
          <script src="/client.js"></script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

server.listen(3000);
```

## renderToStream

`renderToStream` 将应用渲染为 Node.js 可读流，适合大页面或需要尽早发送响应的场景。

### 基本用法

```typescript
import { createSSRApp } from '@lytjs/core';
import { renderToStream } from '@lytjs/core/ssr';
import App from './App';

const app = createSSRApp(App);
const stream = renderToStream(app);

// 将流输出到响应
stream.pipe(res);
```

### 流式传输示例

```typescript
import express from 'express';
import { createSSRApp } from '@lytjs/core';
import { renderToStream } from '@lytjs/core/ssr';
import App from './App';

const server = express();

server.get('*', async (req, res) => {
  const app = createSSRApp(App);

  res.write(`<!DOCTYPE html>
<html>
  <head>
    <title>LytJS SSR Streaming</title>
  </head>
  <body>
    <div id="app">`);

  const stream = renderToStream(app, { context: { url: req.url } });

  stream.pipe(res);

  stream.on('end', () => {
    res.write(`</div>
    <script src="/client.js"></script>
  </body>
</html>`);
    res.end();
  });
});

server.listen(3000);
```

### 流式事件

`renderToStream` 返回的流支持以下事件：

```typescript
const stream = renderToStream(app);

stream.on('data', (chunk) => {
  console.log('收到数据块:', chunk.toString());
});

stream.on('end', () => {
  console.log('渲染完成');
});

stream.on('error', (err) => {
  console.error('渲染错误:', err);
});
```

## Hydration

Hydration 是将服务端渲染的静态 HTML "激活"为可交互应用的过程。

### 客户端激活

```typescript
import { createApp } from '@lytjs/core';
import App from './App';

// 客户端使用 createApp（而非 createSSRApp）
const app = createApp(App);
app.mount('#app');
```

LytJS 会自动检测服务端渲染的标记（`data-server-rendered`），并复用已有的 DOM 节点，而非重新创建。

### Hydration 注意事项

服务端和客户端渲染的 HTML 必须匹配，否则 Hydration 会失败并回退到客户端渲染：

```html
<!-- 正确：服务端和客户端渲染结果一致 -->
<div id="app">
  <h1>标题</h1>
  <p>内容</p>
</div>

<!-- 错误：条件渲染导致不匹配 -->
<!-- 服务端渲染 -->
<div id="app"><p>服务端内容</p></div>
<!-- 客户端渲染 -->
<div id="app"><p>客户端内容</p></div>
```

使用 `ClientOnly` 组件包裹仅在客户端渲染的内容：

```html
<template>
  <div>
    <h1>通用内容</h1>
    <ClientOnly>
      <BrowserOnlyComponent />
    </ClientOnly>
  </div>
</template>
```

### 异步组件 Hydration

异步组件在 SSR 期间会被渲染为占位符，在客户端 Hydration 时加载：

```typescript
import { defineAsyncComponent } from '@lytjs/core';

const AsyncComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'));
```

## Island Architecture

LytJS 支持 Island Architecture（岛屿架构），允许在静态 SSR 页面中嵌入交互式"岛屿"组件。

### 什么是 Island Architecture

岛屿架构将页面分为静态部分和交互式"岛屿"：
- **静态部分**：由服务端渲染，发送纯 HTML，无需 JavaScript
- **岛屿**：独立的交互式组件，需要 Hydration

### 定义岛屿组件

```typescript
import { defineComponent } from '@lytjs/core';

// 岛屿组件：独立的交互式组件
const SearchBar = defineComponent({
  name: 'SearchBar',
  props: ['placeholder'],
  emits: ['search'],
  setup(props, { emit }) {
    const query = ref('');

    const handleSearch = () => {
      emit('search', query.value);
    };

    return { query, handleSearch };
  },
  template: `
    <div class="search-bar">
      <input v-model="query" :placeholder="placeholder" @keyup.enter="handleSearch" />
      <button @click="handleSearch">搜索</button>
    </div>
  `,
});
```

### 使用 Island 组件

```html
<template>
  <div class="page">
    <!-- 静态内容：纯服务端渲染，无 JS -->
    <header>
      <h1>我的博客</h1>
      <nav>...</nav>
    </header>

    <!-- 岛屿：需要 Hydration 的交互组件 -->
    <Island :component="SearchBar" :props="{ placeholder: '搜索文章...' }" />

    <!-- 更多静态内容 -->
    <main>
      <article v-for="post in posts" :key="post.id">
        <h2>{{ post.title }}</h2>
        <p>{{ post.excerpt }}</p>
      </article>
    </main>
  </div>
</template>
```

### 延迟 Hydration

可以配置岛屿组件的 Hydration 时机，减少首屏 JavaScript 负载：

```typescript
// 可见时才 Hydration
<Island :component="HeavyWidget" hydrate-on="visible" />

// 空闲时 Hydration
<Island :component="Analytics" hydrate-on="idle" />

// 交互时 Hydration
<Island :component="DatePicker" hydrate-on="interaction" />

// 手动触发 Hydration
<Island :component="ChatWidget" hydrate-on="manual" />
```

### SSR 完整示例

```typescript
// server.ts
import express from 'express';
import { createSSRApp } from '@lytjs/core';
import { renderToString } from '@lytjs/core/ssr';
import App from './App';

const server = express();

server.use(express.static('dist/client'));

server.get('*', async (req, res) => {
  const app = createSSRApp(App);

  const context = { url: req.url };

  try {
    const html = await renderToString(app, context);

    if (context.url) {
      // 处理重定向
      return res.redirect(301, context.url);
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>LytJS SSR App</title>
          <link rel="stylesheet" href="/assets/style.css" />
        </head>
        <body>
          <div id="app">${html}</div>
          <script type="module" src="/client.js"></script>
        </body>
      </html>
    `);
  } catch (err) {
    if (err.code === 404) {
      res.status(404).send('Not Found');
    } else {
      res.status(500).send('Internal Server Error');
    }
  }
});

server.listen(3000, () => {
  console.log('SSR server running at http://localhost:3000');
});
```
