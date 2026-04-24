# Component 组件系统

组件系统是构建复杂应用的基础。

## 🎯 什么是组件？

组件是可复用的代码块，封装了自己的模板、状态和逻辑。

**源代码位置**：`packages/component/src/`

## 📦 核心文件

### define-component.ts

**位置**：`packages/component/src/define-component.ts`

`defineComponent()` 函数用于定义组件。

### props.ts

**位置**：`packages/component/src/props.ts`

处理组件 Props。

### emit.ts

**位置**：`packages/component/src/emit.ts`

处理组件事件。

### lifecycle.ts

**位置**：`packages/component/src/lifecycle.ts`

生命周期钩子：
- `onMounted()`
- `onUpdated()`
- `onUnmounted()`

### composition-api.ts

**位置**：`packages/component/src/composition-api.ts`

Composition API 相关函数。

### builtins/ 目录

内置组件：
- `keep-alive.ts` - KeepAlive 组件
- `transition.ts` - Transition 组件
- `transition-group.ts` - TransitionGroup 组件
- `error-boundary.ts` - ErrorBoundary 组件
- `suspense.ts` - Suspense 组件

## 💡 推荐阅读顺序

1. **define-component.ts** - 了解如何定义组件
2. **lifecycle.ts** - 了解生命周期
3. **props.ts** - 了解 Props 处理
4. **emit.ts** - 了解事件处理
5. **builtins/** - 了解内置组件

## 📚 相关文档

- [reactivity](./01-reactivity.md)
- [core](./05-core.md)
