# SSR（服务端渲染）

LytJS 提供了完善的服务端渲染（SSR）支持，包括字符串渲染、流式渲染、Hydration 和 Island Architecture。

## renderToString

`renderToString` 将应用渲染为完整的 HTML 字符串，适合需要完整 HTML 输出的场景。

### 基本用法

```typescript
import { renderToString } from '@lytjs/renderer';
import { createApp } from '@lytjs/core';
import App from './App';

const app = createApp(App);

const html = await renderToString({ vnode: App });
console.log(html);
// <div id="app" data-server-rendered="true"><h1>Hello LytJS</h1></div>
```

### 传递上下文

可以通过上下文对象在服务端和组件之间共享数据：

```typescript
import { renderToString } from '@lytjs/renderer';
import { createApp } from '@lytjs/core';
import App from './App';

const html = await renderToString({ vnode: App });
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
import { renderToString } from '@lytjs/renderer';
import { createApp } from '@lytjs/core';
import App from './App';

const server = express();

server.get('*', async (req, res) => {
  try {
    const html = await renderToString({ vnode: App });

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
import { renderToStream } from '@lytjs/renderer';
import App from './App';

const stream = renderToStream({ vnode: App });

// 将流输出到响应
stream.pipe(res);
```

### 流式传输示例

```typescript
import express from 'express';
import { renderToStream } from '@lytjs/renderer';
import App from './App';

const server = express();

server.get('*', async (req, res) => {
  res.write(`<!DOCTYPE html>
<html>
  <head>
    <title>LytJS SSR Streaming</title>
  </head>
  <body>
    <div id="app">`);

  const stream = renderToStream({ vnode: App });

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

// 客户端使用 createApp 进行水合
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

## SSR 安全最佳实践

### XSS 防护

LytJS 默认对模板中的插值表达式进行 HTML 转义，防止 XSS 攻击：

```typescript
// 安全：自动转义
const userInput = '<script>alert("xss")</script>';
// 渲染结果：&lt;script&gt;alert("xss")&lt;/script&gt;
```

#### 危险操作

以下操作可能导致 XSS 漏洞，请谨慎使用：

```typescript
// 危险：直接拼接用户输入到模板字符串
const html = await renderToString({
  template: `<div>${userInput}</div>`, // 不安全！
});

// 危险：使用 v-html 渲染用户输入
const UserContent = {
  template: `<div v-html="userContent"></div>`, // 不安全！
  setup() {
    const userContent = ref(unsafeUserInput);
    return { userContent };
  },
};

// 危险：在 SSR 上下文中注入未转义的数据
const context = {
  html: userInput, // 不安全！
};
```

#### 安全操作

```typescript
// 安全：使用响应式数据，自动转义
const userInput = ref('');
const html = await renderToString({
  setup() {
    return { userInput };
  },
  template: `<div>{{ userInput }}</div>`, // 自动转义
});

// 安全：仅对可信内容使用 v-html
const TrustedContent = {
  template: `<div v-html="trustedHtml"></div>`,
  setup() {
    // 仅用于经过验证的、可信的 HTML 内容
    const trustedHtml = ref('<strong>安全内容</strong>');
    return { trustedHtml };
  },
};
```

### 数据注入安全

#### 避免注入敏感数据

```typescript
// 危险：将敏感数据注入到客户端
const context = {
  apiKey: process.env.API_KEY, // 不要这样做！
  dbPassword: process.env.DB_PASSWORD, // 不要这样做！
  userSession: fullSessionData, // 可能包含敏感信息
};

// 安全：只注入必要的数据
const context = {
  url: req.url,
  user: {
    id: user.id,
    name: user.name,
    // 不包含敏感字段
  },
};
```

#### 数据序列化安全

在将数据注入到客户端 hydration 脚本时，确保正确序列化：

```typescript
// 危险：直接 JSON.stringify 可能导致 XSS
const script = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)}</script>`;

// 安全：使用 HTML 转义
function safeSerialize(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const script = `<script>window.__INITIAL_STATE__ = ${safeSerialize(state)}</script>`;
```

### 请求验证

#### 验证请求来源

```typescript
import express from 'express';

const server = express();

server.use((req, res, next) => {
  // 验证请求来源
  const origin = req.get('origin');
  const allowedOrigins = ['https://example.com', 'https://www.example.com'];

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).send('Forbidden');
  }

  next();
});
```

#### 防止 SSRF（服务端请求伪造）

```typescript
import express from 'express';

const server = express();

server.get('/api/fetch', async (req, res) => {
  const { url } = req.query;

  // 危险：直接使用用户提供的 URL
  // const response = await fetch(url);

  // 安全：验证 URL
  try {
    const parsedUrl = new URL(url as string);
    const allowedHosts = ['api.example.com', 'cdn.example.com'];

    if (!allowedHosts.includes(parsedUrl.host)) {
      return res.status(400).send('Invalid URL');
    }

    const response = await fetch(url);
    res.json(await response.json());
  } catch (err) {
    res.status(400).send('Invalid URL');
  }
});
```

### 环境变量安全

```typescript
// 危险：暴露所有环境变量
const context = {
  env: process.env, // 不要这样做！
};

// 安全：只暴露必要的、非敏感的环境变量
const context = {
  env: {
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.API_BASE_URL,
    PUBLIC_KEY: process.env.PUBLIC_KEY,
  },
};
```

### Content Security Policy (CSP)

建议为 SSR 应用配置 CSP 头：

```typescript
import express from 'express';
import helmet from 'helmet';

const server = express();

server.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 根据需要调整
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.example.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  }),
);
```

### SSR 完整示例

```typescript
// server.ts
import express from 'express';
import { renderToString } from '@lytjs/renderer';
import { createApp } from '@lytjs/core';
import App from './App';

const server = express();

server.use(express.static('dist/client'));

server.get('*', async (req, res) => {
  try {
    const html = await renderToString({ vnode: App });

    // 安全序列化初始状态
    const safeState = JSON.stringify({ url: req.url })
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e');

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
          <script>window.__INITIAL_STATE__ = ${safeState};</script>
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

## 下一步

- [渲染模式](./rendering-modes) - 了解 VNode 和 Signal 模式的区别
- [API 参考：渲染器](../api/renderer) - 查看渲染器的详细文档
- [构建优化](./build-optimization) - 学习 SSR 应用的构建优化
