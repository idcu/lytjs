# @lytjs/bundler

> LytJS 构建工具集成，提供 Vite 和 Webpack 插件支持。

[![npm version](https://img.shields.io/npm/v/@lytjs/bundler.svg)](https://www.npmjs.com/package/@lytjs/bundler)
[![license](https://img.shields.io/npm/l/@lytjs/bundler.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介·独立声明

`@lytjs/bundler` 是 LytJS 框架的官方构建工具集成包，为 Vite / Webpack 提供 LytJS 插件支持，并内置 SSG / SSR 预设配置。

> **框架无关性说明**：本库为**纯构建工具集成**，零运行时依赖、零框架依赖，不引用任何 `@lytjs/*` 核心包，可在任意项目中独立使用。按 v6.12 路线图规划，本库将迁出为独立仓库 `lytjs-bundler`，保持 API 兼容并提供迁移指南。

## 安装

```bash
npm install -D @lytjs/bundler
```

或使用 pnpm：

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

## 依赖关系

`@lytjs/bundler` **零运行时依赖**（不依赖任何 LytJS 核心包或第三方包）。

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

获取预设配置（`default` / `ssg` / `ssr`）。

```typescript
import { getPreset } from '@lytjs/bundler';

const preset = getPreset('ssg');
```

### createViteConfig(options)

创建完整的 Vite 配置。

```typescript
import { createViteConfig } from '@lytjs/bundler';

const config = createViteConfig({
  ssr: true,
});
```

## 相关包

- `@lytjs/compiler` - 模板/组件编译器（构建时转换目标）
- `@lytjs/core` - LytJS 核心运行时（插件集成目标）

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
