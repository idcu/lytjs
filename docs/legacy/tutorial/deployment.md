# 部署指南

本文档详细介绍如何将 LytJS 应用部署到各种环境，包括静态托管、服务器部署和 CI/CD 配置。

## 构建

### 生产构建

使用生产构建获取压缩和优化后的代码：

```bash
# 生产构建
pnpm build

# 开发构建（不压缩，便于调试）
pnpm build:dev
```

构建产物位于 `dist/` 目录：

```
dist/
├── index.html          # 入口 HTML
├── assets/
│   ├── index.[hash].js    # 主包
│   └── index.[hash].css   # 样式文件
└── ...
```

### 构建配置

Vite 配置位于项目根目录的 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@lytjs/core', '@lytjs/router', '@lytjs/store'],
        },
      },
    },
  },
});
```

## 静态部署

### 构建输出

LytJS 应用构建后生成纯静态文件，可以部署到任何静态托管服务：

```bash
pnpm build
# 输出到 dist/ 目录
```

### 部署到静态托管服务

#### Netlify

**方式一：netlify.toml 配置**

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**方式二：Netlify CLI**

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 部署
netlify deploy --prod --dir=dist
```

#### Vercel

**vercel.json 配置**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

使用 Vercel CLI：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel --prod
```

#### Surge

```bash
# 安装 Surge
npm install -g surge

# 部署
surge dist your-app.surge.sh
```

#### GitHub Pages

**使用 GitHub Actions**

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: gh-pages
```

**使用 GitHub Pages 设置**

在仓库 Settings > Pages 中：
- Source: Deploy from a branch
- Branch: gh-pages / (root)

### 静态部署注意事项

1. **SPA 路由**: 确保配置所有路径回退到 `index.html`
2. **Base URL**: 如果部署到子路径，配置 `base` 选项：

```typescript
// vite.config.ts
export default defineConfig({
  base: '/my-app/',
  build: {
    outDir: 'dist',
  },
});
```

## 服务器部署

### Node.js 服务器

#### Express

```typescript
import express from 'express';
import { createRequestHandler } from '@lytjs/core/ssr';
import { renderToString } from '@lytjs/vdom';

const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件
app.use(express.static('dist'));

// SSR 路由
app.get('*', async (req, res) => {
  const html = await renderToString(req.path);
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>LytJS App</title></head>
      <body>
        <div id="app">${html}</div>
        <script src="/assets/index.js"></script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

#### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/your-app/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # 缓存静态资源
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（如果有）
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

#### Docker

**Dockerfile**

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages

RUN corepack enable && pnpm install

RUN pnpm build

# 运行阶段
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

构建并运行：

```bash
docker build -t lytjs-app .
docker run -p 8080:80 lytjs-app
```

## CI/CD 配置

### GitHub Actions

完整 CI/CD 流程：

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint:check
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm test:e2e

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      # 根据目标平台选择部署方式
      # - uses: peaceiris/actions-gh-pages@v3
      #   with:
      #     github_token: ${{ secrets.GITHUB_TOKEN }}
      #     publish_dir: ./dist
```

### GitLab CI

创建 `.gitlab-ci.yml`：

```yaml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .pnpm-store/

before_script:
  - corepack enable
  - pnpm install --frozen-lockfile

lint:
  stage: lint
  script:
    - pnpm lint:check
    - pnpm type-check
  only:
    - merge_requests
    - main
    - develop

test:
  stage: test
  script:
    - pnpm test
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'
  only:
    - merge_requests
    - main
    - develop

build:
  stage: build
  script:
    - pnpm build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  only:
    - main

pages:
  stage: deploy
  script:
    - pnpm build
    - mv dist public
  artifacts:
    paths:
      - public
  only:
    - main
```

### Jenkins

```groovy
pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        REGISTRY = 'your-registry.com'
        IMAGE_NAME = 'lytjs-app'
    }

    stages {
        stage('Install') {
            steps {
                sh 'corepack enable'
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint & Type Check') {
            steps {
                sh 'pnpm lint:check'
                sh 'pnpm type-check'
            }
        }

        stage('Test') {
            steps {
                sh 'pnpm test'
            }
        }

        stage('Build') {
            steps {
                sh 'pnpm build'
            }
            post {
                success {
                    archiveArtifacts artifacts: 'dist/**'
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def image = docker.build("${REGISTRY}/${IMAGE_NAME}:${env.BUILD_NUMBER}")
                    docker.withRegistry('https://registry.example.com', 'docker-registry-credentials') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }
    }
}
```

## 环境变量

### 使用环境变量

```typescript
// 环境变量 (Vite)
const apiUrl = import.meta.env.VITE_API_URL;

// 生产环境变量
// .env.production
// VITE_API_URL=https://api.example.com
```

### .env 文件

```
# .env - 所有环境
VITE_APP_TITLE=LytJS App

# .env.local - 本地覆盖
VITE_API_URL=http://localhost:3000

# .env.development - 开发环境
VITE_API_URL=http://localhost:3000

# .env.production - 生产环境
VITE_API_URL=https://api.example.com
```

### 服务器端环境变量

对于 SSR 应用，使用 `process.env`：

```typescript
// SSR 环境变量
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;
```

## 性能优化

### 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 目标浏览器
    target: 'es2015',

    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@lytjs/core', '@lytjs/router', '@lytjs/store'],
          ui: ['@lytjs/ui'],
        },
      },
    },

    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

### 缓存策略

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 资源文件名包含哈希，便于长期缓存
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
});
```

### CDN 配置

```typescript
// vite.config.ts
export default defineConfig({
  base: 'https://cdn.example.com/lytjs/',
  build: {
    assetsDir: 'assets',
  },
});
```

## 监控与日志

### 错误监控

```typescript
import { initErrorTracking } from '@lytjs/common-error';

initErrorTracking({
  endpoint: 'https://monitor.example.com/errors',
  appId: 'lytjs-app',
});
```

### 性能监控

```typescript
import { recordMetric } from '@lytjs/common-performance';

// 记录关键指标
recordMetric('page_load', performance.now());
recordMetric('api_call', duration);
```

## 安全配置

### CSP 头

```nginx
# Nginx 配置
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### HTTPS 重定向

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## 常见问题

### 部署后资源 404

检查：
1. 确保配置了 SPA 回退到 `index.html`
2. 检查 base 配置是否正确
3. 确认构建产物路径正确

### 样式不生效

检查：
1. CSS 文件是否正确引入
2. 检查构建后的 CSS 路径
3. 确认 CDN 或静态资源路径正确

### API 请求失败

检查：
1. 确认 API 地址正确
2. 检查 CORS 配置
3. 验证环境变量是否正确设置

### 性能问题

优化建议：
1. 启用 Gzip 压缩
2. 配置静态资源缓存
3. 使用 CDN 分发资源
4. 启用 HTTP/2

## 总结

LytJS 应用可以部署到各种环境。根据你的需求选择合适的部署方式：

- **快速上线**: 使用 Netlify、Vercel 等静态托管服务
- **企业级部署**: 使用 Docker + Nginx + CI/CD
- **微服务架构**: 结合 API 网关和容器编排

确保：
1. 配置正确的路由回退
2. 设置合适的安全头
3. 启用缓存和压缩
4. 监控应用性能和错误
