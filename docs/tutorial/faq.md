# 常见问题 (FAQ)

这里收集了使用 LytJS 过程中常见的问题和解答。

## 基础问题

### LytJS 是什么？

LytJS 是一个轻量级、高性能的渐进式 JavaScript 框架，采用 8 层架构设计，具有零运行时第三方依赖、基于 Signal 的细粒度响应式系统等特点。

### LytJS 和 Vue/React 有什么区别？

- **零运行时依赖**：LytJS 所有核心功能自主实现
- **Signal 响应式**：更细粒度的更新机制
- **8 层架构**：更清晰的职责分离
- **Vapor 渲染模式**：无虚拟 DOM 的高效渲染

### 如何开始使用 LytJS？

推荐按照以下步骤：

1. 阅读 [快速上手指南](./quick-start.md)
2. 查看 [示例项目](../examples/)
3. 参考 [API 文档](../api/)

## 安装和配置

### 支持哪些 Node.js 版本？

LytJS 要求 Node.js 18.0 或更高版本。

### 使用什么包管理器？

推荐使用 pnpm，也支持 npm 和 yarn。

### 如何创建新项目？

```bash
npx @lytjs/cli create my-app
cd my-app
pnpm install
pnpm dev
```

## 响应式系统

### signal() 和 ref() 有什么区别？

- `signal()` 返回一个函数，通过调用获取和设置值
- `ref()` 返回一个对象，通过 `.value` 属性访问值

两者在功能上是等价的，可以根据个人喜好选择。

### computed() 是如何工作的？

`computed()` 创建一个计算属性，它会自动追踪依赖的信号，并在依赖变化时自动更新。计算属性是懒执行的，只有在访问时才会计算。

### 如何停止 effect？

`effect()` 返回一个清理函数，调用它可以停止 effect：

```typescript
const stop = effect(() => {
  console.log(count());
});

// 停止 effect
stop();
```

## 组件开发

### 如何定义一个组件？

使用 `defineComponent()`：

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const count = signal(0);
    return { count };
  },
  template: `<button @click="count++">{{ count }}</button>`,
});
```

### 组件之间如何通信？

- **Props**：父组件向子组件传递数据
- **Events**：子组件向父组件发送事件
- **Provide/Inject**：跨层级传递数据
- **Store**：全局状态管理

### 如何使用插槽？

```typescript
defineComponent({
  template: `
    <div class="card">
      <slot name="header"></slot>
      <slot></slot>
      <slot name="footer"></slot>
    </div>
  `,
});
```

## 路由

### 如何设置路由？

```typescript
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});
```

### 如何进行路由导航？

使用 `useRouter()`：

```typescript
import { useRouter } from '@lytjs/router';

const router = useRouter();

// 编程式导航
router.push('/about');
router.replace('/home');
router.back();
```

## 状态管理

### 何时使用 Store？

当需要跨多个组件共享状态，或者状态逻辑比较复杂时，使用 Store。

### Store 和全局变量有什么区别？

- Store 的状态变化是响应式的
- Store 提供了结构化的状态管理
- Store 支持 devtools 时间旅行调试

## 性能优化

### 如何提升渲染性能？

- 使用 Vapor 渲染模式
- 合理使用 `memo()` 优化计算
- 避免不必要的响应式数据
- 使用虚拟列表处理大量数据

### 如何优化包体积？

- 按需导入组件
- 使用 Tree Shaking
- 配置构建优化
- 移除未使用的代码

## 常见错误

### "Cannot find name '**DEV**'"

在项目中添加类型声明文件：

```typescript
// env.d.ts
declare const __DEV__: boolean;
```

### 组件不更新

检查是否正确使用了响应式 API：

- 确保使用了 `signal()`、`ref()` 或 `reactive()`
- 确保正确触发了更新
- 检查是否在 effect 中正确追踪了依赖

### 类型错误

确保：

- 安装了最新的类型定义
- tsconfig.json 配置正确
- 使用了 `import type` 导入类型

## 调试技巧

### 如何使用 DevTools？

1. 安装 LytJS DevTools 浏览器扩展
2. 在开发模式下启动应用
3. 打开浏览器开发者工具，找到 LytJS 面板

### 如何查看信号依赖图？

在 DevTools 的 Signals 面板中，可以查看完整的信号依赖关系图，还可以使用时间旅行调试功能。

## 获得帮助

如果以上解答没有解决你的问题，可以：

1. 查看 [GitHub Issues](https://gitee.com/lytjs/lytjs/issues)
2. 在社区提问
3. 提交 Bug 报告或功能请求

## 更多资源

- [官方文档](../guide/)
- [API 参考](../api/)
- [示例项目](../examples/)
- [最佳实践](./best-practices.md)
