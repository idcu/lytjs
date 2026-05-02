# @lytjs/component

> LytJS 组件系统，提供组件实例管理、Props/Emits/Slots 和生命周期钩子

## 安装

```bash
npm install @lytjs/component
```

## 核心 API

### defineComponent

定义组件选项对象

```typescript
import { defineComponent } from '@lytjs/component';
```

### createComponentInstance / setupComponent

创建和初始化组件实例

```typescript
import { createComponentInstance, setupComponent } from '@lytjs/component';
```

### provide / inject

依赖注入

```typescript
import { provide, inject } from '@lytjs/component';
```

### onMounted / onUnmounted / onUpdated

组件生命周期钩子

```typescript
import { onMounted, onUnmounted, onUpdated } from '@lytjs/component';
```

### KeepAlive

内置缓存组件

```typescript
import { KeepAlive } from '@lytjs/component';
```

### Suspense

异步组件边界

```typescript
import { Suspense } from '@lytjs/component';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/reactivity](../reactivity) - 响应式系统，组件状态管理的基础
- [@lytjs/vdom](../vdom) - 虚拟 DOM，组件渲染的基础
