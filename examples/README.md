# LytJS 示例项目

本目录包含多个使用 LytJS 构建的示例项目，覆盖响应式、组件、插件、状态管理、路由、SSR 等场景。

## 📋 目录

- [Counter](./counter/) - 简单计数器示例
- [Complete Todo](./complete-todo/) - 完整待办事项应用
- [Plugins Demo](./plugins-demo/) - 插件使用示例
- [Admin Dashboard](./admin-dashboard/) - 管理后台示例
- [E-commerce Cart](./ecommerce-cart/) - 购物车示例
- [User Management](./user-management/) - 用户管理示例
- [Weather Dashboard](./weather-dashboard/) - 天气仪表盘示例
- [UI Components](./ui-components/) - UI 组件展示
- [Using LytJS as Dep](./using-lytjs-as-dep/) - 作为外部依赖使用

## 🚀 快速开始

### 安装依赖

在项目根目录运行安装命令（因为使用 monorepo workspace）：

```bash
cd ..
pnpm install
```

### 运行开发服务器

```bash
cd examples
pnpm dev
```

然后在浏览器中打开相应的 HTML 文件即可查看示例。

### 运行单个示例

```bash
# 直接在浏览器中打开
open examples/counter/index.html

# 或者使用 VS Code Live Server
```

## 📖 学习路径

### 初学者路径

1. **Counter** - 了解响应式基础
2. **Complete Todo** - 学习组件和状态管理
3. **UI Components** - 熟悉 UI 组件库

### 进阶路径

1. **Plugins Demo** - 学习插件系统
2. **Admin Dashboard** - 了解复杂应用架构
3. **SSR Complete Example** - 学习服务端渲染

## 🧩 常用代码片段

### 1. 创建应用

```typescript
import { createApp, ref } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    return { count };
  },
  template: '<div>Count: {{ count }}</div>',
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
  `,
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
    increment() {
      this.count++;
    },
  },
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
    { path: '/about', component: About },
  ],
});

const App = {
  components: { RouterLink, RouterView },
  template: `
    <div>
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
      <RouterView />
    </div>
  `,
};

const app = createApp(App);
app.use(router);
app.mount('#app');
```

## 📦 关于 workspace 依赖

本项目使用 monorepo 架构，示例项目使用 `workspace:*` 依赖本地的 LytJS 包，而不是从 npm 官方仓库安装。这样的好处：

1. **开发体验好** - 本地修改代码后立即生效，无需发布
2. **版本一致** - 确保所有包使用相同版本
3. **构建优化** - 可以进行更优化的构建和 tree-shaking

**注意**：如果你想将这些示例作为自己项目的起点，请将 `package.json` 中的依赖从 `workspace:*` 改为具体的版本号（如 `^6.9.6`）。

## 💡 双渲染模式

LytJS 支持两种渲染模式，示例均在该双模式下构建：

1. 使用 `@lytjs/core` - 完整双模式支持（推荐）
2. 使用 `@lytjs/core-signal` - 仅 Vapor 模式，性能更好
3. 使用 `@lytjs/core-vnode` - 仅 VDOM 模式，兼容性更好

```typescript
// Vapor 模式（推荐，高性能）
import { createApp, signal } from '@lytjs/core-signal';

// VDOM 模式（兼容性优先）
import { createApp, ref } from '@lytjs/core-vnode';

// 完整模式（默认）
import { createApp, ref, signal } from '@lytjs/core';
```

## ❓ 常见问题

### Q: 示例依赖如何安装？

A: 因为是 monorepo 结构，使用 `workspace:*` 引用本地包，直接在项目根目录运行 `pnpm install` 即可。

### Q: 如何修改示例？

A: 可以直接编辑示例文件，然后刷新浏览器查看效果。

### Q: 我可以使用示例作为模板吗？

A: 当然可以！建议复制示例目录作为新项目起点。

## 🔗 相关资源

- [LytJS 主文档](../README.md)
- [官方文档](../docs/)
- [快速参考指南](../docs/getting-started/quick-reference.md)
- [API 文档](../docs/api/)
- [架构文档](../docs/contribute/architecture/)
