# 安装

## 系统要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0（推荐）

## 快速开始（推荐）

最简单的方式是使用 LytJS CLI 创建项目：

```bash
# 创建新项目
npx @lytjs/cli create my-lytjs-app

# 进入目录
cd my-lytjs-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

CLI 会自动配置好一切，包括推荐的 Signal 响应式 API。

---

## 手动安装

如果你想手动配置项目，推荐使用 `@lytjs/core` 包：

### 使用 pnpm（推荐）

```bash
pnpm add @lytjs/core
```

### 使用 npm

```bash
npm install @lytjs/core
```

### 使用 yarn

```bash
yarn add @lytjs/core
```

---

## 基本使用示例

安装后，你可以这样使用：

```typescript
import { createApp, signal } from '@lytjs/core';

const App = {
  setup() {
    const count = signal(0);
    return { count };
  },
  template: `
    <div>
      <p>计数: {{ count }}</p>
      <button @click="count(count() + 1)">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

---

## 高级：渲染模式选择（可选）

`@lytjs/core` 是默认的完整包，同时支持两种渲染模式。如果你想使用独立的渲染模式包，可以选择：

### Signal 模式（性能优先）

```bash
pnpm add @lytjs/core-signal
```

### VNode 模式（兼容优先）

```bash
pnpm add @lytjs/core-vnode
```

::: warning 注意
请选择一种渲染模式并在整个应用中保持一致，不要混合使用。
:::

---

## 按需引入（高级）

LytJS 采用模块化架构，你可以只安装需要的包：

```bash
# 只需要响应式系统
pnpm add @lytjs/reactivity

# 只需要工具函数
pnpm add @lytjs/common-is
pnpm add @lytjs/common-object
```

---

## TypeScript

LytJS 使用 TypeScript 编写，类型定义已内置，无需额外安装 `@types` 包。

---

## 浏览器兼容性

| 浏览器  | 版本  |
| :------ | :---- |
| Chrome  | >= 80 |
| Firefox | >= 78 |
| Safari  | >= 14 |
| Edge    | >= 80 |

---

## 开发工具

### Vite 插件

```bash
pnpm add -D @lytjs/plugin-vite
```

在 `vite.config.ts` 中配置：

```typescript
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [lytjs()],
});
```

### ESLint 插件

::: warning 尚未实现
`eslint-plugin-lytjs` 目前尚未发布，请关注后续版本更新。
:::

---

## 下一步

- [快速开始](../tutorial/quick-start) - 创建你的第一个 LytJS 应用
- [响应式基础](../tutorial/reactivity) - 学习 Signal API
- [组件基础](../tutorial/components) - 学习组件开发
