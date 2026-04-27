# Deployment Guide

This document describes how to deploy a Lyt.js application to production.

## Build Optimization

### Production Build

Use the LytX CLI for production builds:

```bash
npm run build
```

This will:
- Minify and optimize code
- Generate static assets
- Remove debug code
- Enable Tree Shaking

### Build Configuration

Configure build options in `lytx.config.ts`:

```typescript
import { defineConfig } from '@lytjs/lytx'

export default defineConfig({
  build: {
    minify: true,        // Enable minification
    sourcemap: false,    // Disable sourcemaps (production)
    inlineStyles: false, // Don't inline styles
    target: 'es2020',    // Target ES version
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

## Deploying to Static Hosting

### Vercel Deployment

1. Prepare the project:
```bash
npm run build
```

2. Create `vercel.json`:
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

3. Deploy using the Vercel CLI:
```bash
npm i -g vercel
vercel --prod
```

### Netlify Deployment

1. Prepare the project:
```bash
npm run build
```

2. Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. Connect to Netlify and deploy

### GitHub Pages Deployment

1. Prepare the project:
```bash
npm run build
```

2. Create `.github/workflows/deploy.yml`:
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

## Deploying to a Node.js Server

### Using Express

```typescript
import express from 'express'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 3000

// Static file serving
app.use(express.static(path.join(__dirname, 'dist')))

// SPA route fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### Using LytX SSR

If using LytX's SSR mode:

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

## Docker Deployment

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

## Performance Optimization

### Enable Gzip Compression

Most hosting platforms automatically enable Gzip. If you are self-hosting, make sure to enable compression.

### Configure CDN

Deploy static assets to a CDN for faster loading.

### Code Splitting

Use route lazy loading for code splitting:

```typescript
const Home = () => import('./pages/Home.lyt')
const About = () => import('./pages/About.lyt')

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]
```

## Environment Variables

### Defining Environment Variables

Create `.env.production`:

```env
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My Lyt App
```

### Using in Code

```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Monitoring and Error Tracking

### Integrating Sentry

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

## Security Best Practices

1. **Enable HTTPS** - Always use HTTPS
2. **Content Security Policy (CSP)** - Set appropriate CSP headers
3. **XSS Protection** - Lyt.js escapes output by default, but remain cautious
4. **Dependency Security** - Regularly update dependencies with `npm audit`

## Deployment Checklist

- [ ] Run the full test suite
- [ ] Build the production version
- [ ] Check the build output
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Configure HTTPS
- [ ] Set caching strategies
- [ ] Test the deployment process
- [ ] Configure a rollback plan

## Next Steps

- View the [Performance Optimization Guide](./performance.md)
- Learn about [Advanced Topics](./advanced-topics.md)
