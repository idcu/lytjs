# 渲染函数

LytJS 提供了 `h()` 函数用于创建虚拟节点（VNode），这在需要编程式构建 UI 时非常有用。

::: tip
渲染函数仅在 VNode 模式（`@lytjs/core` 或 `@lytjs/core-vnode`）下可用。Signal 模式（`@lytjs/core-signal`）使用模板驱动渲染，不导出 `h()` 函数。
:::

## h() 函数

`h()` 是 `createElement` 的缩写，用于创建 VNode：

```typescript
import { h } from '@lytjs/core';

// 返回类型：{ type: string | Component, props: object | null, children: ... }
```

### 基本用法

```typescript
// 创建一个 div 元素
h('div');

// 创建带有文本内容的元素
h('div', 'Hello World');

// 创建带有 props 的元素
h('div', { id: 'app', class: 'container' }, 'Hello');

// 创建带有子元素的元素
h('div', { class: 'container' }, [
  h('h1', '标题'),
  h('p', '段落内容'),
]);
```

### 事件绑定

```typescript
h('button', { onClick: () => console.log('clicked') }, '点击我');
```

### Class 和 Style

```typescript
// 对象语法
h('div', { class: { active: isActive, disabled: isDisabled } });

// 数组语法
h('div', { class: ['container', isActive ? 'active' : ''] });

// 内联样式
h('div', { style: { color: 'red', fontSize: '16px' } });
```

### 组件

```typescript
import { h, defineComponent } from '@lytjs/core';

const MyButton = defineComponent({
  props: ['label'],
  render() {
    return h('button', null, this.label);
  },
});

// 在渲染函数中使用组件
h(MyButton, { label: '提交' });
```

## JSX 支持

LytJS 支持在渲染函数中使用 JSX 语法。需要配置 TypeScript 和构建工具以支持 JSX 编译。

### 配置 TypeScript

在 `tsconfig.json` 中添加 JSX 配置：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@lytjs/core"
  }
}
```

### 使用 JSX

```tsx
import { defineComponent, ref } from '@lytjs/core';

const App = defineComponent({
  setup() {
    const count = ref(0);
    return () => (
      <div>
        <p>Count: {count.value}</p>
        <button onClick={() => count.value++}>+1</button>
      </div>
    );
  },
});
```

### Vite 配置

如果使用 Vite，确保 `vite.config.ts` 中正确配置了 JSX 插件：

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@lytjs/core',
  },
});
```

## createVNode

`createVNode` 是底层 API，与 `h()` 功能类似但更灵活：

```typescript
import { createVNode } from '@lytjs/core';

const vnode = createVNode('div', { id: 'app' }, [
  createVNode('p', null, 'Hello'),
]);
```

## Fragment

使用 `Fragment` 创建多根节点组件：

```typescript
import { h, Fragment } from '@lytjs/core';

const MultiRoot = {
  render() {
    return h(Fragment, null, [
      h('h1', '标题'),
      h('p', '内容'),
    ]);
  },
};
```
