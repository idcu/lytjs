# Lyt.js 微前端示例

本示例演示了如何使用 Lyt.js 的微前端支持将应用作为子应用接入主应用。

## 运行方式

由于微前端示例涉及浏览器环境，需要通过 HTTP 服务器运行：

```bash
# 方式 1: 使用 Python
cd examples/micro-frontend
python3 -m http.server 8080

# 方式 2: 使用 Node.js
npx serve examples/micro-frontend

# 方式 3: 使用 Lyt.js CLI
lyt serve examples/micro-frontend
```

然后在浏览器中打开 `http://localhost:8080`。

## 示例说明

### 主应用 (index.html)

主应用提供了：
- **导航栏** - 切换不同的子应用
- **控制面板** - 调整主题、语言等共享状态
- **状态栏** - 显示子应用的运行状态
- **通信日志** - 实时展示主应用与子应用之间的通信

### 子应用 (child-app.js)

包含三个子应用组件：

1. **计数器子应用** - 演示基本的状态管理和用户交互
2. **待办事项子应用** - 演示列表渲染和 CRUD 操作
3. **主题切换子应用** - 演示响应式主题和样式管理

### 微前端运行时

示例中内置了简化版的微前端运行时（`window.LytMicroFrontend`），包含：
- `EventBus` - 事件总线
- `SharedState` - 共享状态
- `createSandbox()` - JS 沙箱
- `createStyleSandbox()` - CSS 沙箱
- `MicroApp` - 子应用生命周期管理

实际项目中应使用 `@lytjs/micro-frontend` 包。

## 架构说明

```
主应用 (index.html)
  |
  +-- MicroApp 管理
  |     |
  |     +-- Sandbox (JS 隔离)
  |     +-- StyleSandbox (CSS 隔离)
  |     +-- EventBus (事件通信)
  |     +-- SharedState (状态共享)
  |
  +-- 子应用 1: 计数器 (Web Component)
  +-- 子应用 2: 待办事项 (Web Component)
  +-- 子应用 3: 主题切换 (Web Component)
```

## 集成 qiankun

如果需要集成 qiankun，可以使用 `@lytjs/micro-frontend/adapters`：

```ts
import { createQiankunLifeCycle } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const { bootstrap, mount, unmount, update } = createQiankunLifeCycle({
  name: 'child-app',
  component: MyComponent,
})

export { bootstrap, mount, unmount, update }
```

## 集成 micro-app

如果需要集成 micro-app：

```ts
import { createMicroAppEntry } from '@lytjs/micro-frontend/adapters'
import { MyComponent } from './MyComponent'

const entry = createMicroAppEntry({
  name: 'child-app',
  component: MyComponent,
})

entry.register()
```
