# 构建优化

本文档介绍 LytJS 项目的构建优化策略，包括独立构建变体的选择和通用优化技巧。

## 独立构建变体

LytJS 提供两种独立的渲染模式包，可以根据项目需求选择合适的变体以优化包体积：

| 变体 | 包名 | 特点 |
|------|------|------|
| VNode 模式 | `@lytjs/core` / `@lytjs/core-vnode` | 包含完整 VDOM 支持，功能最全 |
| Signal 模式 | `@lytjs/core-signal` | 无 VDOM 开销，包体积更小 |

### 选择建议

- **通用应用**：使用 `@lytjs/core`（VNode 模式），兼容性最佳。
- **高性能场景**：使用 `@lytjs/core-signal`（Signal 模式），减少运行时体积，获得更细粒度的更新性能。

```bash
# VNode 模式
pnpm add @lytjs/core

# Signal 模式
pnpm add @lytjs/core-signal
```

## Tree Shaking

LytJS 的所有包都支持 ES Module，配合构建工具的 tree shaking 可以自动移除未使用的代码：

```typescript
// 只导入需要的 API，未使用的代码会在构建时被移除
import { ref, computed } from '@lytjs/core';
```

确保构建配置中启用了 tree shaking：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'esbuild',
    rollupOptions: {
      treeshake: true,
    },
  },
});
```

## 代码分割

使用动态 `import()` 实现路由级代码分割：

```typescript
// 路由懒加载
const routes = [
  {
    path: '/about',
    component: () => import('./views/About.vue'),
  },
];
```

## 按需导入子包

LytJS 的子包可以独立导入，避免引入整个 core 包：

```typescript
// 只需要响应式 API 时
import { ref, reactive, computed } from '@lytjs/reactivity';

// 只需要编译器时
import { compile } from '@lytjs/compiler';
```

## 构建配置优化

### Vite 生产构建

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'lytjs-vendor': ['@lytjs/core'],
          'lytjs-reactivity': ['@lytjs/reactivity'],
        },
      },
    },
  },
});
```

### 资源内联

对于小型资源，可以使用内联方式减少 HTTP 请求：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    assetsInlineLimit: 4096, // 4KB 以下的资源内联为 base64
  },
});
```

## 运行时优化

### 使用 computed 缓存

```typescript
import { ref, computed } from '@lytjs/core';

const list = ref([1, 2, 3, 4, 5]);
const filteredList = computed(() => list.value.filter((item) => item > 2));
```

### 合理使用 v-once 和 v-memo

```html
<!-- 静态内容使用 v-once -->
<div v-once>
  <h1>{{ title }}</h1>
  <p>这段内容只渲染一次</p>
</div>

<!-- 条件缓存使用 v-memo -->
<div v-memo="[item.id]">
  {{ item.name }}
</div>
```
