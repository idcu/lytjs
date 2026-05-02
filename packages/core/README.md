# @lytjs/core

> LytJS 框架核心入口，整合响应式、编译器、虚拟 DOM 和组件系统

## 安装

```bash
npm install @lytjs/core
```

## 核心 API

### createApp

创建应用实例，挂载根组件

```typescript
import { createApp } from '@lytjs/core';

const app = createApp(RootComponent);
app.mount('#app');
```

### h / createElement

创建虚拟节点（JSX 工厂函数）

```typescript
import { h } from '@lytjs/core';
```

### defineComponent / defineAsyncComponent

定义组件和异步组件

```typescript
import { defineComponent, defineAsyncComponent } from '@lytjs/core';
```

### nextTick

在下一个 DOM 更新周期后执行回调

```typescript
import { nextTick } from '@lytjs/core';
```

### ref / reactive / computed / watch / watchEffect

响应式 API（从 @lytjs/reactivity 重导出）

```typescript
import { ref, reactive, computed, watch, watchEffect } from '@lytjs/core';
```

### onMounted / onUnmounted / onUpdated

生命周期钩子

```typescript
import { onMounted, onUnmounted, onUpdated } from '@lytjs/core';
```

### compile

模板编译（从 @lytjs/compiler 重导出）

```typescript
import { compile } from '@lytjs/core';
```

## 相关包

- [@lytjs/reactivity](../reactivity) - 响应式系统
- [@lytjs/vdom](../vdom) - 虚拟 DOM 实现
- [@lytjs/compiler](../compiler) - 模板编译器
- [@lytjs/renderer](../renderer) - DOM/SSR 渲染后端
- [@lytjs/component](../component) - 组件系统
