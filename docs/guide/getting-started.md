# 高级手动配置

::: tip 提示
如果你是新手，推荐先阅读 [快速入门教程](../tutorial/quick-start)，使用 CLI 创建项目更简单。

本文档适用于想要从零开始手动配置项目的高级用户。
:::

## 前置准备

- Node.js >= 18.0.0
- pnpm >= 9.0.0（推荐）

## 从零创建项目

### 1. 初始化项目

```bash
# 创建项目目录
mkdir my-lytjs-app
cd my-lytjs-app

# 初始化项目
pnpm init
```

### 2. 安装依赖

```bash
# 安装 LytJS 核心包
pnpm add @lytjs/core

# 安装 Vite 作为开发服务器
pnpm add -D vite
```

### 3. 创建项目文件

#### `index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My LytJS App</title>
    <style>
      .counter {
        text-align: center;
        padding: 20px;
      }
      button {
        margin: 0 10px;
        padding: 10px 20px;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### `src/main.ts`

使用 Signal API（推荐）：

```typescript
import { createApp, signal } from '@lytjs/core';

const App = {
  setup() {
    const count = signal(0);
    const increment = () => count(count() + 1);
    const decrement = () => count(count() - 1);

    return { count, increment, decrement };
  },
  template: `
    <div class="counter">
      <h1>Count: {{ count }}</h1>
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

#### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
});
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### 4. 运行项目

```bash
# 启动开发服务器
pnpm vite
```

打开浏览器访问 `http://localhost:5173`。

---

## 使用渲染函数（高级）

如果你不想使用模板语法，也可以使用 `h` 函数手动创建 VNode：

```typescript
import { createApp, signal, h } from '@lytjs/core';

const App = {
  setup() {
    const count = signal(0);
    const increment = () => count(count() + 1);

    return () =>
      h('div', { class: 'counter' }, [
        h('h1', {}, `Count: ${count()}`),
        h('button', { onClick: increment }, '+'),
      ]);
  },
};

createApp(App).mount('#app');
```

---

## 选择渲染模式

### 使用 Signal 模式（性能优先）

```bash
pnpm add @lytjs/core-signal
```

```typescript
import { createApp, signal } from '@lytjs/core-signal';
```

### 使用 VNode 模式（兼容优先）

```bash
pnpm add @lytjs/core-vnode
```

```typescript
import { createApp, ref } from '@lytjs/core-vnode';
```

---

## 下一步

- 阅读 [响应式系统](./reactivity) - 深入了解响应式原理
- 学习 [组件](./component) - 了解组件开发
- 查看 [渲染模式](./rendering-modes) - 了解不同渲染模式的区别
