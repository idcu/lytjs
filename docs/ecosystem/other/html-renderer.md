# @lytjs/html-renderer

> LytJS HTML 渲染器。

## 简介

`@lytjs/html-renderer` 是 LytJS 框架的 HTML 渲染器，支持流式渲染、自定义模板等功能。

### 核心特性

- **流式渲染**：支持流式 HTML 输出
- **自定义模板**：支持自定义 HTML 模板
- **安全特性**：内置 XSS 防护
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/html-renderer
```

或使用 pnpm：

```bash
pnpm add @lytjs/html-renderer
```

## 快速开始

### 基本渲染

```typescript
import { renderHTML } from '@lytjs/html-renderer';

const html = renderHTML({
  title: 'My Page',
  content: '<div>Hello World</div>',
  meta: {
    description: 'My page description',
  },
});
```

### 自定义模板

```typescript
import { renderHTML } from '@lytjs/html-renderer';

const html = renderHTML({
  template: ({ title, content, head }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${head}
      </head>
      <body>
        <header>My Header</header>
        ${content}
        <footer>My Footer</footer>
      </body>
    </html>
  `,
  title: 'Custom Template',
  content: '<div>Content</div>',
});
```

### 流式渲染

```typescript
import { renderHTMLStream } from '@lytjs/html-renderer';

// 流式输出
for await (const chunk of renderHTMLStream(options)) {
  response.write(chunk);
}
```

## 主要 API

### `renderHTML(options)`

同步渲染 HTML。

```typescript
import { renderHTML } from '@lytjs/html-renderer';

const html = renderHTML({
  title: 'Page Title',
  content: '<div>Content</div>',
  meta: {
    description: 'Description',
    keywords: ['lytjs', 'framework'],
  },
  scripts: ['/app.js'],
  styles: ['/style.css'],
});
```

### `renderHTMLStream(options)`

流式渲染 HTML，生成异步迭代器。

```typescript
import { renderHTMLStream } from '@lytjs/html-renderer';

// 在服务端使用
app.get('/page', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  for await (const chunk of renderHTMLStream(options)) {
    res.write(chunk);
  }
  res.end();
});
```

### 模板选项

```typescript
interface RenderOptions {
  title: string;
  content: string;
  meta?: Record<string, string>;
  scripts?: string[];
  styles?: string[];
  template?: TemplateRenderer;
  head?: string;
}
```

## 许可证

MIT License
