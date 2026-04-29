# Lyt.js

> 轻量级、高性能的响应式前端框架

## 特性

- 🚀 高性能响应式系统
- 🎯 精确的 VDOM diff 算法
- 📦 模块化包架构
- 🛡️ TypeScript 全类型支持
- ⚡ 编译时优化（PatchFlags、Block Tree）

## 快速开始

```bash
npm install @lytjs/core
```

```typescript
import { createApp, ref, computed } from '@lytjs/core'

const app = createApp({
  setup() {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)
    return { count, doubled }
  },
  template: '<div>{{ count }} x 2 = {{ doubled }}</div>'
})

app.mount('#app')
```

## 包架构

| 包 | 描述 |
|---|---|
| [@lytjs/reactivity](./packages/reactivity) | 响应式系统（ref, reactive, computed, watch） |
| [@lytjs/vdom](./packages/vdom) | 虚拟 DOM 和 diff 算法 |
| [@lytjs/compiler](./packages/compiler) | 模板编译器 |
| [@lytjs/renderer](./packages/renderer) | DOM/SSR 渲染器 |
| [@lytjs/component](./packages/component) | 组件系统 |
| [@lytjs/core](./packages/core) | 核心应用 API |

## 开发

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发指南。

## 许可证

MIT
