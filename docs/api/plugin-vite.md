# @lytjs/plugin-vite

> LytJS 官方 Vite 插件，提供 SFC 编译、HMR 和构建优化。

## 安装

```bash
pnpm add -D @lytjs/plugin-vite
```

## 快速开始

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
});
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `include` | `RegExp \| RegExp[]` | `/\.lyt$/` | 匹配的文件模式 |
| `exclude` | `RegExp \| RegExp[]` | `/node_modules/, /\.git/` | 排除的文件模式 |
| `ssr` | `boolean` | `false` | SSR 模式 |
| `signalMode` | `boolean` | `false` | Signal 编译模式 |

## SFC 格式

`.lyt` 文件支持三个顶层块：

```html
<template>
  <div>{{ message }}</div>
</template>

<script setup>
import { ref } from '@lytjs/core';
const message = ref('Hello');
</script>

<style scoped>
div { color: #42b883; }
</style>
```

## HMR

插件自动支持热模块替换：
- **script 变更** → 全页刷新
- **template 变更** → 组件热更新
- **style 变更** → CSS 热更新
