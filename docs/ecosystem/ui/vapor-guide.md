# Vapor 模式使用指南

## 概述

LytJS 提供了两种渲染模式：

- **Vapor 模式**：基于 Signal 的细粒度渲染模式，性能最优
- **VDOM 模式**：虚拟 DOM 模式，兼容性更好

## 快速开始

### 1. 使用 Vapor 模式渲染你的第一个组件

```typescript
import { defineVaporComponent, createVaporApp } from '@lytjs/renderer';
import { Button, Input } from '@lytjs/ui';

// 定义 Vapor 模式组件
const App = defineVaporComponent({
  name: 'App',
  props: {
    message: { type: 'string', default: 'Hello Vapor!' },
  },
  setup(props, context) {
    return {
      // 暴露给模板使用
      props,
    };
  },
  template: `
    <div>
      <h1>{{ props.message }}</h1>
      <Button type="primary" @click="() => console.log('clicked')">
        Click me
      </Button>
    </div>
  `,
});

// 创建应用
const app = createVaporApp(App);
app.mount('#app');
```

### 2. 现有 UI 组件使用方式

\*\*方式一：在 Vapor 模式中直接使用 UI 组件

```typescript
import { defineVaporComponent, createVaporApp } from '@lytjs/renderer';
import { Button, Input, Card } from '@lytjs/ui';

const MyApp = defineVaporComponent({
  name: 'MyApp',
  setup() {
    return {};
  },
  template: `
    <div class="container">
      <Card header="欢迎使用">
        <Input placeholder="输入内容" />
        <Button type="primary">提交</Button>
      </Card>
    </div>
  `,
});

const app = createVaporApp(MyApp);
app.mount('#app');
```

## 性能优势

Vapor 模式相比 VDOM 模式的优势：

- ⚡ **更优**：更少的渲染开销，直接更新 DOM
- 🎯 **精准**：只有变化的部分更新
- 🔧 **轻量**：无虚拟 DOM diff
- 💨 **快速**：信号驱动的更新

## 最佳实践

1. \*\*高频更新的场景使用 Vapor 模式
2. 复杂组件场景可以混合使用两种模式
3. 优先使用细粒度的 Signal 更新

## 组件兼容性

所有 @lytjs/ui 的 60+ 组件都完全支持两种模式！

| 组件   | 推荐模式 | 说明                 |
| ------ | -------- | -------------------- |
| Button | Vapor    | 高频交互，推荐 Vapor |
| Input  | Vapor    | 高频更新，推荐 Vapor |
| Table  | VDOM     | 复杂列表渲染         |
| Form   | Vapor    | 表单交互多           |

## 混合使用

可以在同一个项目中混合使用两种模式：

```typescript
// 可以部分组件用 Vapor，部分用 VDOM
```
