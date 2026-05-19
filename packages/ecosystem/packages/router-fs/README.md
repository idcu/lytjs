# @lytjs/router-fs

LytJS 文件系统路由引擎，自动扫描文件系统生成路由配置。

## 安装

```bash
pnpm add @lytjs/router-fs
```

## 快速开始

```typescript
import { createFileSystemRouter } from '@lytjs/router-fs';

const router = createFileSystemRouter({
  pagesDir: './src/pages',
});

// 添加路由
router.addRoute({
  path: '/about',
  componentPath: './src/pages/about.ts',
  isDynamic: false,
  isNested: false,
});

// 匹配路由
const match = router.match('/about');
console.log(match); // { path: '/about', ... }
```

## 特性

- 基于文件系统的自动路由生成
- 支持动态路由参数
- 支持嵌套路由
- 零外部依赖

## API

### createFileSystemRouter(options)

创建文件系统路由引擎实例。

```typescript
import { createFileSystemRouter } from '@lytjs/router-fs';

const router = createFileSystemRouter({
  pagesDir: './src/pages',
  basePath: '/',
});
```

### router.addRoute(route)

添加路由。

### router.match(path)

匹配路由。

### router.getRoutes()

获取所有路由。

## 文件结构约定

```
src/
└── pages/
    ├── index.ts       # /
    ├── about.ts       # /about
    └── user/
        └── [id].ts    # /user/:id
```

## 许可证

MIT
