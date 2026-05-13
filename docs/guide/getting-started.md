# 快速开始

本指南将帮助你在 5 分钟内创建你的第一个 LytJS 应用。

## 在线体验

你可以直接在 [StackBlitz](https://stackblitz.com) 上体验 LytJS，无需安装任何东西。

## 创建项目

### 使用 pnpm（推荐）

```bash
# 创建项目目录
mkdir my-lytjs-app
cd my-lytjs-app

# 初始化项目
pnpm init

# 安装 LytJS
pnpm add @lytjs/core @lytjs/component @lytjs/vdom
```

### 使用 npm

```bash
mkdir my-lytjs-app
cd my-lytjs-app
npm init -y
npm install @lytjs/core @lytjs/component @lytjs/vdom
```

## 你的第一个组件

创建 `src/main.ts` 文件：

```typescript
import { createApp, defineComponent, signal } from '@lytjs/core';
import { createVNode } from '@lytjs/vdom';

// 定义一个计数器组件
const Counter = defineComponent({
  name: 'Counter',
  
  setup() {
    // 创建响应式状态
    const count = signal(0);
    
    // 定义方法
    const increment = () => count.set(count() + 1);
    const decrement = () => count.set(count() - 1);
    
    // 返回渲染函数
    return () => {
      return createVNode('div', { class: 'counter' }, [
        createVNode('h1', {}, `Count: ${count()}`),
        createVNode('button', { onClick: decrement }, '-'),
        createVNode('button', { onClick: increment }, '+'),
      ]);
    };
  }
});

// 创建应用并挂载
createApp(Counter).mount('#app');
```

## HTML 模板

创建 `index.html` 文件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

## 运行项目

使用 Vite 运行开发服务器：

```bash
# 安装 Vite
pnpm add -D vite

# 启动开发服务器
pnpm vite
```

打开浏览器访问 `http://localhost:5173`，你将看到一个可交互的计数器！

## 下一步

- [安装](/guide/installation) - 了解更多安装方式
- [响应式系统](/guide/reactivity) - 深入理解 Signal
- [组件](/guide/component) - 学习组件开发
