# 部署指南

本文档介绍如何将 Lyt.js 应用部署到生产环境。

## 构建优化

### 生产环境构建

使用 LytX CLI 进行生产构建：

```bash
npm run build
```

这将：
- 压缩和优化代码
- 生成静态资源
- 移除调试代码
- 启用 Tree Shaking

### 构建配置

在 `lytx.config.ts` 中配置构建选项：

```typescript
import { defineConfig } from '@lytjs/lytx'

export default defineConfig({
  build: {
    minify: true,        // 启用压缩
    sourcemap: false,    // 禁用 sourcemap（生产环境）
    inlineStyles: false, // 不内联样式
    target: 'es2020',    // 目标 ES 版本
    rollupOptions: {
      output: {
        manualChunks: {
          'lyt-vendor': ['@lytjs/core', '@lytjs/router']
        }
      }
    }
  }
})
```

## 部署到静态托管

### Vercel 部署

1. 准备项目：
```bash
npm run build
```

2. 创建 `vercel.json`：
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

3. 使用 Vercel CLI 部署：
```bash
npm i -g vercel
vercel --prod
```

### Netlify 部署

1. 准备项目：
```bash
npm run build
```

2. 创建 `netlify.toml`：
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. 连接到 Netlify 并部署

### GitHub Pages 部署

1. 准备项目：
```bash
npm run build
```

2. 创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 部署到 Node.js 服务器

### 使用 Express

```typescript
import express from 'express'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 3000

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### 使用 LytX SSR

如果使用 LytX 的 SSR 模式：

```typescript
import { createSSRApp } from '@lytjs/core'
import App from './App.lyt'
import { createServer } from 'http'
import { renderToString } from '@lytjs/renderer'

const server = createServer(async (req, res) => {
  const app = createSSRApp(App)
  const html = await renderToString(app)
  
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Lyt.js SSR</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script src="/app.js"></script>
      </body>
    </html>
  `)
})

server.listen(3000)
```

## Docker 部署

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 性能优化

### 启用 Gzip 压缩

大多数托管平台都会自动启用 Gzip。如果自己托管服务器，确保启用压缩。

### 配置 CDN

将静态资源部署到 CDN 以提高加载速度。

### 代码分割

使用路由懒加载进行代码分割：

```typescript
const Home = () => import('./pages/Home.lyt')
const About = () => import('./pages/About.lyt')

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]
```

## 环境变量

### 定义环境变量

创建 `.env.production`：

```env
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My Lyt App
```

### 在代码中使用

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## 监控和错误追踪

### 集成 Sentry

```bash
npm install @sentry/browser
```

```typescript
import * as Sentry from '@sentry/browser'
import { createApp } from '@lytjs/core'
import App from './App.lyt'

Sentry.init({
  dsn: 'YOUR_DSN',
  environment: 'production'
})

const app = createApp(App)
app.mount('#app')
```

## 安全最佳实践

1. **启用 HTTPS** - 始终使用 HTTPS
2. **内容安全策略 (CSP)** - 设置适当的 CSP 头部
3. **XSS 防护** - Lyt.js 默认会转义输出，但仍需注意
4. **依赖安全** - 定期更新依赖 `npm audit`

## 部署检查清单

- [ ] 运行完整测试套件
- [ ] 构建生产版本
- [ ] 检查构建输出
- [ ] 配置环境变量
- [ ] 设置监控和日志
- [ ] 配置 HTTPS
- [ ] 设置缓存策略
- [ ] 测试部署流程
- [ ] 配置回滚方案

## 下一步

- 查看 [性能优化指南](./performance.md)
- 了解 [高级主题](./advanced-topics.md)
