# DevTools 开发者工具

@lytjs/devtools 是 LytJS 官方开发者工具，帮助调试和检查应用。

## 安装

```bash
pnpm add @lytjs/devtools
```

## 基础用法

### 安装 DevTools

```typescript
import { installDevTools, registerStore, registerRouter } from '@lytjs/devtools';
import { useCounterStore } from './stores/counter';
import { router } from './router';

// 安装 DevTools
installDevTools();

// 注册 Store
registerStore('counter', useCounterStore());

// 注册 Router
registerRouter(router);
```

### 快捷键

- **Ctrl + Shift + D** (Windows/Linux)
- **Cmd + Shift + D** (macOS)

## 功能

### 组件树查看器

查看应用组件层级结构：

```typescript
import { registerRootComponent, getComponentTree } from '@lytjs/devtools';

// 注册根组件
registerRootComponent(App);

// 获取组件树
const tree = getComponentTree();
console.log(tree);
```

### Store 状态检查器

查看和修改 Store 状态：

```typescript
import { 
  registerStore, 
  getStoreStates, 
  setStoreState 
} from '@lytjs/devtools';

// 注册 Store
registerStore('user', userStore);

// 获取所有 Store 状态
const states = getStoreStates();

// 修改状态（调试用）
setStoreState('user', 'name', 'New Name');
```

### 路由查看器

查看当前路由信息：

```typescript
import { 
  registerRouter, 
  getCurrentRoute, 
  getRoutes 
} from '@lytjs/devtools';

// 注册路由器
registerRouter(router);

// 获取当前路由
const route = getCurrentRoute();

// 获取所有路由
const routes = getRoutes();
```

## API

- `installDevTools(options)` - 安装 DevTools
- `registerStore(id, store)` - 注册 Store
- `registerRouter(router)` - 注册路由器
- `registerRootComponent(component)` - 注册根组件
- `getStoreStates()` - 获取所有 Store 状态
- `getCurrentRoute()` - 获取当前路由
- `getComponentTree()` - 获取组件树
