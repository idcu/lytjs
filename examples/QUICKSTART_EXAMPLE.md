# LytJS 示例项目快速开始

本目录包含多个使用 LytJS 的示例项目。

## 目录结构

```
examples/
├── counter/              # 简单计数器示例
├── complete-todo/        # 完整待办事项应用
├── plugins-demo/         # 插件使用示例
├── admin-dashboard/      # 管理后台示例
├── ecommerce-cart/       # 购物车示例
├── user-management/      # 用户管理示例
├── weather-dashboard/    # 天气仪表盘示例
├── ui-components/        # UI 组件展示
├── social-media-example.ts
├── admin-dashboard-example.ts
├── data-visualization-example.ts
├── ssr-complete-example.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
cd examples
pnpm install
```

### 2. 运行开发服务器

```bash
pnpm dev
```

### 3. 在浏览器中打开

访问 `http://localhost:5173` 查看示例列表。

## 示例说明

### 1. Counter (简单计数器)

展示最基础的 LytJS 用法，包括响应式状态和事件处理。

**特点：**
- 使用 `@lytjs/store` 进行状态管理
- 展示信号 (Signal) 响应式
- 简单的 DOM 操作

**文件位置：** `examples/counter/index.html`

### 2. Complete Todo (完整待办应用)

功能完整的待办事项管理应用。

**特点：**
- 使用 `h()` 渲染函数
- 支持本地存储持久化
- 深色/浅色主题切换
- 待办项筛选 (全部/进行中/已完成)
- 使用 `ref`, `computed`, `watch`

**文件位置：** `examples/complete-todo/main.ts`

### 3. Plugins Demo (插件演示)

展示如何使用 LytJS 的官方插件。

**特点：**
- 展示多个插件的集成使用
- 插件注册和配置

**文件位置：** `examples/plugins-demo/`

### 4. UI Components (UI 组件展示)

展示 `@lytjs/ui` 组件库的使用方法。

**特点：**
- Button, Input, Table 等组件
- 主题切换
- 响应式布局

**文件位置：** `examples/ui-components/`

## 学习路径

### 初学者路径

1. **Counter** - 了解响应式基础
2. **Complete Todo** - 学习组件和状态管理
3. **UI Components** - 熟悉 UI 组件库

### 进阶路径

1. **Plugins Demo** - 学习插件系统
2. **Admin Dashboard** - 了解复杂应用架构
3. **SSR Complete Example** - 学习服务端渲染

## 开发模式选择

LytJS 支持两种渲染模式：

### Vapor 模式 (推荐，高性能)

```typescript
import { createApp, signal } from '@lytjs/core-signal';
```

### VDOM 模式 (兼容性优先)

```typescript
import { createApp, ref } from '@lytjs/core-vnode';
```

### 完整模式 (默认)

```typescript
import { createApp, ref, signal } from '@lytjs/core';
```

## 常用代码片段

### 1. 创建应用

```typescript
import { createApp, ref } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    return { count };
  },
  template: '<div>Count: {{ count }}</div>'
};

createApp(App).mount('#app');
```

### 2. 使用 UI 组件

```typescript
import { createApp } from '@lytjs/core';
import LytUI, { Button, Input } from '@lytjs/ui';

const App = {
  components: { Button, Input },
  template: `
    <div>
      <Input placeholder="请输入" />
      <Button type="primary">提交</Button>
    </div>
  `
};

const app = createApp(App);
app.use(LytUI);
app.mount('#app');
```

### 3. 使用状态管理

```typescript
import { createApp } from '@lytjs/core';
import { defineStore, createPinia } from '@lytjs/store';

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++; }
  }
});

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

### 4. 使用路由

```typescript
import { createApp } from '@lytjs/core';
import { createRouter, RouterLink, RouterView } from '@lytjs/router';

const Home = { template: '<h1>首页</h1>' };
const About = { template: '<h1>关于</h1>' };

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});

const App = {
  components: { RouterLink, RouterView },
  template: `
    <div>
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
      <RouterView />
    </div>
  `
};

const app = createApp(App);
app.use(router);
app.mount('#app');
```

## 运行单个示例

每个示例都可以独立运行：

```bash
# 直接在浏览器中打开
open examples/counter/index.html

# 或者使用 VS Code Live Server
```

## 常见问题

### Q: 示例依赖如何安装？

A: 因为是 monorepo 结构，使用 `workspace:*` 引用本地包，直接在项目根目录运行 `pnpm install` 即可。

### Q: 如何修改示例？

A: 可以直接编辑示例文件，然后刷新浏览器查看效果。

### Q: 我可以使用示例作为模板吗？

A: 当然可以！建议复制示例目录作为新项目起点。

## 更多资源

- [官方文档](../docs/)
- [API 参考](../docs/api/)
- [架构指南](../docs/contribute/architecture/)

