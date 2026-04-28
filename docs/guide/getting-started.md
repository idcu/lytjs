# 快速开始

## 创建项目

使用 CLI 创建新项目：

```bash
npx @lytjs/cli create my-app
cd my-app
pnpm install
pnpm dev
```

## 手动安装

```bash
pnpm add @lytjs/core
```

## 第一个应用

```typescript
import { createApp, ref } from "@lytjs/core";

const App = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
  template: `
    <div>
      <h1>Hello Lyt.js!</h1>
      <p>Count: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `,
};

createApp(App).mount("#app");
```

## 下一步

- [响应式系统](/lytjs/guide/reactivity) - 了解响应式原理
- [组件](/lytjs/guide/components) - 学习组件系统
- [模板语法](/lytjs/guide/template-syntax) - 掌握模板语法
