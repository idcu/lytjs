# @lytjs/bundler

LytJS 构建工具集成，提供 Vite 和 Webpack 插件支持。

## 安装

```bash
pnpm add -D @lytjs/bundler
```

## 快速开始

### Vite 配置

```typescript
import { defineConfig } from 'vite';
import { createVitePlugin } from '@lytjs/bundler';

export default defineConfig({
  plugins: [
    createVitePlugin({
      ssr: false,
      ssg: false,
    }),
  ],
});
```

### 预设配置

```typescript
import { createViteConfig } from '@lytjs/bundler';

export default createViteConfig({
  ssg: true,
});
```

## 特性

- Vite 插件集成
- Webpack 插件集成
- SSG 支持
- SSR 配置优化

## API

### createVitePlugin(options)

创建 Vite 插件。

```typescript
import { createVitePlugin } from '@lytjs/bundler';

const plugin = createVitePlugin({
  ssr: false,
  ssg: false,
});
```

### createWebpackPlugin(options)

创建 Webpack 插件。

### getPreset(name)

获取预设配置。

```typescript
import { getPreset } from '@lytjs/bundler';

const preset = getPreset('ssg');
```

### createViteConfig(options)

创建完整的 Vite 配置。

## 许可证

MIT
