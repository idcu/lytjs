# @lytjs/plugin-vite API 参考

## 安装

```bash
pnpm add -D @lytjs/plugin-vite
```

## 使用方法

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
});
```

## 配置选项

```typescript
interface LytjsPluginOptions {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  ssr?: boolean;
  signalMode?: boolean;
}
```

### include

要包含进行转换的文件。默认值：`/\.lyt$/`

### exclude

要排除的文件。默认值：`/node_modules/`

### ssr

启用 SSR 模式。默认值：`false`

### signalMode

启用 signal 模式编译。默认值：`false`

## 功能特性

### 单文件组件编译

编译 `.lyt` 单文件组件：

- `<template>` - 组件模板
- `<script setup>` - 组合式 API 脚本
- `<style scoped>` - 作用域样式

### 模块热替换（HMR）

自动支持 `.lyt` 文件的 HMR：

- 模板修改：组件级别 HMR
- 脚本修改：整页重载
- 样式修改：CSS HMR

### 作用域样式

使用唯一的 `__scopeId` 实现作用域 CSS：

```html
<style scoped>
  .button {
    color: red;
  }
</style>
```

### 自定义块

#### `<route>` 块

在组件中定义路由配置：

```html
<route> { "path": "/users/:id", "name": "user-detail" } </route>
```

导入路由配置：

```typescript
import routeConfig from './UserDetail.lyt.route';
```
