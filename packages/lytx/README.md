# @lytjs/lytx

Lyt.js 元框架 - 提供 SSR、SSG、SPA 和 API Routes 等全栈开发能力。

## 安装

```bash
npm install @lytjs/lytx

# 或使用 pnpm
pnpm add @lytjs/lytx
```

## 特性

- 🚀 SPA（单页面应用）
- 🌐 SSR（服务端渲染）
- 📄 SSG（静态站点生成）
- 🔌 API Routes（API 路由）
- 🎯 零运行时依赖
- 💡 支持多种渲染模式

## 快速开始

### 创建项目

```bash
# 使用 CLI 创建项目
lytx create my-app
cd my-app
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

### 基础使用

```javascript
import { createLytX } from '@lytjs/lytx';
import App from './App.vue';

const app = createLytX(App);

// 使用插件
app.use(router);
app.use(store);

app.mount('#app');
```

## 渲染模式

### SPA 模式

```javascript
import { createLytX } from '@lytjs/lytx';

const app = createLytX(App);
app.mount('#app');
```

### SSR 模式

```javascript
import { createSSRApp } from '@lytjs/core';
import { renderToString } from '@lytjs/renderer/ssr';

// 服务端
const app = createSSRApp(App);
const html = await renderToString(app);

// 客户端
import { hydrate } from '@lytjs/renderer';
hydrate(App, '#app');
```

### SSG 模式

```javascript
import { generateStaticSite } from '@lytjs/lytx';

const config = {
  routes: ['/', '/about', '/posts/1'],
  outputDir: 'dist'
};

await generateStaticSite(App, config);
```

## API Routes

```javascript
// pages/api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello World' });
}
```

## 页面路由

```
pages/
├── index.vue         # 首页
├── about.vue         # 关于页
├── posts/
│   ├── index.vue     # 帖子列表
│   └── [id].vue      # 帖子详情（动态路由）
└── api/
    └── hello.js      # API 路由
```

## 配置文件

```javascript
// lytx.config.js
export default {
  ssr: true,
  outputDir: 'dist',
  routes: [
    '/',
    '/about'
  ],
  api: {
    prefix: '/api'
  }
};
```

## 数据获取

```vue
<script setup>
import { useAsyncData } from '@lytjs/lytx';

const { data: posts } = await useAsyncData(async () => {
  const res = await fetch('/api/posts');
  return res.json();
});
</script>

<template>
  <div>
    <h1>帖子列表</h1>
    <ul>
      <li each="post in posts" :key="post.id">{{ post.title }}</li>
    </ul>
  </div>
</template>
```

## 示例

### 完整项目结构

```
my-app/
├── pages/
│   ├── index.vue
│   ├── about.vue
│   ├── posts/
│   │   ├── index.vue
│   │   └── [id].vue
│   └── api/
│       └── hello.js
├── components/
│   └── Header.vue
├── layouts/
│   └── Default.vue
├── lytx.config.js
└── package.json
```

### 布局组件

```vue
<template>
  <div>
    <header>
      <nav>
        <router-link to="/">首页</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p>© 2024 Lyt.js</p>
    </footer>
  </div>
</template>
```

### 动态路由页面

```vue
<script setup>
import { useAsyncData, useRoute } from '@lytjs/lytx';

const route = useRoute();
const { data: post } = await useAsyncData(async () => {
  const res = await fetch(`/api/posts/${route.params.id}`);
  return res.json();
});
</script>

<template>
  <div>
    <h1>{{ post.title }}</h1>
    <p>{{ post.content }}</p>
  </div>
</template>
```

## 性能

- 轻量级元框架
- 支持多种渲染模式
- 高效的 SSR 流渲染
- SSG 预渲染提升首屏性能

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
