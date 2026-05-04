# 渲染模式

LytJS 支持多种渲染模式，开发者可以根据项目需求选择最适合的渲染策略。

## VNode 模式（默认）

VNode 模式是 LytJS 的默认渲染模式，使用虚拟 DOM 进行差异比较和更新。

### 工作原理

1. 组件状态变化时，生成新的虚拟 DOM 树
2. 将新旧虚拟 DOM 树进行 diff 比较
3. 计算出最小更新操作
4. 批量应用到真实 DOM

```typescript
import { createApp, ref, h } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
  render(ctx) {
    return h('div', [
      h('p', `Count: ${ctx.count}`),
      h('button', { onClick: ctx.increment }, '+1'),
    ]);
  },
};

createApp(App).mount('#app');
```

### 特点

- 兼容性最好，支持所有 LytJS 特性
- 通过虚拟 DOM diff 实现高效更新
- 适合大多数应用场景

## Signal 模式

Signal 模式使用细粒度的响应式信号（Signal）直接驱动 DOM 更新，无需虚拟 DOM diff。

### 工作原理

1. 响应式数据（Signal）与 DOM 节点建立直接绑定
2. Signal 值变化时，直接更新对应的 DOM 节点
3. 无需 diff 比较，更新路径更短

```typescript
import { createApp, ref } from '@lytjs/core-signal';

const App = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

### 特点

- 更细粒度的更新，性能更高
- 内存占用更低（无需维护虚拟 DOM 树）
- 适合数据频繁变化的高性能场景

### 与 VNode 模式的区别

```typescript
// VNode 模式：更新时 diff 整个组件的虚拟 DOM 树
// 数据变化 → 新 VNode → diff → 最小 DOM 操作

// Signal 模式：直接更新绑定的 DOM 节点
// 数据变化 → 直接更新对应 DOM 节点
```

## 如何选择渲染模式

| 特性 | VNode | Signal |
|------|-------|--------|
| 虚拟 DOM | 有 | 无 |
| Diff 开销 | 有 | 无 |
| 编译时优化 | 部分 | 部分 |
| 运行时体积 | 较大 | 中等 |
| 更新粒度 | 组件级 | 节点级 |
| 兼容性 | 最佳 | 良好 |
| 适用场景 | 通用 | 高频更新 |

### 选择建议

- **大多数应用**：使用默认的 VNode 模式，兼容性最好，开发体验最佳
- **数据密集型应用**（如仪表盘、实时数据展示）：使用 Signal 模式，获得更细粒度的更新性能

## @lytjs/core-vnode 和 @lytjs/core-signal 独立包

除了默认的 `@lytjs/core`（VNode 模式），LytJS 提供了独立的渲染模式包。

### @lytjs/core-vnode

VNode 模式的独立包，等同于 `@lytjs/core`：

```bash
pnpm add @lytjs/core-vnode
```

```typescript
import { createApp, ref } from '@lytjs/core-vnode';

const App = {
  setup() {
    const message = ref('Hello from VNode mode');
    return { message };
  },
  template: `<p>{{ message }}</p>`,
};

createApp(App).mount('#app');
```

### @lytjs/core-signal

Signal 模式的独立包：

```bash
pnpm add @lytjs/core-signal
```

```typescript
import { createApp, ref, computed, watch } from '@lytjs/core-signal';

const App = {
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);

    watch(count, (val) => {
      console.log('count changed:', val);
    });

    return { count, doubled };
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <p>Doubled: {{ doubled }}</p>
      <button @click="count++">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

### API 差异

三个包共享核心的 `createApp` / `ref` / `reactive` / `computed` / `watch` / `watchEffect` / `defineComponent` / `nextTick` 等 API，但渲染模式专属的 API 有所不同：

- **`@lytjs/core` / `@lytjs/core-vnode`** 提供 VNode 相关 API：`h()` / `createElement()` / `createVNode()` / `Fragment` / `Text` / `Comment` / `cloneVNode` / `mergeProps` / `defineAsyncComponent` / `resolveComponent` / `resolveDirective` / `withDirectives` / `withMemo` / `useSlots` / `useAttrs` / `useModel` / `defineCustomElement` 等。
- **`@lytjs/core-signal`** 提供 Signal 相关 API：`signal()` / `computedSignal()` / `readonlySignal()` / `set()` / `update()` / `valueOf()` / `signalBatch()` / `signalUntrack()`，以及 DOM 运行时 API（`insert` / `remove` / `createElement` / `setText` / `setAttribute` / `addEventListener` 等）。
- **`@lytjs/core-signal` 不导出** VNode 相关 API（如 `h`、`createVNode`、`Fragment`、`Text`、`Comment` 等）。
- **`@lytjs/core` / `@lytjs/core-vnode` 不导出** Signal 相关 API（如 `signal`、`computedSignal`、`readonlySignal` 等）。

```typescript
// VNode 模式（@lytjs/core 或 @lytjs/core-vnode）专属 API
import { h, createVNode, Fragment, Text, Comment, cloneVNode, mergeProps } from '@lytjs/core';

// Signal 模式（@lytjs/core-signal）专属 API
import { signal, computedSignal, readonlySignal, set, update, valueOf } from '@lytjs/core-signal';

// 两个模式共享的核心 API
import {
  createApp,
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  onMounted,
  onUnmounted,
  defineComponent,
  nextTick,
} from '@lytjs/core'; // 或 '@lytjs/core-signal'
```

### 按需选择包

在 `package.json` 中根据需求选择合适的包：

```json
{
  "dependencies": {
    "@lytjs/core": "^6.0.0"
  }
}
```

或使用独立包：

```json
{
  "dependencies": {
    "@lytjs/core-signal": "^6.0.0"
  }
}
```

### 渲染模式不支持混合使用

`@lytjs/core-vnode` 和 `@lytjs/core-signal` 是独立的渲染模式包，它们使用不同的渲染器（VNode 渲染器 vs Signal 渲染器），**不支持在同一应用中混合使用不同渲染模式的组件**。请根据项目需求选择一种渲染模式，并在整个应用中保持一致。
