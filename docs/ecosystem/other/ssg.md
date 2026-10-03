# @lytjs/ssg

> LytJS 静态站点生成工具。

## 简介

`@lytjs/ssg` 是 LytJS 框架的静态站点生成工具，用于将动态内容预渲染为静态 HTML 文件。

### 核心特性

- **增量静态生成**：支持增量预渲染
- **路由清单生成**：自动生成路由清单
- **零依赖**：不引入任何外部依赖

## 安装

```bash
npm install @lytjs/ssg
```

或使用 pnpm：

```bash
pnpm add @lytjs/ssg
```

## 快速开始

### 基本使用

```typescript
// ⚠️ 下列 API 在 @lytjs/ssg 尚未实现（文档曾承诺）：generateStaticSite

// 生成静态站点
await generateStaticSite({
  routes: ['/', '/about', '/blog'],
  render: (route) => {
    // 渲染路由内容
    return `<html><body>Content for ${route}</body></html>`;
  },
  outputDir: './dist',
});
```

### 增量生成

```typescript
// ⚠️ 下列 API 在 @lytjs/ssg 尚未实现（文档曾承诺）：generateStaticSite, incrementalGenerate

// 全量生成
await generateStaticSite(config);

// 增量生成（只更新变更的部分）
await incrementalGenerate(config, changedRoutes);
```

## 主要 API

### `generateStaticSite(options)` ⚠️ 未实现

生成完整的静态站点。

```typescript
// ⚠️ 下列 API 在 @lytjs/ssg 尚未实现（文档曾承诺）：generateStaticSite

await generateStaticSite({
  routes: ['/', '/about'],
  render: async (route) => {
    // 渲染逻辑
    return htmlString;
  },
  outputDir: './dist',
  clean: true, // 是否清理输出目录
});
```

### `incrementalGenerate(options, changedRoutes)` ⚠️ 未实现

增量生成静态站点。

```typescript
// ⚠️ 下列 API 在 @lytjs/ssg 尚未实现（文档曾承诺）：incrementalGenerate

await incrementalGenerate(
  options,
  ['/new-page', '/updated-page'], // 变更的路由
);
```

### `getRouteManifest()` ⚠️ 未实现

获取路由清单。

```typescript
// ⚠️ 下列 API 在 @lytjs/ssg 尚未实现（文档曾承诺）：getRouteManifest

const manifest = getRouteManifest();
```

## 许可证

MIT License
