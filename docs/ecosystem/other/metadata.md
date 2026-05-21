# @lytjs/metadata

> LytJS 元数据管理系统。

## 简介

`@lytjs/metadata` 是 LytJS 框架的元数据管理系统，支持 HTML meta 标签、OpenGraph、Twitter Cards 等。

### 核心特性

- **链式 API**：流畅的链式调用方式
- **OpenGraph 支持**：完整的 OpenGraph 元数据
- **Twitter Cards 支持**：支持 Twitter 卡片
- **SEO 优化**：自动处理 SEO 相关元数据
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/metadata
```

或使用 pnpm：

```bash
pnpm add @lytjs/metadata
```

## 快速开始

### 基本用法

```typescript
import { createMetadata } from '@lytjs/metadata';

const meta = createMetadata();

meta
  .title('My Page Title')
  .description('My page description')
  .keywords('react, framework, typescript')
  .author('My Name')
  .openGraph({
    title: 'OpenGraph Title',
    description: 'OpenGraph Description',
    url: 'https://example.com',
    type: 'website',
    image: 'https://example.com/image.jpg',
  });

// 生成 HTML
const html = meta.toString();
```

### OpenGraph 配置

```typescript
import { createMetadata } from '@lytjs/metadata';

const meta = createMetadata();

meta.openGraph({
  title: 'My Website',
  description: 'Description of my website',
  url: 'https://example.com',
  siteName: 'My Site',
  type: 'website',
  image: 'https://example.com/og-image.jpg',
  imageWidth: 1200,
  imageHeight: 630,
  locale: 'zh_CN',
  article: {
    author: 'Author Name',
    publisher: 'Publisher Name',
    publishedTime: '2023-01-01',
    modifiedTime: '2023-01-02',
    tags: ['tag1', 'tag2'],
  },
});
```

### Twitter Cards

```typescript
import { createMetadata } from '@lytjs/metadata';

const meta = createMetadata();

meta.twitter({
  card: 'summary_large_image',
  site: '@myaccount',
  creator: '@creator',
  title: 'Twitter Card Title',
  description: 'Twitter Card Description',
  image: 'https://example.com/twitter-image.jpg',
});
```

### 自定义元标签

```typescript
import { createMetadata } from '@lytjs/metadata';

const meta = createMetadata();

meta
  .meta('viewport', 'width=device-width, initial-scale=1')
  .meta('theme-color', '#ffffff')
  .meta('custom-tag', 'custom-value')
  .link('icon', '/favicon.ico')
  .link('stylesheet', '/style.css');
```

## 主要 API

### `createMetadata()`

创建元数据管理实例。

```typescript
import { createMetadata } from '@lytjs/metadata';

const meta = createMetadata();
```

### `Metadata` 方法

#### `title(title)`

设置页面标题。

```typescript
meta.title('My Page Title');
```

#### `description(description)`

设置页面描述。

#### `keywords(keywords)`

设置关键词。

```typescript
meta.keywords('react, framework, typescript');
// 或者
meta.keywords(['react', 'framework', 'typescript']);
```

#### `author(name)`

设置作者。

#### `openGraph(options)`

设置 OpenGraph 元数据。

#### `twitter(options)`

设置 Twitter Cards 元数据。

#### `meta(name, content)`

添加自定义 meta 标签。

#### `link(rel, href)`

添加 link 标签。

#### `toString()`

生成 HTML 字符串。

```typescript
const html = meta.toString();
console.log(html);
```

#### `toArray()`

返回元数据数组。

## 许可证

MIT License
