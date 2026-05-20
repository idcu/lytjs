# 渲染模式

LytJS 支持多种渲染模式，开发者可以根据项目需求选择最适合的渲染策略。

## 概述

LytJS 提供两种核心渲染模式：

| 模式            | 包名                                | 渲染机制         | 更新粒度 |
| --------------- | ----------------------------------- | ---------------- | -------- |
| **VNode 模式**  | `@lytjs/core` / `@lytjs/core-vnode` | 虚拟 DOM diff    | 组件级   |
| **Signal 模式** | `@lytjs/core-signal`                | 细粒度响应式绑定 | 节点级   |

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
    return h('div', [h('p', `Count: ${ctx.count}`), h('button', { onClick: ctx.increment }, '+1')]);
  },
};

createApp(App).mount('#app');
```

### 特点

- **兼容性最好**：支持所有 LytJS 特性
- **成熟稳定**：经过广泛验证的渲染机制
- **开发体验好**：支持热更新、DevTools 调试
- **适合复杂应用**：组件树较大时表现稳定

### 适用场景

- 通用 Web 应用
- 复杂的组件交互场景
- 需要最佳兼容性的项目
- 团队熟悉虚拟 DOM 开发模式

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

- **更细粒度的更新**：只更新变化的 DOM 节点
- **内存占用更低**：无需维护虚拟 DOM 树
- **更新延迟更低**：跳过 diff 阶段，直接更新 DOM
- **编译时优化**：模板编译为直接的 DOM 操作

### 适用场景

- 数据密集型应用（如仪表盘、实时数据展示）
- 高频更新场景（如动画、游戏）
- 性能敏感的应用
- 需要最小化运行时体积的项目

## 性能对比

### 更新机制对比

```typescript
// VNode 模式：更新时 diff 整个组件的虚拟 DOM 树
// 数据变化 → 新 VNode → diff → 最小 DOM 操作

// Signal 模式：直接更新绑定的 DOM 节点
// 数据变化 → 直接更新对应 DOM 节点
```

### 基准测试结果

以下是在典型场景下的性能对比（数值仅供参考，实际性能因具体场景而异）：

| 场景       | VNode 模式 | Signal 模式 | 说明                       |
| ---------- | ---------- | ----------- | -------------------------- |
| 首次渲染   | 基准       | ~15% 更快   | Signal 模式跳过 VNode 创建 |
| 单节点更新 | 基准       | ~40% 更快   | Signal 模式无 diff 开销    |
| 批量更新   | 基准       | ~25% 更快   | Signal 模式更新粒度更细    |
| 大列表更新 | 基准       | ~30% 更快   | Signal 模式避免全量 diff   |
| 内存占用   | 基准       | ~20% 更低   | Signal 模式无 VNode 树     |
| 运行时体积 | 基准       | ~15% 更小   | Signal 模式无 VNode 运行时 |

### 更新粒度对比

```typescript
// VNode 模式：组件级更新
// 当组件内任意响应式数据变化时，整个组件的 VNode 树会重新生成并 diff
const VNodeComponent = {
  setup() {
    const a = ref(0);
    const b = ref(0);
    return { a, b };
  },
  template: `
    <div>
      <span>{{ a }}</span>
      <span>{{ b }}</span>
    </div>
  `,
};
// 当 a 变化时，整个组件的 VNode 树会重新生成

// Signal 模式：节点级更新
// 当某个 Signal 变化时，只更新绑定的 DOM 节点
const SignalComponent = {
  setup() {
    const a = ref(0);
    const b = ref(0);
    return { a, b };
  },
  template: `
    <div>
      <span>{{ a }}</span>
      <span>{{ b }}</span>
    </div>
  `,
};
// 当 a 变化时，只有第一个 span 的文本节点会更新
```

## 选择建议

### 选择 VNode 模式的场景

- **通用 Web 应用**：兼容性最好，开发体验最佳
- **复杂组件交互**：组件间通信复杂，需要完整的组件生命周期
- **团队熟悉度**：团队熟悉 React/Vue 等虚拟 DOM 框架
- **生态工具依赖**：需要使用依赖 VNode API 的第三方库

### 选择 Signal 模式的场景

- **数据密集型应用**：仪表盘、实时监控、数据可视化
- **高频更新场景**：实时数据流、动画密集型应用
- **性能敏感场景**：移动端、低功耗设备
- **最小化包体积**：对包体积有严格要求的项目

### 决策流程图

```
开始
  │
  ├── 是否需要最佳兼容性？ ──是──→ VNode 模式
  │
  ├── 是否有高频数据更新？ ──是──→ Signal 模式
  │
  ├── 是否对性能有极致要求？ ──是──→ Signal 模式
  │
  ├── 是否需要最小化包体积？ ──是──→ Signal 模式
  │
  └── 其他情况 ──────────────────→ VNode 模式（默认）
```

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

## 迁移指南

### 从 VNode 模式迁移到 Signal 模式

1. **更新依赖**：

```bash
pnpm remove @lytjs/core
pnpm add @lytjs/core-signal
```

2. **更新导入**：

```typescript
// 之前
import { createApp, ref, h } from '@lytjs/core';

// 之后
import { createApp, ref } from '@lytjs/core-signal';
// 注意：Signal 模式不支持 h() 函数
```

3. **移除 VNode 相关代码**：

Signal 模式不支持以下 API：

- `h()` / `createVNode()` / `createElement()`
- `Fragment` / `Text` / `Comment`
- `cloneVNode()` / `mergeProps()`
- `withDirectives()` / `withMemo()`

4. **使用模板替代渲染函数**：

```typescript
// 之前（VNode 模式）
render() {
  return h('div', [h('span', this.message)]);
}

// 之后（Signal 模式）
template: '<div><span>{{ message }}</span></div>'
```

### 从 Signal 模式迁移到 VNode 模式

1. **更新依赖**：

```bash
pnpm remove @lytjs/core-signal
pnpm add @lytjs/core
```

2. **更新导入**：

```typescript
// 之前
import { createApp, signal, computedSignal } from '@lytjs/core-signal';

// 之后
import { createApp, ref, computed } from '@lytjs/core';
```

3. **替换 Signal API**：

```typescript
// 之前（Signal 模式）
const count = signal(0);
count.set(1);
console.log(count());

// 之后（VNode 模式）
const count = ref(0);
count.value = 1;
console.log(count.value);
```

## 下一步

- [响应式系统](./reactivity) - 深入理解响应式原理和 Signal API
- [API 参考：核心](../api/core) - 查看 VNode 模式的完整 API
- [API 参考：渲染器](../api/renderer) - 查看渲染器的详细文档
