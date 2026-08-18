# @lytjs/plugin-vite

LytJS 官方 Vite 插件，用于 `.lyt` 单文件组件（SFC）编译、HMR 热更新与构建优化。

## 安装

```bash
pnpm add @lytjs/plugin-vite
```

该插件依赖 `vite`（^5.0.0 或 ^6.0.0）作为 peer 依赖。

## 使用示例

本插件为 Vite 插件，需在 `vite.config` 中引入：

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [
    lytjs({
      // 匹配的文件扩展名，默认 /\.lyt$/
      include: [/\.lyt$/],
      // 排除的目录
      exclude: [/node_modules/, /\.git/],
      // 服务端渲染
      ssr: false,
      // 启用 signal（Vapor）渲染模式
      signalMode: false,
      // 启用 Vapor HMR
      enableVaporHMR: false,
    }),
  ],
});
```

插件会自动完成以下工作：

- 编译 `.lyt` 单文件组件（含 `<template>`、`<script>`、`<style scoped>` 与自定义块）；
- 为 scoped 样式生成作用域 ID 并注入 `__scopeId`；
- 在开发环境注入 HMR accept，支持 Vapor（signal）模式下的状态保留热更新；
- 处理 `<route>` 自定义块并生成对应虚拟路由模块；
- 生产模式下提供 esbuild 与依赖优化的默认配置。

## API 说明

### 导出

- 默认导出：`lytjs(options?: LytjsPluginOptions): Plugin` 创建 Vite 插件（serve 函数）
- `defaultOptions`：默认插件配置（`Required<LytjsPluginOptions>`）
- `resolveOptions(options)`：将用户配置与默认值合并并返回
- 类型：`LytjsPluginOptions`

### LytjsPluginOptions

| 选项             | 类型                 | 默认值                      | 说明                         |
| ---------------- | -------------------- | --------------------------- | ---------------------------- |
| `include`        | `RegExp \| RegExp[]` | `[/\.lyt$/]`                | 参与编译的文件匹配           |
| `exclude`        | `RegExp \| RegExp[]` | `[/node_modules/, /\.git/]` | 排除的目录                   |
| `ssr`            | `boolean`            | `false`                     | 服务端渲染模式               |
| `signalMode`     | `boolean`            | `false`                     | 使用 signal（Vapor）渲染模式 |
| `enableVaporHMR` | `boolean`            | `false`                     | 启用 Vapor HMR               |

## 相关包

- [@lytjs/compiler](../../../compiler/README.md) SFC 解析与编译（`parseSFC`/`compileSFC`）
- [@lytjs/common-is](../../../common/packages/is/README.md) 公共类型工具

## 许可证

[MIT](../../../../LICENSE)
