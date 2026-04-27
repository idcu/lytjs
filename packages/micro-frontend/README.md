# @lytjs/micro-frontend

Lyt.js 微前端集成包，提供沙箱隔离、通信机制、生命周期管理和主流微前端框架适配。

## 功能特性

- **沙箱隔离** - JS 沙箱和 CSS 沙箱，确保子应用之间互不干扰
- **通信机制** - EventBus 事件总线和 SharedState 共享状态
- **生命周期管理** - MicroApp 类统一管理子应用的挂载/卸载/更新
- **框架适配** - 内置 qiankun 和 micro-app 适配器

## 安装

```bash
npm install @lytjs/micro-frontend
```

## 快速开始

```ts
import { MicroApp, EventBus, createSandbox } from '@lytjs/micro-frontend'

// 创建事件总线
const bus = new EventBus()

// 创建子应用
const app = new MicroApp({
  name: 'child-app',
  entry: '//localhost:3001',
  container: document.getElementById('app-container')!,
  sandbox: createSandbox(),
  eventBus: bus,
})

// 挂载
await app.mount()

// 卸载
await app.unmount()
```
