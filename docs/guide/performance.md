# 性能优化指南

本文档介绍如何优化 Lyt.js 应用的性能。

## 核心优化策略

### 1. 使用 Vapor Mode

Vapor Mode 是 Lyt.js 的无虚拟 DOM 编译策略，性能接近原生 JavaScript：

```typescript
import { defineConfig } from '@lytjs/lytx'

export default defineConfig({
  vapor: true  // 启用 Vapor Mode
})
```

Vapor Mode 的优势：
- 消除虚拟 DOM 开销
- 更小的运行时体积
- 更快的首次渲染
- 更低的内存占用

### 2. 使用 Islands Architecture

仅对交互组件注水，静态内容零 JS 开销：

```typescript
import { defineIsland, createSSRApp } from '@lytjs/core'

const CounterIsland = defineIsland({
  hydration: 'visible',  // 可见时注水
  setup() {
    const count = ref(0)
    return { count }
  },
  template: `<button @click="count++">{{ count }}</button>`
})
```

注水策略：
- `immediate` - 立即注水（默认）
- `idle` - 浏览器空闲时注水
- `visible` - 元素可见时注水
- `interaction` - 用户交互时注水

### 3. 使用 KeepAlive 缓存组件

缓存频繁使用的组件避免重复渲染：

```typescript
<KeepAlive>
  <component :is="currentView" />
</KeepAlive>
```

## 响应式系统优化

### 避免深层嵌套

将大对象拆分为多个小的响应式对象：

```typescript
// ❌ 不推荐
const state = reactive({
  user: { profile: { settings: {} } },
  posts: [],
  comments: []
})

// ✅ 推荐
const user = reactive({ profile: { settings: {} } })
const posts = ref([])
const comments = ref([])
```

### 使用 shallowRef / shallowReactive

对于不需要深层响应的大型对象：

```typescript
import { shallowRef, shallowReactive } from '@lytjs/reactivity'

const largeList = shallowRef([])  // 仅浅层响应
const config = shallowReactive({}) // 仅浅层响应
```

### 使用 markRaw 标记无需响应的对象

```typescript
import { markRaw } from '@lytjs/reactivity'

const staticData = markRaw({ /* 不会被响应式追踪 */ })
```

## 渲染优化

### 使用 Key 优化列表渲染

始终为 v-for 列表提供唯一 key：

```html
<!-- ✅ 推荐 -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

<!-- ❌ 避免 -->
<div v-for="item in items" :key="index">{{ item.name }}</div>
```

### 使用 v-once 渲染一次性内容

```html
<div v-once>这个内容只渲染一次</div>
```

### 使用 v-memo 记忆化组件

```html
<div v-memo="[item.id]">只会在 item.id 变化时重新渲染</div>
```

## 组件优化

### 懒加载组件

使用动态导入：

```typescript
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.lyt')
)
```

配合路由懒加载：

```typescript
const routes = [
  { 
    path: '/heavy', 
    component: () => import('./pages/HeavyPage.lyt')
  }
]
```

### 使用 Functional Components

对于无状态的展示组件：

```typescript
const Button = (props, { slots }) => ({
  type: 'button',
  props: { class: 'btn' },
  children: slots.default?.()
})
```

## 编译优化

### 静态提升

Lyt.js 编译器会自动将静态内容提升到渲染函数外：

```html
<!-- 模板 -->
<div>
  <p>静态内容</p>
  <p>动态内容: {{ count }}</p>
</div>

<!-- 编译后会将静态 p 标签提升 -->
```

### 编译时优化

使用 `lytx compile` 预编译模板：

```bash
npx lytx compile src/ --outdir dist/
```

## 状态管理优化

### 合理拆分 Store

将大型 Store 拆分为多个小 Store：

```typescript
// userStore.ts
export const useUserStore = defineStore('user', { /* ... */ })

// cartStore.ts
export const useCartStore = defineStore('cart', { /* ... */ })
```

### 使用 Selector 避免不必要更新

```typescript
import { useUserStore } from './stores/user'

const userStore = useUserStore()
const userName = computed(() => userStore.user.name) // 只订阅 name
```

## 路由优化

### 路由懒加载

```typescript
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home.lyt')
  },
  {
    path: '/about',
    component: () => import('./pages/About.lyt')
  }
]
```

### 使用 RouterView 缓存

```typescript
import { useRouterView } from '@lytjs/router'

const { Component, route } = useRouterView()
```

## 资源加载优化

### 预加载关键资源

```html
<link rel="preload" href="/critical.js" as="script">
<link rel="prefetch" href="/future.js" as="script">
```

### 图片优化

```html
<img 
  src="image.jpg" 
  loading="lazy"
  decoding="async"
  width="400"
  height="300"
>
```

## DevTools 性能分析

### 使用内置 DevTools

```typescript
import { createDevTools } from '@lytjs/devtools'

const app = createApp(App)
app.use(createDevTools())
```

### 性能采集

```typescript
import { perf } from '@lytjs/devtools'

perf.start('my-operation')
// ... 执行操作
perf.end('my-operation')
```

## 生产环境优化

### 移除开发工具

```typescript
import { createApp } from '@lytjs/core'

const app = createApp(App)

if (import.meta.env.DEV) {
  app.use(devTools)
}
```

### 启用 Tree Shaking

确保使用 ES modules：

```json
{
  "sideEffects": false
}
```

## 性能检查清单

- [ ] 启用 Vapor Mode
- [ ] 使用 Islands Architecture
- [ ] 合理使用 KeepAlive
- [ ] 优化响应式对象
- [ ] 使用 Key 优化列表
- [ ] 懒加载组件和路由
- [ ] 预编译模板
- [ ] 拆分 Store
- [ ] 优化图片加载
- [ ] 配置 CDN 和缓存
- [ ] 使用 DevTools 分析性能

## 性能基准测试

运行内置基准测试：

```bash
npm run bench
```

与其他框架对比：
- Lyt.js (Vapor Mode): ~1.0x 原生
- Lyt.js (Standard): ~1.5x 原生
- Vue 3: ~2.0x 原生
- React: ~2.5x 原生

## 下一步

- 查看 [部署指南](./deployment.md)
- 了解 [高级主题](./advanced-topics.md)
